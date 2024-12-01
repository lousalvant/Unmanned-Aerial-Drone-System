import airsim
from airsim import YawMode
import math
import numpy as np
import time

from FindGains import find_gains
from ColAvoid import col_avoid

# Total number of UAVs
numUAV = 3

# Desired formation and adjacency matrix

# Triangular Formation
qs = np.array([
    [0, 4, 2],
    [0, 0, 3]
], dtype=float)
Adjm = np.array([
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0]
], dtype=float)

# # Linear Formation
# qs = np.array([
#     [0, 5, 0],
#     [0, -5, 0]
# ], dtype=float)
# Adjm = np.array([
#     [0, 1, 0],
#     [1, 0, 1],
#     [0, 1, 0]
# ], dtype=float)

# Desired waypoints for the formation

# # Square Path
# waypoints = [
#     np.array([0, 0, -20]),
#     np.array([10, 0, -20]),
#     np.array([10, 10, -20]),
#     np.array([0, 10, -20])
# ]

# # Linear Path
# waypoints = [
#     np.array([0, 0, -20]),
#     np.array([10, 0, -20])
# ]

# # Circular Path
# center = (10, 10, -20)
# radius = 10
# num_points = 36
# waypoints = []
# for i in range(num_points):
#     angle = 2 * np.pi * i / num_points
#     x = center[0] + radius * np.cos(angle)
#     y = center[1] + radius * np.sin(angle)
#     z = center[2]
#     waypoints.append(np.array([x, y, z]))

# Figure-Eight Path
center = (10, 10, -20)
radius = 10
num_points = 36
waypoints = []
for i in range(num_points):
    angle = 2 * np.pi * i / num_points
    x = center[0] + radius * np.sin(angle)
    y = center[1] + radius * np.sin(angle) * np.cos(angle)
    z = center[2]
    waypoints.append(np.array([x, y, z]))

# Initialize waypoint navigation variables
current_waypoint_idx = 0
proximity_threshold = 1.0  # meters

# Initial positions of the quads (Note: This must match the settings file)
pos0 = np.zeros((numUAV, 3))
for i in range(numUAV):
    pos0[i, 0] = 0
    pos0[i, 1] = -4 + 4.0 * i
    pos0[i, 2] = 0

# Find formation control gains
Am = find_gains(qs, Adjm)
print("Formation Control Gains (Am):\n", Am)

A = np.asarray(Am)
print("Gain matrix calculated.")

# Connect to the AirSim simulator
client = airsim.MultirotorClient()
client.confirmConnection()

for i in range(numUAV):
    name = "UAV" + str(i + 1)
    client.enableApiControl(True, name)
    client.armDisarm(True, name)
print("All UAVs have been initialized.")

# Hover
time.sleep(2)

tout = 3  # Timeout in seconds
spd = 2  # Speed

print("Taking off...")
for i in range(numUAV):
    name = "UAV" + str(i + 1)
    print('Hovering', name)
    client.hoverAsync(vehicle_name=name)
    client.moveToPositionAsync(0, 0, -1, spd, timeout_sec=tout, vehicle_name=name)
print("All UAVs are hovering.")

# Increase altitude
tout = 10.0  # Timeout in seconds
spd = 4.0  # Speed
alt = -20.0  # Altitude

time.sleep(0.5)

for i in range(numUAV):
    name = "UAV" + str(i + 1)
    print('Moving', name)
    client.moveToPositionAsync(0, 0, alt, spd, timeout_sec=tout, vehicle_name=name)
print("UAVs reached desired altitude")

# Formation control loop parameters
dcoll = 3  # Collision avoidance activation distance
rcoll = 1.4  # Collision avoidance circle radius
gain = 2.0 / 3  # Control gain
kp_centroid = 0.2 # Proportional gain for centroid movement
duration = 0.25  # Max duration for applying input
vmax = 0.8  # Saturation velocity
save = 0  # Set to 1 to save control input

def compute_formation_centroid(q, numUAV):
    """
    Compute the centroid of the formation.
    :param q: State vector containing positions of all UAVs.
    :param numUAV: Number of UAVs in the formation.
    :return: Centroid position as a NumPy array [x, y, z].
    """
    positions = q.reshape((numUAV, 3))
    centroid = np.mean(positions, axis=0)
    return centroid

def calculate_yaw_from_velocity(velocity_vector):
    """
    Calculate the yaw angle based on a velocity vector.
    
    :param velocity_vector: NumPy array [vx, vy]
    :return: Desired yaw angle in degrees
    """
    delta_x, delta_y = velocity_vector
    if np.linalg.norm(velocity_vector) == 0:
        return None  # No movement; no yaw change needed
    yaw_rad = math.atan2(delta_y, delta_x)
    yaw_deg = math.degrees(yaw_rad)
    yaw_deg = yaw_deg if yaw_deg >= 0 else yaw_deg + 360
    return yaw_deg

