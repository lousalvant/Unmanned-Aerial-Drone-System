import './App.css';
import ArmButton from './components/armButton';
import DisarmButton from './components/disarmButton';
import TakeoffButton from './components/takeoffButton';
import LandButton from './components/landButton';
// import GpsCoords from './components/gpsCoords';
import MapComponent from './components/MapComponent';
import GoToLocation from './components/GoToLocation';
import ReturnToLaunchButton from './components/ReturnToLaunchButton';
import DoOrbitButton from './components/DoOrbitButton';
import MissionComponent from './components/MissionComponent';
import DroneFeedback from './components/FeedbackComponent';
import Sidebar from './components/Sidebar';
import styled from 'styled-components';
import { useState, useEffect } from 'react';

const Button = styled.button`
  color: #fff;
  font-size: 0.85em;
  margin: 0.5em;
  padding: 0.4em 0;
  background-color: #2c3e50;
  border: 1px solid #34495e;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;

  width: 100px;
  height: 30px;

  &:hover {
    background-color: #34495e;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(52, 73, 94, 0.4);
  }

  &:active {
    background-color: #1e2d3a;
  }
`;

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  overflow-y: auto;
`;

const CommandSectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-right: 20px;
  margin-top: 30px;
`;

const ControlSectionContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 10px;
  margin: 5px;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); /* Ensure grid layout */
  gap: 20px; /* Add space between the logs */
  justify-content: center; /* Center the logs */
  width: 100%; /* Take up the full available width */
  padding: 20px; /* Add padding to create space around the grid */
`;

const LeaderFollowerSection = styled.div`
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
  margin-top: 20px;
  margin-bottom: 20px; /* Add margin to create space */
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 300px;
`;

const LeaderFollowerTitle = styled.h3`
  margin-bottom: 10px;
`;

const SelectLeader = styled.select`
  margin-bottom: 10px;
  padding: 5px;
  width: 100%;
`;

const CheckboxContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const FollowerCheckbox = styled.div`
  margin-bottom: 5px;
`;

const MapContainer = styled.div`
  flex-grow: 1; /* Allow the map to grow and take available space */
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const MapComponentStyled = styled(MapComponent)`
  width: 100%;
  height: 100%;
  max-height: 100vh; /* Ensure it does not exceed the viewport height */
`;

