const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');


const MAVSDK_ACTION_PROTO_PATH = __dirname + '/../MAVSDK-Proto/protos/action/action.proto';
console.log(MAVSDK_ACTION_PROTO_PATH);
const ACTION_PACKAGE_DEFINITION = protoLoader.loadSync(
    MAVSDK_ACTION_PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });


var MAVSDK_TELEMETRY_PROTO_PATH = __dirname + '/../MAVSDK-Proto/protos/telemetry/telemetry.proto';
console.log(MAVSDK_TELEMETRY_PROTO_PATH);
const TELEMTRY_PACKAGE_DEFINITION = protoLoader.loadSync(
    MAVSDK_TELEMETRY_PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });

const MAVSDK_FOLLOW_ME_PROTO_PATH = __dirname + '/../MAVSDK-Proto/protos/follow_me/follow_me.proto';
const FOLLOW_ME_PACKAGE_DEFINITION = protoLoader.loadSync(
    MAVSDK_FOLLOW_ME_PROTO_PATH,
    { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);

const MAVSDK_MISSION_PROTO_PATH = __dirname + '/../MAVSDK-Proto/protos/mission/mission.proto';
const MISSION_PACKAGE_DEFINITION = protoLoader.loadSync(
    MAVSDK_MISSION_PROTO_PATH,
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });


const GRPC_HOST_NAME="127.0.0.1:50000";

class MAVSDKDrone {
    constructor(grpcHost) {
        this.Action = grpc.loadPackageDefinition(ACTION_PACKAGE_DEFINITION).mavsdk.rpc.action;
        this.ActionClient = new this.Action.ActionService(grpcHost, grpc.credentials.createInsecure());

        this.Telemetry = grpc.loadPackageDefinition(TELEMTRY_PACKAGE_DEFINITION).mavsdk.rpc.telemetry;
        this.TelemetryClient = new this.Telemetry.TelemetryService(grpcHost, grpc.credentials.createInsecure());

        this.FollowMe = grpc.loadPackageDefinition(FOLLOW_ME_PACKAGE_DEFINITION).mavsdk.rpc.follow_me;
        this.FollowMeClient = new this.FollowMe.FollowMeService(grpcHost, grpc.credentials.createInsecure());

        this.Mission = grpc.loadPackageDefinition(MISSION_PACKAGE_DEFINITION).mavsdk.rpc.mission;
        this.MissionClient = new this.Mission.MissionService(grpcHost, grpc.credentials.createInsecure());


        this.position = {};
        this.health = {};
        this.flightMode = {};
        this.statusText = {};
        this.battery = {};

        this.SubscribeToGps();
        this.SubscribeToHealth();
        this.SubscribeToStatusText();
        this.SubscribeToBattery();
        this.SubscribeToFlightMode();
    }


    Arm() {
        this.ActionClient.arm({}, function (err, actionResponse) {
            if (err) {
                console.log("Unable to arm drone: ", err);
                return;
            }
            if (actionResponse.action_result.result === 'RESULT_SUCCESS') {
                console.log("Drone armed successfully.");
            } else {
                console.log(`Arming failed: ${actionResponse.action_result.result_str}`);
            }
        });
    }
    
    Disarm()
    {
        this.ActionClient.disarm({}, function(err, actionResponse){
            if(err){
                console.log("Unable to disarm drone: ", err);
                return;
            }
        });
    }

    Takeoff()
    {
        this.ActionClient.takeoff({}, function(err, actionResponse){
            if(err){
                console.log("Unable to disarm drone: ", err);
                return;
            }
        });
    }

    Land()
    {
        this.ActionClient.land({}, function(err, actionResponse){
            if(err){
                console.log("Unable to land drone: ", err);
                return;
            }
        });
    }

    SubscribeToGps()
    {
        const self = this;

        this.GpsCall = this.TelemetryClient.subscribePosition({});

        this.GpsCall.on('data', function(gpsInfoResponse){
            // console.log(gpsInfoResponse)
            self.position = gpsInfoResponse.position
            return; 
        });

        this.GpsCall.on('end', function() {
            console.log("SubscribePosition request ended");
            return;
        });

        this.GpsCall.on('error', function(e) {
            console.log(e)
            return;
        });
        this.GpsCall.on('status', function(status) {
            console.log(status);
            return;
        });
    }

    SubscribeToHealth() {
        const self = this;
        this.HealthCall = this.TelemetryClient.subscribeHealth({});
        this.HealthCall.on('data', function(healthResponse) {
            self.health = healthResponse.health;
            console.log('Health Update:', self.health);
        });
    
        this.HealthCall.on('end', function() {
            console.log('Health subscription ended');
        });
    
        this.HealthCall.on('error', function(e) {
            console.log(e);
        });
    }    

    SubscribeToStatusText() {
        const self = this;
        this.StatusTextCall = this.TelemetryClient.subscribeStatusText({});
        this.StatusTextCall.on('data', function (statusTextResponse) {
            self.statusText = statusTextResponse.status_text;
        });
        this.StatusTextCall.on('error', function (e) {
            console.error("Error subscribing to StatusText:", e);
        });
    }

    SubscribeToBattery() {
        const self = this;
        this.BatteryCall = this.TelemetryClient.subscribeBattery({});
        this.BatteryCall.on('data', function(batteryResponse) {
            self.battery = batteryResponse.battery;
        });
    }