# Initial Pause time
time.sleep(0.5)

# Formation control loop
itr = 0
debounce_count = 0
debounce_threshold = 3  # Number of consecutive iterations within threshold

while True:

    itr += 1
    print(f"Iteration {itr}")

    # Get UAV positions using GPS data
    q = np.zeros(3 * numUAV)      # State vector (x, y, z) for all UAVs
    qxy = np.zeros(2 * numUAV)    # State vector (x, y) for all UAVs
    drone_positions = []         # List to store drone positions
    for i in range(numUAV):
        name = f"UAV{i+1}"
        state = client.getMultirotorState(vehicle_name=name)
        pos = state.kinematics_estimated.position
        qi = np.array([pos.x_val, pos.y_val, pos.z_val]) + pos0[i, :]
        q[3 * i:3 * i + 3] = qi
        qxy[2 * i:2 * i + 2] = qi[:2]
        drone_positions.append(qi[:3])

    # Compute the centroid of the formation
    centroid = compute_formation_centroid(q, numUAV)

    # Desired centroid position is the current waypoint
    desired_centroid = waypoints[current_waypoint_idx]

    # Compute error between desired centroid and current centroid
    error = desired_centroid - centroid  # 3D error

    # Compute control input for centroid movement (only x and y)
    centroid_control = kp_centroid * error[:2]  # [x_error, y_error]

    # Compute relative positions based on adjacency matrix
    T = np.zeros((numUAV * numUAV, 3))
    for i in range(numUAV):
        for j in range(numUAV):
            if Adjm[i, j] == 1:
                rel_pos = q[3 * j:3 * j + 3] - q[3 * i:3 * i + 3]
                T[i * numUAV + j, :] = rel_pos
            else:
                T[i * numUAV + j, :] = np.zeros(3)

    # Control computation based on relative positions
    dqxy = np.zeros(2 * numUAV)  # Preallocate control input vector
    for i in range(numUAV):
        # Extract relative positions in 2D (x, y) for UAV i
        qxyi = T[i * numUAV: (i + 1) * numUAV, 0:2].flatten()
        # Control input calculation
        dqxyi = A[2 * i: 2 * i + 2, :].dot(qxyi)
        dqxy[2 * i:2 * i + 2] = gain * dqxyi

    # Distribute the centroid control equally to all UAVs
    for i in range(numUAV):
        dqxy[2 * i:2 * i + 2] += centroid_control

    # Collision avoidance
    u, n, colIdx, Dc = col_avoid(dqxy.tolist(), qxy.tolist(), dcoll, rcoll)
    u = np.asarray(u).flatten()

    # Saturate velocity control command
    for i in range(numUAV):
        ui = u[2 * i:2 * i + 2]
        vel = np.linalg.norm(ui)
        if vel > vmax:
            u[2 * i:2 * i + 2] = (vmax / vel) * ui

    if save == 1:
        np.save("SavedData/u" + str(itr), dqxy)  # Save control input before collision avoidance
        np.save("SavedData/um" + str(itr), u)    # Save modified control input

    # Calculate common yaw based on centroid's movement direction
    desired_yaw = calculate_yaw_from_velocity(centroid_control)
    if desired_yaw is not None:
        yaw_mode = YawMode(is_rate=False, yaw_or_rate=desired_yaw)
    else:
        yaw_mode = YawMode(is_rate=False, yaw_or_rate=0)  # Maintain current yaw

    # Apply control command
    for i in range(numUAV):
        name = f"UAV{i+1}"
        client.moveByVelocityZAsync(
            u[2 * i],
            u[2 * i + 1],
            alt,
            duration,
            yaw_mode=yaw_mode,
            vehicle_name=name
        )

    # Compute the 2D error magnitude
    error_magnitude = np.linalg.norm(error[:2])

    print(f"Current Waypoint: {current_waypoint_idx + 1}/{len(waypoints)}")
    print(f"Centroid Position: {centroid}")
    print(f"Desired Centroid: {desired_centroid}")
    print(f"Error Magnitude: {error_magnitude:.2f} meters")
    print(f"Desired Yaw: {desired_yaw if desired_yaw is not None else 'N/A'} degrees")

    # Check if the formation has reached the current waypoint
    if error_magnitude < proximity_threshold:
        print(f"Reached Waypoint {current_waypoint_idx + 1}. Switching to next waypoint.")
        current_waypoint_idx = (current_waypoint_idx + 1) % len(waypoints)
        desired_centroid = waypoints[current_waypoint_idx]

    print("-" * 50)
