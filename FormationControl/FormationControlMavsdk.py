import asyncio
from mavsdk import System
from mavsdk.offboard import OffboardError, VelocityNedYaw, PositionNedYaw
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

async def init_drone(port):
    drone = System(mavsdk_server_address="localhost", port=port)
    await drone.connect()
    async for state in drone.core.connection_state():
        if state.is_connected:
            print(f"Drone on port {port} connected")
            break
    return drone

async def setup_drones():
    drones = []
    ports = [50051 + i for i in range(numUAV)]  # Assign unique ports for each drone
    for port in ports:
        drone = await init_drone(port)
        drones.append(drone)
    return drones

async def arm_and_takeoff(drone, altitude):
    print("Arming...")
    await drone.action.arm()
    print("Taking off...")
    await drone.action.takeoff()
    await asyncio.sleep(5)
    print(f"Ascending to altitude {altitude}m")
    # Start offboard mode
    await start_offboard_mode(drone)
    # Command drone to move to desired altitude
    await drone.offboard.set_position_ned(PositionNedYaw(0.0, 0.0, altitude, 0.0))
    # Wait until drone reaches altitude
    while True:
        async for position in drone.telemetry.position_velocity_ned():
            current_altitude = position.position.down_m
            if abs(current_altitude - altitude) < 0.5:
                print("Reached target altitude")
                break
            await asyncio.sleep(0.5)
        break
    await asyncio.sleep(2)

async def start_offboard_mode(drone):
    # Set initial setpoints before starting offboard mode
    print("Sending initial setpoints...")
    for _ in range(10):
        await drone.offboard.set_velocity_ned(VelocityNedYaw(0.0, 0.0, 0.0, 0.0))
        await asyncio.sleep(0.1)
    try:
        await drone.offboard.start()
        print("Offboard mode started")
    except OffboardError as e:
        print(f"Offboard start failed: {e._result.result}")
        await drone.action.disarm()

async def formation_control(drones):
    # Formation control parameters
    dcoll = 1.5  # Collision avoidance activation distance
    rcoll = 0.7  # Collision avoidance circle radius
    gain = 1.0 / 3  # Control gain
    alt = -20.0  # UAV altitude (negative in NED)
    duration = 0.5  # Max duration for applying input
    vmax = 0.4  # Saturation velocity
    save = 0  # Set to 1 to save control input

    itr = 0

    # Offboard mode is already started in arm_and_takeoff()

    while True:
        itr += 1
        print(f"Iteration: {itr}")

        # Get UAV positions
        q = np.zeros(3 * numUAV)      # State vector (x, y, z) for all UAVs
        qxy = np.zeros(2 * numUAV)    # State vector (x, y) for all UAVs

        # Fetch positions asynchronously
        tasks = [get_position(drone, idx) for idx, drone in enumerate(drones)]
        positions = await asyncio.gather(*tasks)

        for i, pos in enumerate(positions):
            # pos is (north_m, east_m, down_m)
            qi = np.array([pos[0], pos[1], pos[2]]) + pos0[i, :]
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
        tasks = []
        for i, drone in enumerate(drones):
            ui = u[2 * i:2 * i + 2]
            tasks.append(send_velocity(drone, ui[0], ui[1], 0.0))  # Down velocity is zero

        await asyncio.gather(*tasks)
        await asyncio.sleep(duration)

async def get_position(drone, idx):
    async for position in drone.telemetry.position_velocity_ned():
        north_m = position.position.north_m
        east_m = position.position.east_m
        down_m = position.position.down_m
        return (north_m, east_m, down_m)

async def send_velocity(drone, vx, vy, vz):
    try:
        # Set the desired velocity in NED coordinates
        await drone.offboard.set_velocity_ned(VelocityNedYaw(vx, vy, vz, 0.0))
    except OffboardError as e:
        print(f"Offboard error: {e._result.result}")
        await drone.offboard.stop()
        return

async def main():
    # Initialize drones
    drones = await setup_drones()

    # Arm and takeoff all drones
    tasks = [arm_and_takeoff(drone, -20.0) for drone in drones]
    await asyncio.gather(*tasks)

    # Start formation control
    await formation_control(drones)

if __name__ == "__main__":
    asyncio.run(main())