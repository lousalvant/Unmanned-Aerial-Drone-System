import asyncio
import math
from mavsdk import System
from mavsdk.offboard import OffboardError, VelocityNedYaw, PositionNedYaw
import numpy as np
import time

from FindGains import find_gains
from ColAvoid import col_avoid

# --------------------------------------------
# Configuration and Definitions
# --------------------------------------------

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

# --------------------------------------------
# Drone Initialization and Connection
# --------------------------------------------

async def init_drone(port):
    """
    Initialize and connect to a drone via MAVSDK on the specified port.
    
    :param port: The MAVSDK server port for the drone.
    :return: Connected drone System instance.
    """
    drone = System(mavsdk_server_address="localhost", port=port)
    await drone.connect()
    async for state in drone.core.connection_state():
        if state.is_connected:
            print(f"Drone on port {port} connected")
            break
    # Set telemetry update rates for position and velocity
    await drone.telemetry.set_rate_position_velocity_ned(10)
    return drone

async def setup_drones():
    """
    Set up and connect to all drones based on the number of UAVs.
    
    :return: List of connected drone System instances.
    """
    drones = []
    ports = [50051 + i for i in range(numUAV)]  # Assign unique ports for each drone
    for port in ports:
        drone = await init_drone(port)
        drones.append(drone)
    return drones

# --------------------------------------------
# Arm and Takeoff Procedures
# --------------------------------------------

async def arm_and_takeoff(drone, altitude):
    """
    Arm the drone and command it to take off to the specified altitude.
    
    :param drone: Connected drone System instance.
    :param altitude: Desired altitude in meters (negative for down).
    """
    print("Arming...")
    await drone.action.arm()
    print("Taking off...")
    await drone.action.takeoff()
    await asyncio.sleep(5)  # Allow the drone to stabilize after takeoff
    print(f"Ascending to altitude {altitude}m")
    
    # Start offboard mode and set initial position
    await start_offboard_mode(drone)
    try:
        # Position setpoint: x=0, y=0, z=altitude (NED coordinates)
        await drone.offboard.set_position_ned(PositionNedYaw(0.0, 0.0, altitude, 0.0))
    except OffboardError as e:
        print(f"Setting initial position failed: {e._result.result}")
        await drone.offboard.stop()
        await drone.action.disarm()
        return
    
    # Wait until the drone reaches the desired altitude with smoothing
    smoothed_altitude = 0.0
    alpha = 0.9  # Smoothing factor
    
    async for position in drone.telemetry.position_velocity_ned():
        current_altitude = position.position.down_m
        smoothed_altitude = alpha * smoothed_altitude + (1 - alpha) * current_altitude
        print(f"Smoothed altitude: {smoothed_altitude:.2f}m")
        if abs(smoothed_altitude - altitude) < 0.5:
            print("Reached target altitude")
            break
        await asyncio.sleep(0.1)
    await asyncio.sleep(2)  # Allow for stabilization

async def start_offboard_mode(drone):
    """
    Initiate offboard mode by sending initial setpoints and starting offboard.
    
    :param drone: Connected drone System instance.
    """
    print("Sending initial setpoints...")
    for _ in range(40):  # Send enough setpoints to ensure PX4 accepts offboard mode
        await drone.offboard.set_velocity_ned(VelocityNedYaw(0.0, 0.0, 0.0, 0.0))
        await asyncio.sleep(0.025)  # 25ms interval between setpoints
    try:
        await drone.offboard.start()
        print("Offboard mode started")
    except OffboardError as e:
        print(f"Offboard start failed: {e._result.result}")
        await drone.action.disarm()
        raise

# --------------------------------------------
# Formation Control Loop
# --------------------------------------------

