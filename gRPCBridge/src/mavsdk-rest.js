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

app.get('/arm', function (req, res) {
    console.log(`Arming drone connected to gRPC on port ${grpcPort}`);
    drone.Arm();
    res.sendStatus(200);
});

app.get('/disarm', function (req, res) {
    console.log(`Disarming drone connected to gRPC on port ${grpcPort}`);
    drone.Disarm();
    res.sendStatus(200);
});

app.get('/takeoff', function (req, res) {
    console.log(`Taking off drone connected to gRPC on port ${grpcPort}`);
    drone.Takeoff();
    res.sendStatus(200);
});

app.get('/land', function (req, res) {
    console.log(`Landing drone connected to gRPC on port ${grpcPort}`);
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
        res.status(400).send("Invalid parameters");
        return;
    }

    console.log(`Executing GoToLocation with latitude: ${latitude}, longitude: ${longitude}, altitude: ${altitude}, yaw: ${yaw} on drone connected to gRPC on port ${grpcPort}`);
    drone.GotoLocation(latitude, longitude, altitude, yaw);
    res.sendStatus(200);
});

app.get('/return_to_launch', function (req, res) {
    console.log(`Returning to launch on drone connected to gRPC on port ${grpcPort}`);
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
        res.status(400).send("Invalid parameters");
        return;
    }

    console.log(`Executing DoOrbit with radius: ${radius}, velocity: ${velocity}, yaw_behavior: ${yaw_behavior}, latitude: ${latitude}, longitude: ${longitude}, altitude: ${altitude} on drone connected to gRPC on port ${grpcPort}`);
    drone.DoOrbit(radius, velocity, yaw_behavior, latitude, longitude, altitude);
    res.sendStatus(200);
});

app.post('/follow_me/start', function (req, res) {
    drone.StartFollowMe();
    res.sendStatus(200);
});

app.post('/follow_me/stop', function (req, res) {
    drone.StopFollowMe();
    res.sendStatus(200);
});

app.post('/follow_me', function (req, res) {
    const { latitude_deg, longitude_deg, absolute_altitude_m } = req.body;

    if (!latitude_deg || !longitude_deg || !absolute_altitude_m) {
        res.status(400).send("Invalid GPS data");
        return;
    }

    drone.SetFollowMeTargetLocation(latitude_deg, longitude_deg, absolute_altitude_m);
    res.sendStatus(200);
});

app.post('/upload_mission', function (req, res) {
    const { mission_plan } = req.body;
  
    if (!mission_plan || !mission_plan.mission_items) {
      return res.status(400).send("Invalid mission plan");
    }
  
    console.log("Mission plan received:", mission_plan);
  
    // Use the MAVSDK to upload the mission
    drone.MissionClient.UploadMission({
      mission_plan: {
        mission_items: mission_plan.mission_items,
      }
    }, (err, response) => {
      if (err) {
        console.error("Failed to upload mission:", err);
        return res.status(500).send("Failed to upload mission");
      }
      console.log("Mission uploaded successfully");
      return res.send("Mission uploaded successfully");
    });
  });  

  app.get('/start_mission', function (req, res) {
    console.log("Starting mission...");

    // Start the mission only after ensuring mission upload was successful
    drone.StartMission();
    drone.SubscribeMissionProgress();  // Subscribe to mission progress to track its execution

    res.send("Mission started successfully");
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