function App() {
  const [selectedDronePort, setSelectedDronePort] = useState(8081); // Default port
  const [activePorts, setActivePorts] = useState([]); // Store active drone ports
  const [leaderPort, setLeaderPort] = useState(null); // Track the leader drone port
  const [followers, setFollowers] = useState([]); // Track follower drones
  const [followIntervalId, setFollowIntervalId] = useState(null); // Store interval ID for stopping later
  const [showLogs, setShowLogs] = useState(false); // State to toggle logs visibility
  const allPorts = [8081, 8082, 8083, 8084]; // Add more ports as needed

  useEffect(() => {
    // Detect active ports by checking GPS data availability
    const detectActivePorts = async () => {
      const detectedPorts = [];
      for (let port of allPorts) {
        try {
          const res = await fetch(`http://localhost:${port}/gps`);
          if (res.ok) {
            detectedPorts.push(port); // Add active port to the list
          }
        } catch (error) {
          if (error.message.includes("Failed to fetch")) {
            console.log(`Port ${port} is not active`);
          } else {
            console.error(`Error checking port ${port}:`, error);
          }
        }
      }
      setActivePorts(detectedPorts);
    };

    detectActivePorts(); // Detect ports on component mount
  }, []);

  const sendCommandToDrones = (commandFunction) => {
    if (selectedDronePort === -1) { // If "All Drones" is selected
      activePorts.forEach((port) => {
        commandFunction(port); // Send command to all active drones
      });
    } else {
      commandFunction(selectedDronePort); // Send command to the selected drone
    }
  };
  

  // Function to handle the leader selection
  const handleLeaderSelection = (event) => {
    const selectedLeader = parseInt(event.target.value);
    setLeaderPort(selectedLeader);
    setFollowers(followers.filter((port) => port !== selectedLeader)); // Ensure the leader is not a follower
  };

  // Function to toggle a drone as a follower or independent
  const toggleFollower = (port) => {
    if (followers.includes(port)) {
      setFollowers(followers.filter((followerPort) => followerPort !== port)); // Remove from followers
    } else {
      setFollowers([...followers, port]); // Add to followers
    }
  };

  const startFollowMe = async (followerPort, leaderCoords) => {
    // First, start follow me mode
    await fetch(`http://localhost:${followerPort}/follow_me/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Then, set the target location for the follower drone
    await fetch(`http://localhost:${followerPort}/follow_me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude_deg: leaderCoords.latitude_deg,
        longitude_deg: leaderCoords.longitude_deg,
        absolute_altitude_m: leaderCoords.absolute_altitude_m,
      }),
    });
  };

  // Function to continuously send GPS coordinates of the leader to the followers
  const handleFollowMode = () => {
    // Clear any previous follow mode interval
    if (followIntervalId) {
      clearInterval(followIntervalId);
    }

    const intervalId = setInterval(async () => {
      const leaderGpsResponse = await fetch(`http://localhost:${leaderPort}/gps`);
      const leaderGpsData = await leaderGpsResponse.json();

      // Start FollowMe mode for all followers and continuously update their location
      followers.forEach((followerPort) => {
        startFollowMe(followerPort, leaderGpsData);
      });
    }, 1000); // Update every second (you can adjust the interval timing)

    setFollowIntervalId(intervalId); // Store interval ID for stopping later
  };

  const stopFollowMode = () => {
    if (followIntervalId) {
      clearInterval(followIntervalId); // Stop the follow mode by clearing the interval
      setFollowIntervalId(null);
    }

    // Optionally, send stop follow mode command to the drones
    followers.forEach((followerPort) => {
      fetch(`http://localhost:${followerPort}/follow_me/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  };

  if (activePorts.length === 0) {
    return <div>Loading drones...</div>;
  }

  return (
    <AppContainer>
      <Sidebar ports={activePorts} />
      <MainContent>

         {/* Leader-Follower Section */}
         <LeaderFollowerSection>
          <LeaderFollowerTitle>Leader-Follower Mode</LeaderFollowerTitle>
          <div>
            <label>Select Leader: </label>
            <SelectLeader onChange={handleLeaderSelection} value={leaderPort || ''}>
              <option value="" disabled>Select a leader drone</option>
              {activePorts.map((port) => (
                <option key={port} value={port}>Drone (Port {port})</option>
              ))}
            </SelectLeader>
          </div>

        <CheckboxContainer>
            <h4>Select Drones to Follow</h4>
            {activePorts.map((port) => (
              <FollowerCheckbox key={port}>
                <input
                  type="checkbox"
                  checked={followers.includes(port)}
                  onChange={() => toggleFollower(port)}
                  disabled={port === leaderPort} // Disable selection for leader
                />
                <label>Drone (Port {port})</label>
              </FollowerCheckbox>
            ))}
          </CheckboxContainer>

          <Button onClick={handleFollowMode} disabled={!leaderPort || followers.length === 0}>
            Start Follow
          </Button>
          <Button onClick={stopFollowMode} disabled={!followIntervalId}>
            Stop Follow
          </Button>
        </LeaderFollowerSection>

        <div>
          <label>Select Drone to Control: </label>
          <select onChange={(e) => setSelectedDronePort(parseInt(e.target.value))}>
            <option value="-1">All Drones</option> {/* Add this option */}
            {activePorts.map((port) => (
              <option key={port} value={port}>Drone (Port {port})</option>
            ))}
          </select>
        </div>


        <ControlSectionContainer>

          <CommandSectionContainer>
            <ArmButton sendCommandToDrones={sendCommandToDrones} />
            <DisarmButton sendCommandToDrones={sendCommandToDrones} />
            <TakeoffButton sendCommandToDrones={sendCommandToDrones} />
            <LandButton sendCommandToDrones={sendCommandToDrones} />
            <ReturnToLaunchButton sendCommandToDrones={sendCommandToDrones} />
          </CommandSectionContainer>

          <GoToLocation sendCommandToDrones={sendCommandToDrones} />
          <DoOrbitButton sendCommandToDrones={sendCommandToDrones} />
          <MissionComponent sendCommandToDrones={sendCommandToDrones} />
        </ControlSectionContainer>

        {/* Toggle logs visibility */}
        <Button onClick={() => setShowLogs(!showLogs)}>
          {showLogs ? 'Hide All Logs' : 'Show All Logs'}
        </Button>

        {/* Grid for logs */}
        <GridContainer>
          {activePorts.map((port) => (
            <DroneFeedback key={port} port={port} isVisible={showLogs} />
          ))}
        </GridContainer>

        {/* <GpsCoords ports={activePorts} /> */}
        <MapContainer>
          <MapComponentStyled ports={activePorts} />
        </MapContainer>
      </MainContent>
    </AppContainer>
  );
}

export default App;
