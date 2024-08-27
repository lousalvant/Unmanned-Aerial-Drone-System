var cors = require('cors');

var express = require('express')
var app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());


const UNSAFE_FRONT_END_URL= "*"; // Allow all origins
// const UNSAFE_FRONT_END_URL= "http://localhost:3000";

app.use(cors(
        { 
            origin: UNSAFE_FRONT_END_URL,
            methods: ["GET", "POST"] 
        }));

const http = require('http');
const server = http.createServer(app);

var MAVSDKDrone = require('./mavsdk-grpc.js')
var drone = new MAVSDKDrone()

app.get('/arm', function(req, res){

    console.log("Hellooo from arm!")
    
    drone.Arm()

    res.sendStatus(200);

});

app.get('/disarm', function(req, res){

    console.log("Hellooo from disarm!")
    
    drone.Disarm()

    res.sendStatus(200);

});

app.get('/takeoff', function(req, res){

    console.log("Hellooo from takeoff!")
    
    drone.Takeoff()

    res.sendStatus(200);

});

app.get('/land', function(req, res){

    console.log("Hellooo from land!")
    
    drone.Land()

    res.sendStatus(200);

});


app.get('/gps', function(req, res){
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

    console.log(`Executing GoToLocation with latitude: ${latitude}, longitude: ${longitude}, altitude: ${altitude}, yaw: ${yaw}`);
    drone.GotoLocation(latitude, longitude, altitude, yaw);
    res.sendStatus(200);
});

app.get('/return_to_launch', function(req, res) {
    console.log("Returning to launch...");
    drone.ReturnToLaunch();
    res.sendStatus(200);
});

app.get('/do_orbit', function (req, res) {
    const radius = parseFloat(req.query.radius);
    const velocity = parseFloat(req.query.velocity);
    const yaw_behavior = parseInt(req.query.yaw_behavior); // Make sure to parse the enum value correctly
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const altitude = parseFloat(req.query.altitude);

    if (isNaN(radius) || isNaN(velocity) || isNaN(yaw_behavior) || isNaN(latitude) || isNaN(longitude) || isNaN(altitude)) {
        res.status(400).send("Invalid parameters");
        return;
    }

    console.log(`Executing DoOrbit with radius: ${radius}, velocity: ${velocity}, yaw_behavior: ${yaw_behavior}, latitude: ${latitude}, longitude: ${longitude}, altitude: ${altitude}`);
    drone.DoOrbit(radius, velocity, yaw_behavior, latitude, longitude, altitude);
    res.sendStatus(200);
});

server.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
});
