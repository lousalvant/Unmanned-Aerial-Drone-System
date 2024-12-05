# Web-Based Ground Control Station

## Overview
The Web GCS is a browser-based Ground Control Station designed to manage drones using MAVSDK for drone communication. This project simplifies drone operations by providing an intuitive React-based frontend, a gRPC-to-REST bridge, and seamless integration with PX4 and AirSim simulators.

## Installation Guide
1. Install PX4
Clone the PX4 repository to set up the drone simulator:
```bash
git clone https://github.com/PX4/PX4-Autopilot.git --recursive
```

2. Install MAVSDK
Follow the MAVSDK Quickstart Guide to set up MAVSDK:
https://mavsdk.mavlink.io/v1.4/en/cpp/quickstart.html

Clone the MAVSDK repository:

```bash
git clone https://github.com/mavlink/MAVSDK
```

Build MAVSDK with the MAVSDK server:

```bash
cmake –DCMAKE_BUILD_TYPE=Debug –DBUILD_MAVSDK_SERVER=YES –Bbuild/default -H. 
cmake –build build/default -j8
```

3. Install nvm and npm
Install Node Version Manager (nvm) to manage Node.js versions:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```

Install Node.js and npm:

```bash
nvm install <node_version_from_ls-remote>
```

4. Install Dependencies for the gRPC Bridge
Set up a directory for the gRPC bridge and install required dependencies:

```bash
mkdir gRPC_bridge
cd gRPC_bridge
```

Clone the MAVSDK Proto files:

```bash
git clone https://github.com/mavlink/MAVSDK-Proto
```

Install necessary npm packages:

```bash
npm install @grpc/grpc-js cors express
```

5. Create REST Side of the gRPC Bridge
Create a src directory in the gRPC_bridge folder and implement the REST API:

- Create mavsdk-rest.js:
-- Initialize an Express app with CORS.
-- Add endpoints like /arm to map REST requests to gRPC commands.
  
Start the REST API server:

```bash
node ./src/mavsdk-rest.js
```

Test the API using curl or a browser:

```bash
curl http://localhost:8081/arm
```

6. Create the Frontend
Set up the React frontend for the Web GCS:

```bash
mkdir front_end_gcs
cd front_end_gcs
npx create-react-app <front_end_gcs_name>
cd <front_end_gcs_name>
npm start
```

7. Connect the Bridge
Update mavsdk-rest.js to connect the REST API to the MAVSDK server:

- Instantiate a drone object.
- Call drone commands like drone.Arm() within REST endpoints.
- 
Test the connection:

Start PX4/Simulator.
Start MAVSDK.
Start the gRPC bridge:
```bash
node src/mavsdk-rest.js 50000 8081
```
Send a GET request:
```bash
curl http://localhost:8081/arm
```
The drone should arm successfully.

## Running the Web GCS with AirSim (Single Drone)
Steps:

1. Start AirSim.
2. Open terminals and run the following commands:

Terminal 1: PX4

``` bash
cd path/to/PX4-Autopilot
./Tools/simulation/sitl_multiple_run.sh
```

Terminal 2: MAVSDK

```bash
cd path/to/MAVSDK
./build/default/src/mavsdk_server/src/mavsdk_server udp://:14550 -p 50000
```

Terminal 3: gRPC Bridge

```bash
cd path/to/gRPC_bridge
node src/mavsdk-rest.js 50000 8081
```

Terminal 4: React Frontend

```bash
cd path/to/gcs-front-end
npm start
```

### Testing
- Command Testing: Verify REST endpoints like /arm trigger gRPC calls.
- Telemetry Testing: Ensure real-time updates for GPS, battery, and other telemetry data in the frontend.
- Simulator Validation: Test end-to-end functionality using PX4 or AirSim.
### Notes
- Ensure MAVSDK server is configured with the correct UDP port.
- Adjust settings as needed for multi-drone operations or AirSim API compatibility.