    SubscribeToFlightMode() {
        const self = this;
        this.FlightModeCall = this.TelemetryClient.subscribeFlightMode({});
        this.FlightModeCall.on('data', function(flightModeResponse) {
            self.flightMode = flightModeResponse.flight_mode;
            console.log('Flight Mode Update:', self.flightMode);
        });
    
        this.FlightModeCall.on('end', function() {
            console.log('Flight mode subscription ended');
        });
    
        this.FlightModeCall.on('error', function(e) {
            console.log(e);
        });
    }    

    GotoLocation(latitude, longitude, altitude, yaw) {
        const request = {
            latitude_deg: latitude,
            longitude_deg: longitude,
            absolute_altitude_m: altitude,
            yaw_deg: yaw
        };

        this.ActionClient.gotoLocation(request, function (err, actionResponse) {
            if (err) {
                console.log("Unable to execute GoToLocation:", err);
                return;
            }
            console.log("GoToLocation response:", actionResponse);
        });
    }

    ReturnToLaunch() {
        this.ActionClient.returnToLaunch({}, function(err, actionResponse) {
            if (err) {
                console.log("Unable to return to launch:", err);
                return;
            }
            console.log("ReturnToLaunch response:", actionResponse);
        });
    }

    DoOrbit(radius, velocity, yaw_behavior, latitude, longitude, altitude) {
        const request = {
            radius_m: radius,
            velocity_ms: velocity,
            yaw_behavior: yaw_behavior, // e.g., ORBIT_YAW_BEHAVIOR_HOLD_FRONT_TO_CIRCLE_CENTER
            latitude_deg: latitude,
            longitude_deg: longitude,
            absolute_altitude_m: altitude
        };

        this.ActionClient.doOrbit(request, function (err, actionResponse) {
            if (err) {
                console.log("Unable to execute DoOrbit:", err);
                return;
            }
            console.log("DoOrbit response:", actionResponse);
        });
    }

    Hold() {
        this.ActionClient.hold({}, function (err, actionResponse) {
            if (err) {
                console.log("Unable to send Hold command: ", err);
                return;
            }
            if (actionResponse.action_result.result === 'RESULT_SUCCESS') {
                console.log("Hold command sent successfully.");
            } else {
                console.log(`Failed to send Hold command: ${actionResponse.action_result.result_str}`);
            }
        });
    }    

    // Follow the leader using FollowMe
    StartFollowMe() {
        const request = {}; // No specific request data needed to start FollowMe mode

        this.FollowMeClient.start(request, function (err, response) {
            if (err) {
                console.log("Failed to start FollowMe:", err);
                return;
            }
            console.log("FollowMe started successfully.");
        });
    }

    // Stop FollowMe
    StopFollowMe() {
        const request = {}; // No specific request data needed to stop FollowMe mode

        this.FollowMeClient.stop(request, function (err, response) {
            if (err) {
                console.log("Failed to stop FollowMe:", err);
                return;
            }
            console.log("FollowMe stopped successfully.");
        });
    }

    // Set the target location for FollowMe (the leader's GPS location)
    SetFollowMeTargetLocation(latitude_deg, longitude_deg, absolute_altitude_m) {
        const targetLocation = {
            latitude_deg: latitude_deg,
            longitude_deg: longitude_deg,
            absolute_altitude_m: absolute_altitude_m,
            velocity_x_m_s: 0,
            velocity_y_m_s: 0,
            velocity_z_m_s: 0
        };

        this.FollowMeClient.setTargetLocation({ location: targetLocation }, function (err, response) {
            if (err) {
                console.log("Failed to set target location for FollowMe:", err);
                return;
            }
            console.log("Target location set for FollowMe.");
        });
    }

    UploadMission(missionItems) {
        const missionPlan = {
            mission_plan: {
                mission_items: missionItems
            }
        };
    
        this.MissionClient.UploadMission(missionPlan, (err, response) => {
            if (err) {
                console.log("Failed to upload mission:", err);
            } else {
                console.log("Mission uploaded successfully:", response);
            }
        });
    }

    StartMission() {
        // Start the mission only if the drone is armed and the mission was uploaded
        this.MissionClient.StartMission({}, (err, response) => {
            if (err) {
                console.log("Failed to start mission:", err);
                return;
            }
    
            // Check the result status from the mission response
            if (response.mission_result && response.mission_result.result === 'RESULT_SUCCESS') {
                console.log("Mission started successfully");
            } else {
                console.log("Failed to start mission: ", response.mission_result ? response.mission_result.result_str : "Unknown error");
            }
        });
    }
    
    SubscribeMissionProgress() {
        this.MissionClient.SubscribeMissionProgress({}, (progressError, progressResponse) => {
            if (progressError) {
                console.error("Failed to subscribe to mission progress:", progressError);
                return;
            }
            console.log(`Mission progress: ${progressResponse.mission_progress.current} / ${progressResponse.mission_progress.total}`);
        });
    }
    
    
    PauseMission() {
        this.MissionClient.PauseMission({}, (err, response) => {
            if (err) {
                console.log("Failed to pause mission:", err);
            } else {
                console.log("Mission paused successfully:", response);
            }
        });
    }    
}

module.exports = MAVSDKDrone;