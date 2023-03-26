# Getting Started with WebGCS

sudo apt install npm

git submodule update --init --recursive

Download and install the latest version of MAVSDK from [here](https://mavsdk.mavlink.io/main/en/cpp/guide/installation.html).


cd gRPCBridge
npm install express
cd ..
npm install react-scripts

# To run the backend
node gRPCBridge/src/mavsdk-rest.js

The backend will try to connect to a mavsdk_server on port 50000. Example command to start mavsdk server and connect to gazebo installation: 

./mavsdk_server_manylinux2010-x64 udp://:14550 -p 50000


# To run the frontend
cd gcs-front-end
npm start