async def formation_control(drones):
    """
    Main loop for controlling the drone formation and navigating through waypoints.
    
    :param drones: List of connected drone System instances.
    """

    global current_waypoint_idx

    # Formation control parameters
    dcoll = 3.0  # Collision avoidance activation distance in meters
    rcoll = 1.4  # Collision avoidance circle radius in meters
    gain = 2.0 / 3  # Control gain for formation
    duration = 0.25  # Control loop duration in seconds
    vmax = 0.8  # Saturation velocity in m/s
    velocity_damping = 0.9  # Damping factor to reduce oscillations
    error_threshold = 0.01  # Dead zone for small errors
    
    itr = 0  # Iteration counter
    debounce_count = 0
    debounce_threshold = 3  # Number of consecutive iterations within threshold
    previous_positions = np.zeros((numUAV, 3))  # For smoothing positions
    
    while True:
        itr += 1
        print(f"--- Iteration: {itr} ---")
    
        # Get UAV positions
        q = np.zeros(3 * numUAV)      # State vector (x, y, z) for all UAVs
        qxy = np.zeros(2 * numUAV)    # State vector (x, y) for all UAVs
        tasks = [get_position(drone) for drone in drones]
        positions = await asyncio.gather(*tasks)
    
        for i, pos in enumerate(positions):
            # Smooth positions to mitigate noise
            smooth_pos = 0.95 * previous_positions[i] + 0.05 * np.array(pos)
            previous_positions[i] = smooth_pos
            qi = smooth_pos + pos0[i, :]
            q[3 * i:3 * i + 3] = qi
            qxy[2 * i:2 * i + 2] = qi[:2]
    
        # Compute the centroid of the formation
        centroid = await compute_formation_centroid(q, numUAV)
    
        # Desired centroid position is the current waypoint
        desired_centroid = waypoints[current_waypoint_idx]
    
        # Compute error between desired centroid and current centroid
        error = desired_centroid - centroid  # 3D error
        error_magnitude = np.linalg.norm(error[:2])  # 2D error magnitude
    
        # Compute control input for centroid movement (only x and y)
        kp_centroid = 0.2  # Proportional gain for centroid movement
        centroid_control = kp_centroid * error[:2]  # [vx_error, vy_error]
    
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
        dqxy = np.zeros(2 * numUAV)
        for i in range(numUAV):
            # Extract relative positions in 2D (x, y) for UAV i
            qxyi = T[i * numUAV: (i + 1) * numUAV, 0:2].flatten()
            # Control input calculation using formation gains
            dqxyi = A[2 * i: 2 * i + 2, :].dot(qxyi)
            dqxy[2 * i:2 * i + 2] = gain * dqxyi
    
        # Integrate centroid movement with formation control
        # Distribute the centroid control equally to all UAVs
        for i in range(numUAV):
            dqxy[2 * i:2 * i + 2] += centroid_control
    
        # Collision avoidance
        u, n, colIdx, Dc = col_avoid(dqxy.tolist(), qxy.tolist(), dcoll, rcoll)
        u = np.asarray(u).flatten()
    
        # Gradual velocity scaling to ramp up speed
        velocity_scaling_factor = min(1.0, itr / 125)
        u = velocity_scaling_factor * u
    
        # Predict future positions and enforce separation
        qxy_reshaped = qxy.reshape(numUAV, 2)
        future_positions = qxy_reshaped + duration * u.reshape(numUAV, 2)
        for i in range(numUAV):
            for j in range(i + 1, numUAV):
                future_distance = np.linalg.norm(future_positions[i] - future_positions[j])
                if future_distance < rcoll * 2:
                    u[2 * i:2 * i + 2] = 0.0
                    u[2 * j:2 * j + 2] = 0.0
    
        # Apply damping to reduce oscillations
        u = velocity_damping * u
    
        # Saturate velocity and apply dead zone
        for i in range(numUAV):
            ui = u[2 * i:2 * i + 2]
            distance = np.linalg.norm(ui)
            if distance > 0:
                u[2 * i:2 * i + 2] *= min(1.0, distance / vmax)
            if distance < error_threshold:
                u[2 * i:2 * i + 2] = 0.0
    
        # Calculate desired yaw based on centroid's movement direction
        desired_yaw = await calculate_yaw_from_velocity(centroid_control)
        yaw = desired_yaw if desired_yaw is not None else 0.0
    
        # Apply control command with yaw
        tasks = [send_velocity(drone, u[2 * i], u[2 * i + 1], 0.0, yaw) for i, drone in enumerate(drones)]
        await asyncio.gather(*tasks)
    
        # Logging
        print(f"Current Waypoint: {current_waypoint_idx + 1}/{len(waypoints)}")
        print(f"Centroid Position: {centroid}")
        print(f"Desired Centroid: {desired_centroid}")
        print(f"Error Magnitude: {error_magnitude:.2f} meters")
        print(f"Desired Yaw: {desired_yaw if desired_yaw is not None else 'N/A'} degrees")
    
        # Check if the formation has reached the current waypoint with debounce
        if error_magnitude < proximity_threshold:
            debounce_count += 1
            if debounce_count >= debounce_threshold:
                print(f"Reached Waypoint {current_waypoint_idx + 1}. Switching to next waypoint.")
                current_waypoint_idx = (current_waypoint_idx + 1) % len(waypoints)
                debounce_count = 0
        else:
            debounce_count = 0  # Reset counter if outside threshold
    
        print("-" * 50)
        await asyncio.sleep(duration)  # Control loop duration

# --------------------------------------------
# Helper Functions
# --------------------------------------------

async def get_position(drone):
    """
    Retrieve the current position of the drone.
    
    :param drone: Connected drone System instance.
    :return: Tuple containing (north_m, east_m, down_m).
    """
    async for position in drone.telemetry.position_velocity_ned():
        north_m = position.position.north_m
        east_m = position.position.east_m
        down_m = position.position.down_m
        return (north_m, east_m, down_m)

async def send_velocity(drone, vx, vy, vz, yaw):
    """
    Send velocity commands to the drone in NED coordinates with yaw control.
    
    :param drone: Connected drone System instance.
    :param vx: Velocity in North direction (m/s).
    :param vy: Velocity in East direction (m/s).
    :param vz: Velocity in Down direction (m/s).
    :param yaw: Desired yaw angle in degrees.
    """
    try:
        # Set the desired velocity in NED coordinates with yaw
        await drone.offboard.set_velocity_ned(VelocityNedYaw(vx, vy, vz, yaw))
    except OffboardError as e:
        print(f"Offboard error: {e._result.result}")
        await drone.offboard.stop()
        await drone.action.disarm()
        return
    
async def compute_formation_centroid(q, numUAV):
    """
    Compute the centroid of the formation.
    :param q: State vector containing positions of all UAVs.
    :param numUAV: Number of UAVs in the formation.
    :return: Centroid position as a NumPy array [x, y, z].
    """
    positions = q.reshape((numUAV, 3))
    centroid = np.mean(positions, axis=0)
    return centroid

async def calculate_yaw_from_velocity(velocity_vector):
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

# --------------------------------------------
# Main Function
# --------------------------------------------

async def main():
    """
    Main function to set up drones, arm, takeoff, and start formation control.
    """
    # Initialize drones
    drones = await setup_drones()
    
    # Arm and takeoff all drones to the desired altitude
    tasks = [arm_and_takeoff(drone, -20.0) for drone in drones]
    await asyncio.gather(*tasks)
    
    # Start formation control loop
    await formation_control(drones)

# --------------------------------------------
# Script Execution
# --------------------------------------------

if __name__ == "__main__":
    asyncio.run(main())