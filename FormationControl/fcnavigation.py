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
    # Increase telemetry update rates
    await drone.telemetry.set_rate_position_velocity_ned(10)
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
    await asyncio.sleep(5)  # Allow the drone to stabilize after takeoff
    print(f"Ascending to altitude {altitude}m")

    # Command drone to move to desired altitude
    await start_offboard_mode(drone)
    await drone.offboard.set_position_ned(PositionNedYaw(0.0, 0.0, altitude, 0.0))

    # Wait until the drone reaches altitude

    # Altitude smoothing to help mitigate noise or fluctuations in telemetry data
    smoothed_altitude = 0.0
    alpha = 0.9  # Smoothing factor

    async for position in drone.telemetry.position_velocity_ned():
        current_altitude = position.position.down_m
        smoothed_altitude = alpha * smoothed_altitude + (1 - alpha) * current_altitude
        print(f"Smoothed altitude: {smoothed_altitude}")
        if abs(smoothed_altitude - altitude) < 0.5:
            print("Reached target altitude")
            break
        await asyncio.sleep(0.1)
    await asyncio.sleep(2)

async def start_offboard_mode(drone):
    print("Sending initial setpoints...")
    for _ in range(40):  # Increase iterations to ensure PX4 accepts offboard mode
        await drone.offboard.set_velocity_ned(VelocityNedYaw(0.0, 0.0, 0.0, 0.0))
        await asyncio.sleep(0.025)  # Increase frequency of sending commands
    try:
        await drone.offboard.start()
        print("Offboard mode started")
    except OffboardError as e:
        print(f"Offboard start failed: {e._result.result}")
        await drone.action.disarm()
        raise

async def formation_control(drones):
    # Formation control parameters
    dcoll = 3.0  # Collision avoidance activation distance
    rcoll = 1.0  # Collision avoidance circle radius
    gain = 1.0 / 16  # Control gain
    duration = 0.2  # Max duration for applying input
    vmax = 0.6  # Saturation velocity
    velocity_damping = 0.9  # Reduce oscillation by dampening velocity
    error_threshold = 0.01  # Dead zone for small errors

    itr = 0
    previous_positions = np.zeros((numUAV, 3))

    while True:
        itr += 1
        print(f"Iteration: {itr}")

        # Get UAV positions
        q = np.zeros(3 * numUAV)      # State vector (x, y, z) for all UAVs
        qxy = np.zeros(2 * numUAV)    # State vector (x, y) for all UAVs
        tasks = [get_position(drone, idx) for idx, drone in enumerate(drones)]
        positions = await asyncio.gather(*tasks)

        for i, pos in enumerate(positions):
            smooth_pos = 0.95 * previous_positions[i] + 0.05 * np.array(pos)
            previous_positions[i] = smooth_pos
            qi = smooth_pos + pos0[i, :]
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
        dqxy = np.zeros(2 * numUAV)
        for i in range(numUAV):
            qxyi = T[i * numUAV: (i + 1) * numUAV, 0:2].flatten()
            dqxyi = A[2 * i: 2 * i + 2, :].dot(qxyi)
            dqxy[2 * i:2 * i + 2] = gain * dqxyi

        # Collision avoidance
        u, n, colIdx, Dc = col_avoid(dqxy.tolist(), qxy.tolist(), dcoll, rcoll)
        u = np.asarray(u).flatten()

        # Gradual velocity scaling
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

        # Apply damping
        u = velocity_damping * u

        # Saturate velocity and apply dead zone
        for i in range(numUAV):
            ui = u[2 * i:2 * i + 2]
            distance = np.linalg.norm(ui)
            if distance > 0:
                u[2 * i:2 * i + 2] *= min(1.0, distance / vmax)
            if distance < error_threshold:
                u[2 * i:2 * i + 2] = 0.0

        # Apply control command
        tasks = [send_velocity(drone, u[2 * i], u[2 * i + 1], 0.0) for i, drone in enumerate(drones)]
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

async def navigate_to_waypoints(drones, waypoints):
    """Navigate drones to a sequence of waypoints while maintaining formation."""
    for waypoint in waypoints:
        target_x, target_y = waypoint
        print(f"Navigating to waypoint: {target_x}, {target_y}")

        tasks = []
        for i, drone in enumerate(drones):
            # Calculate target position for each drone in the formation
            formation_offset = pos0[i, :2]  # Each drone's offset in formation
            drone_target_x = target_x + formation_offset[0]
            drone_target_y = target_y + formation_offset[1]

            # Command drone to target position
            tasks.append(
                drone.offboard.set_position_ned(
                    PositionNedYaw(drone_target_x, drone_target_y, -20.0, 0.0)
                )
            )

        # Execute the commands
        await asyncio.gather(*tasks)

        # Wait for the drones to stabilize at the waypoint
        await asyncio.sleep(10)

        print(f"Drones reached waypoint ({target_x}, {target_y})")

async def main():
    # Initialize drones
    drones = await setup_drones()

    # Arm and takeoff all drones
    tasks = [arm_and_takeoff(drone, -20.0) for drone in drones]
    await asyncio.gather(*tasks)

    # Start formation control
    print("Forming the initial triangle formation...")
    formation_task = asyncio.create_task(formation_control(drones))

    # Allow the formation to stabilize
    await asyncio.sleep(10)  # Adjust as needed for stabilization time

    # Define waypoints for a square survey pattern
    side_length = 50.0  # Length of each side of the square
    waypoints = [
        (0, 0),  # Starting position
        (side_length, 0),  # Move east
        (side_length, side_length),  # Move north-east
        (0, side_length),  # Move north
        (0, 0)  # Return to starting position
    ]

    # Navigate through the waypoints while maintaining formation
    print("Navigating to waypoints while maintaining formation...")
    await navigate_to_waypoints(drones, waypoints)

    # Continue formation control indefinitely after waypoint navigation
    print("Resuming formation control indefinitely...")
    await formation_task

if __name__ == "__main__":
    asyncio.run(main())
