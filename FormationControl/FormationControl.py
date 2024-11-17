# Note: The simulation environment in UE4 must be running before executing this code.

import airsim
import numpy as np
import time

from FindGains import find_gains
from ColAvoid import col_avoid

# Total number of UAVs
numUAV = 3

# Desired formation (equilateral triangle)
qs = np.array([
    [0, 4, 2],
    [0, 0, 3]
], dtype=float)

# Adjacency matrix
Adjm = np.array([
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0]
], dtype=float)

# Initial positions of the quads (Note: This must match the settings file)
pos0 = np.zeros((numUAV, 3))
for i in range(numUAV):
    pos0[i, 0] = 0
    pos0[i, 1] = -4 + 4.0 * i
    pos0[i, 2] = 0

# Find formation control gains
Am = find_gains(qs, Adjm)
print(Am)

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

# Formation control loop
dcoll = 1.5  # Collision avoidance activation distance
rcoll = 0.7  # Collision avoidance circle radius
gain = 1.0 / 3  # Control gain
alt = -20.0  # UAV altitude
duration = 0.5  # Max duration for applying input
vmax = 0.4  # Saturation velocity
save = 0  # Set to 1 to save control input

# Initial Pause time
time.sleep(0.5)

# Formation control
itr = 0
while True:

    itr += 1
    print("itr =", itr)

    # Get UAV positions using GPS data
    q = np.zeros(3 * numUAV)      # State vector (x, y, z) for all UAVs
    qxy = np.zeros(2 * numUAV)    # State vector (x, y) for all UAVs
    for i in range(numUAV):
        name = f"UAV{i+1}"
        state = client.getMultirotorState(vehicle_name=name)
        pos = state.kinematics_estimated.position
        qi = np.array([pos.x_val, pos.y_val, pos.z_val]) + pos0[i, :]
        q[3 * i:3 * i + 3] = qi
        qxy[2 * i:2 * i + 2] = qi[:2]

    # Compute relative positions
    T = np.zeros((numUAV * numUAV, 3))
    for i in range(numUAV):
        for j in range(numUAV):
            if Adjm[i, j] == 1:
                rel_pos = q[3 * j:3 * j + 3] - q[3 * i:3 * i + 3]
                T[i * numUAV + j, :] = rel_pos
            else:
                T[i * numUAV + j, :] = np.zeros(3)

    # Control computation
    dqxy = np.zeros(2 * numUAV)  # Preallocate control input vector
    for i in range(numUAV):
        # Extract relative positions in 2D (x, y) for UAV i
        qxyi = T[i * numUAV: (i + 1) * numUAV, 0:2].flatten()
        # Control input calculation
        dqxyi = A[2 * i: 2 * i + 2, :].dot(qxyi)
        dqxy[2 * i:2 * i + 2] = gain * dqxyi

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

    # Apply control command
    for i in range(numUAV):
        name = f"UAV{i+1}"
        client.moveByVelocityZAsync(u[2 * i], u[2 * i + 1], alt, duration, vehicle_name=name)

    print()