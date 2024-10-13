var cors = require('cors');
var express = require('express');
var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const UNSAFE_FRONT_END_URL = "*"; // Allow all origins
// const UNSAFE_FRONT_END_URL= "http://localhost:3000";

app.use(cors({
    origin: UNSAFE_FRONT_END_URL,
    methods: ["GET", "POST"]
}));

const http = require('http');
const server = http.createServer(app);

var MAVSDKDrone = require('./mavsdk-grpc.js');

// Get the gRPC port from the command line arguments or default to 50000
const grpcPort = process.argv[2] || 50000;
var drone = new MAVSDKDrone(`127.0.0.1:${grpcPort}`);

const port = process.argv[3] || 8081;

let logs = [];

// Function to add logs
const addLog = (message) => {
    const timestamp = new Date().toISOString();
    logs.push(`[${timestamp}] ${message}`);
};

// Limit the log size to avoid memory overflow (optional)
const MAX_LOGS = 1000;
const trimLogs = () => {
    if (logs.length > MAX_LOGS) {
        logs.shift();
    }
};

app.get('/logs', function (req, res) {
    res.json(logs); // Send the logs as JSON
});

app.get('/arm', function (req, res) {
    const logMessage = `Arming drone connected to gRPC on port ${grpcPort}`;
    console.log(logMessage);
    addLog(logMessage);
    drone.Arm();
    res.sendStatus(200);
});

app.get('/disarm', function (req, res) {
    const logMessage = `Disarming drone connected to gRPC on port ${grpcPort}`;
    console.log(logMessage);
    addLog(logMessage);
    drone.Disarm();
    res.sendStatus(200);
});

app.get('/takeoff', function (req, res) {
    const logMessage = `Taking off drone connected to gRPC on port ${grpcPort}`;
    console.log(logMessage);
    addLog(logMessage);
    drone.Takeoff();
    res.sendStatus(200);
});

app.get('/land', function (req, res) {
    const logMessage = `Landing drone connected to gRPC on port ${grpcPort}`;
    console.log(logMessage);
    addLog(logMessage);
    drone.Land();
    res.sendStatus(200);
});

app.get('/gps', function (req, res) {
    if (drone.position && drone.position.latitude_deg && drone.position.longitude_deg) {
        res.json(drone.position);
    } else {
        res.status(404).send("GPS data not available");
    }
});

app.get('/goto', function (req, res) {
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const altitude = parseFloat(req.query.altitude);
    const yaw = parseFloat(req.query.yaw);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(altitude) || isNaN(yaw)) {
        return res.status(400).send("Invalid parameters");
    }

    const logMessage = `Executing GoToLocation with latitude: ${latitude}, longitude: ${longitude}, altitude: ${altitude}, yaw: ${yaw} on drone connected to gRPC on port ${grpcPort}`;
    console.log(logMessage);
    
    addLog(logMessage);
    
    drone.GotoLocation(latitude, longitude, altitude, yaw);
    res.sendStatus(200);
});

app.get('/return_to_launch', function (req, res) {
    const logMessage = `Returning to launch on drone connected to gRPC on port ${grpcPort}`;
    console.log(logMessage);
    addLog(logMessage);
    drone.ReturnToLaunch();
    res.sendStatus(200);
});

app.get('/do_orbit', function (req, res) {
    const radius = parseFloat(req.query.radius);
    const velocity = parseFloat(req.query.velocity);
    const yaw_behavior = parseInt(req.query.yaw_behavior);
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const altitude = parseFloat(req.query.altitude);

    if (isNaN(radius) || isNaN(velocity) || isNaN(yaw_behavior) || isNaN(latitude) || isNaN(longitude) || isNaN(altitude)) {
        return res.status(400).send("Invalid parameters");
    }

    const logMessage = `Executing DoOrbit with radius: ${radius}, velocity: ${velocity}, yaw_behavior: ${yaw_behavior}, latitude: ${latitude}, longitude: ${longitude}, altitude: ${altitude} on drone connected to gRPC on port ${grpcPort}`;
    console.log(logMessage);
    addLog(logMessage);
    drone.DoOrbit(radius, velocity, yaw_behavior, latitude, longitude, altitude);
    res.sendStatus(200);
});

app.get('/hold', function (req, res) {
    const logMessage = 'Sending Hold (Loiter) command to drone.';
    console.log(logMessage);
    addLog(logMessage);

    drone.Hold();
    res.send('Hold command sent successfully');
});

app.post('/follow_me/start', function (req, res) {
    const logMessage = 'Starting FollowMe mode.';
    console.log(logMessage);
    addLog(logMessage);
    drone.StartFollowMe();
    res.sendStatus(200);
});

app.post('/follow_me/stop', function (req, res) {
    const logMessage = 'Stopping FollowMe mode.';
    console.log(logMessage);
    addLog(logMessage);
    drone.StopFollowMe();
    res.sendStatus(200);
});

app.post('/follow_me', function (req, res) {
    const { latitude_deg, longitude_deg, absolute_altitude_m } = req.body;

    if (!latitude_deg || !longitude_deg || !absolute_altitude_m) {
        res.status(400).send("Invalid GPS data");
        return;
    }

    const logMessage = `Setting target location for FollowMe: latitude ${latitude_deg}, longitude ${longitude_deg}, altitude ${absolute_altitude_m}`;
    console.log(logMessage);
    addLog(logMessage);
    drone.SetFollowMeTargetLocation(latitude_deg, longitude_deg, absolute_altitude_m);
    res.sendStatus(200);
});

app.post('/upload_mission', function (req, res) {
    const { mission_plan } = req.body;
  
    if (!mission_plan || !mission_plan.mission_items) {
      const logMessage = "Invalid mission plan";
      console.error(logMessage);
      addLog(logMessage);  // Add log for invalid mission
      return res.status(400).send(logMessage);
    }
  
    const logMessageReceived = "Mission plan received";
    console.log(logMessageReceived);
    addLog(logMessageReceived);  // Log when mission is received
  
    // Use the MAVSDK to upload the mission
    drone.MissionClient.UploadMission({
      mission_plan: {
        mission_items: mission_plan.mission_items,
      }
    }, (err, response) => {
      if (err) {
        const logMessageError = "Failed to upload mission";
        console.error(logMessageError, err);
        addLog(logMessageError);  // Log when mission upload fails
        return res.status(500).send(logMessageError);
      }
      const logMessageSuccess = "Mission uploaded successfully";
      console.log(logMessageSuccess);
      addLog(logMessageSuccess);  // Log when mission is uploaded successfully
      return res.send(logMessageSuccess);
    });
});
  

app.get('/start_mission', function (req, res) {
    const logMessageStart = "Starting mission...";
    console.log(logMessageStart);
    addLog(logMessageStart);  // Log when starting mission

    // Start the mission only after ensuring mission upload was successful
    drone.StartMission();
    drone.SubscribeMissionProgress();  // Subscribe to mission progress to track its execution

    const logMessageSuccess = "Mission started successfully";
    console.log(logMessageSuccess);
    addLog(logMessageSuccess);  // Log when mission starts successfully

    res.send(logMessageSuccess);
});


app.get('/pause_mission', function (req, res) {
    drone.PauseMission();
    res.sendStatus(200);
});

server.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log(`Example app listening at http://${host}:${port}, connected to MAVSDK gRPC on port ${grpcPort}`);
});
