import asyncio
from mavsdk import System


async def connect_and_control_drones():
    """Connect to multiple drones and command them simultaneously."""
    # Define MAVSDK server addresses and ports for each drone
    ports = [50051, 50052, 50053]
    drones = []

    # Connect to each drone
    for port in ports:
        drone = System(mavsdk_server_address="localhost", port=port)
        await drone.connect()
        print(f"Connecting to drone on port {port}...")
        drones.append(drone)

    # Wait for all drones to connect
    for i, drone in enumerate(drones):
        async for state in drone.core.connection_state():
            if state.is_connected:
                print(f"-- Drone {i+1} connected!")
                break

    # Command all drones simultaneously
    print("Waiting for drones to have a global position estimate...")
    await asyncio.gather(
        *(wait_for_global_position(drone, i+1) for i, drone in enumerate(drones))
    )

    print("-- Arming all drones")
    await asyncio.gather(*(drone.action.arm() for drone in drones))

    print("-- Taking off all drones")
    await asyncio.gather(*(drone.action.takeoff() for drone in drones))

    await asyncio.sleep(10)

    print("-- Landing all drones")
    await asyncio.gather(*(drone.action.land() for drone in drones))


async def wait_for_global_position(drone, drone_index):
    """Wait until the drone has a global position estimate."""
    async for health in drone.telemetry.health():
        if health.is_global_position_ok and health.is_home_position_ok:
            print(f"-- Drone {drone_index} global position estimate OK")
            break


if __name__ == "__main__":
    # Run the asyncio loop
    asyncio.run(connect_and_control_drones())
