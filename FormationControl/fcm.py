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

# Initial positions of the quads
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
    await start_offboard_mode(drone)
    await drone.offboard.set_position_ned(PositionNedYaw(0.0, 0.0, altitude, 0.0))

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
    for _ in range(40):
        await drone.offboard.set_velocity_ned(VelocityNedYaw(0.0, 0.0, 0.0, 0.0))
        await asyncio.sleep(0.025)
    try:
        await drone.offboard.start()
        print("Offboard mode started")
    except OffboardError as e:
        print(f"Offboard start failed: {e._result.result}")
        await drone.action.disarm()
        raise

async def formation_control_with_survey(drones, waypoints):
    dcoll = 3.0  # Collision avoidance activation distance
    rcoll = 1.0  # Collision avoidance circle radius
    gain = 1.0 / 16  # Control gain
    duration = 0.2  # Max duration for applying input
    vmax = 0.6  # Saturation velocity
    velocity_damping = 0.9  # Dampen velocities to reduce oscillations
    error_threshold = 0.01  # Dead zone for small errors

    for waypoint in waypoints:
        print(f"Navigating to waypoint: {waypoint}")
        target_position = np.array([waypoint["north"], waypoint["east"], waypoint["altitude"]])
        
        while True:
            q = np.zeros(3 * numUAV)  # State vector (x, y, z) for all UAVs
            qxy = np.zeros(2 * numUAV)  # State vector (x, y) for all UAVs
            tasks = [get_position(drone, idx) for idx, drone in enumerate(drones)]
            positions = await asyncio.gather(*tasks)

            for i, pos in enumerate(positions):
                qi = np.array(pos) + pos0[i, :]
                q[3 * i:3 * i + 3] = qi
                qxy[2 * i:2 * i + 2] = qi[:2]

            T = np.zeros((numUAV * numUAV, 3))
            for i in range(numUAV):
                for j in range(numUAV):
                    if Adjm[i, j] == 1:
                        rel_pos = q[3 * j:3 * j + 3] - q[3 * i:3 * i + 3]
                        T[i * numUAV + j, :] = rel_pos

            dqxy = np.zeros(2 * numUAV)
            for i in range(numUAV):
                qxyi = T[i * numUAV: (i + 1) * numUAV, 0:2].flatten()
                dqxyi = A[2 * i: 2 * i + 2, :].dot(qxyi)
                dqxy[2 * i:2 * i + 2] = gain * dqxyi

            u, _, _, _ = col_avoid(dqxy.tolist(), qxy.tolist(), dcoll, rcoll)
            u = np.asarray(u).flatten()
            u = velocity_damping * u

            for i in range(numUAV):
                ui = u[2 * i:2 * i + 2]
                if np.linalg.norm(ui) > vmax:
                    u[2 * i:2 * i + 2] = vmax * (ui / np.linalg.norm(ui))
                if np.linalg.norm(ui) < error_threshold:
                    u[2 * i:2 * i + 2] = 0.0

            tasks = [send_velocity(drones[i], u[2 * i], u[2 * i + 1], 0.0) for i in range(numUAV)]
            await asyncio.gather(*tasks)
            await asyncio.sleep(duration)

            if np.allclose([pos[:2] for pos in positions], target_position[:2], atol=error_threshold):
                print("Reached waypoint.")
                break

async def get_position(drone, idx):
    async for position in drone.telemetry.position_velocity_ned():
        north_m = position.position.north_m
        east_m = position.position.east_m
        down_m = position.position.down_m
        return (north_m, east_m, down_m)

async def send_velocity(drone, vx, vy, vz):
    try:
        await drone.offboard.set_velocity_ned(VelocityNedYaw(vx, vy, vz, 0.0))
    except OffboardError as e:
        print(f"Offboard error: {e._result.result}")
        await drone.offboard.stop()
        return

async def main():
    drones = await setup_drones()
    tasks = [arm_and_takeoff(drone, -20.0) for drone in drones]
    await asyncio.gather(*tasks)

    waypoints = [
        {"north": 0, "east": 0, "altitude": -20.0},
        {"north": 50, "east": 0, "altitude": -20.0},
        {"north": 50, "east": 50, "altitude": -20.0},
        {"north": 0, "east": 50, "altitude": -20.0},
        {"north": 0, "east": 0, "altitude": -20.0}
    ]

    await formation_control_with_survey(drones, waypoints)

if __name__ == "__main__":
    asyncio.run(main())
