import asyncio
from mavsdk import System


async def connect_drone(mavsdk_server_address: str, port: int):
    """Connect to a single drone on the specified MAVSDK server and port."""
    drone = System(mavsdk_server_address=mavsdk_server_address, port=port)
    await drone.connect()
    print(f"Connecting to drone on {mavsdk_server_address}:{port}...")

    # Wait for the drone to connect
    async for state in drone.core.connection_state():
        if state.is_connected:
            print(f"-- Connected to drone on port {port}!")
            return drone

    print(f"-- Failed to connect to drone on port {port}.")
    return None


async def control_drone(drone: System, drone_name: str):
    """Control a single drone (arm, take off, land)."""
    print(f"Waiting for {drone_name} to have a global position estimate...")
    async for health in drone.telemetry.health():
        if health.is_global_position_ok and health.is_home_position_ok:
            print(f"-- {drone_name} global position estimate OK")
            break

    print(f"-- Arming {drone_name}")
    await drone.action.arm()

    print(f"-- {drone_name} Taking off")
    await drone.action.takeoff()

    await asyncio.sleep(10)

    print(f"-- {drone_name} Landing")
    await drone.action.land()


async def run():
    """Main function to connect and control multiple drones."""
    # Connect to three drones on different MAVSDK servers and ports
    ports = [50051, 50052, 50053]
    drones = []

    for port in ports:
        drone = await connect_drone("localhost", port)
        if drone:
            drones.append((drone, f"Drone on port {port}"))

    if not drones:
        print("No drones connected. Exiting.")
        return

    # Control each drone sequentially (you can also modify this to run concurrently)
    for drone, drone_name in drones:
        await control_drone(drone, drone_name)


if __name__ == "__main__":
    # Run the asyncio loop
    asyncio.run(run())
