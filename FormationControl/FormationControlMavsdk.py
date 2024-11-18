import asyncio
import numpy as np
from mavsdk import System
from mavsdk.offboard import VelocityNedYaw
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

# Formation control gains
A = find_gains(qs, Adjm)
print("Gain matrix calculated:", A)

# Collision avoidance parameters
dcoll = 1.5  # Collision avoidance activation distance
rcoll = 0.7  # Collision avoidance circle radius
gain = 1.0 / 3  # Control gain
alt = -20.0  # Altitude
duration = 0.5  # Max duration for applying input
vmax = 0.4  # Saturation velocity


async def connect_drones():
    """Connect to all drones."""
    drones = []
    ports = [50051, 50052, 50053]  # Replace with your MAVSDK server ports
    for port in ports:
        drone = System(mavsdk_server_address="localhost", port=port)
        await drone.connect()
        drones.append(drone)
    print("All drones connected!")
    return drones


async def arm_and_takeoff(drones):
    """Arm and take off all drones."""
    for drone in drones:
        await drone.action.arm()
        print("-- Drone armed")
        await drone.action.takeoff()
        print("-- Drone taking off")
    await asyncio.sleep(10)  # Wait for all drones to stabilize at altitude


async def calculate_positions(drones):
    """Get the current positions of all drones."""
    positions = []
    for drone in drones:
        async for position in drone.telemetry.position():
            positions.append((position.latitude_deg, position.longitude_deg, position.absolute_altitude_m))
            break
    return np.array(positions)


async def formation_control(drones):
    """Formation control with collision avoidance."""
    itr = 0

    # Initialize offboard control for each drone
    for drone in drones:
        await drone.offboard.set_velocity_ned(VelocityNedYaw(0, 0, 0, 0))
        await drone.offboard.start()
    print("Offboard control started for all drones.")

    while True:
        itr += 1
        print(f"Iteration: {itr}")

        # Get current drone positions
        positions = await calculate_positions(drones)

        # Compute formation control velocities
        qxy = np.array([(pos[0], pos[1]) for pos in positions]).flatten()
        dqxy = np.zeros(2 * numUAV)

        for i in range(numUAV):
            qxyi = qxy[2 * i:2 * i + 2]
            dqxyi = A[2 * i:2 * i + 2, :].dot(qxy)
            dqxy[2 * i:2 * i + 2] = gain * dqxyi

        # Apply collision avoidance
        u, _, _, _ = col_avoid(dqxy.tolist(), qxy.tolist(), dcoll, rcoll)
        u = np.asarray(u).flatten()

        # Saturate velocities
        for i in range(numUAV):
            ui = u[2 * i:2 * i + 2]
            vel = np.linalg.norm(ui)
            if vel > vmax:
                u[2 * i:2 * i + 2] = (vmax / vel) * ui

        # Send velocity commands to drones
        await asyncio.gather(
            *(drone.offboard.set_velocity_ned(VelocityNedYaw(u[2 * i], u[2 * i + 1], alt, 0)) for i, drone in enumerate(drones))
        )
        await asyncio.sleep(1)


async def main():
    drones = await connect_drones()
    await arm_and_takeoff(drones)
    await formation_control(drones)


if __name__ == "__main__":
    asyncio.run(main())
