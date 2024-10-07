import './App.css';
import ArmButton from './components/armButton';
import DisarmButton from './components/disarmButton';
import TakeoffButton from './components/takeoffButton';
import LandButton from './components/landButton';
import GpsCoords from './components/gpsCoords';
import MapComponent from './components/MapComponent';
import GoToLocation from './components/GoToLocation';
import ReturnToLaunchButton from './components/ReturnToLaunchButton';
import DoOrbitButton from './components/DoOrbitButton';
import MissionComponent from './components/MissionComponent';
import DroneFeedback from './components/FeedbackComponent';
import Sidebar from './components/Sidebar';
import styled from 'styled-components';
import { useState, useEffect } from 'react';

const AppContainer = styled.div`
  display: flex;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ControlSectionContainer = styled.div`
  display: flex;
  flex-direction: row;  /* Aligns sections horizontally */
  justify-content: flex-start;  /* Aligns sections to the left */
  align-items: flex-start;  /* Ensures both sections align at the top */
  gap: 10px;  /* Controls the space between the sections */
  margin: 5px;
`;

function App() {
  const [selectedDronePort, setSelectedDronePort] = useState(8081); // Default port
  const [activePorts, setActivePorts] = useState([]); // Store active drone ports
  const [leaderPort, setLeaderPort] = useState(null); // Track the leader drone port
  const [followers, setFollowers] = useState([]); // Track follower drones
  const [followIntervalId, setFollowIntervalId] = useState(null); // Store interval ID for stopping later
  const allPorts = [8081, 8082, 8083]; // Add more ports as needed

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
      <Sidebar />
      <MainContent>
        <div>
          <label>Select Leader: </label>
          <select onChange={handleLeaderSelection} value={leaderPort || ''}>
            <option value="" disabled>Select a leader drone</option>
            {activePorts.map((port) => (
              <option key={port} value={port}>Drone (Port {port})</option>
            ))}
          </select>
        </div>

        <div>
          <h3>Select Drones to Follow</h3>
          {activePorts.map((port) => (
            <div key={port}>
              <input
                type="checkbox"
                checked={followers.includes(port)}
                onChange={() => toggleFollower(port)}
                disabled={port === leaderPort} // Disable selection for leader
              />
              <label>Drone (Port {port})</label>
            </div>
          ))}
        </div>

        <button onClick={handleFollowMode} disabled={!leaderPort || followers.length === 0}>
          Start Follow Mode
        </button>
        <button onClick={stopFollowMode} disabled={!followIntervalId}>
          Stop Follow Mode
        </button>

        <div>
          <label>Select Drone to Control: </label>
          <select onChange={(e) => setSelectedDronePort(e.target.value)}>
            {activePorts.map((port) => (
              <option key={port} value={port}>Drone (Port {port})</option>
            ))}
          </select>
        </div>

        <ArmButton port={selectedDronePort} />
        <DisarmButton port={selectedDronePort} />
        <TakeoffButton port={selectedDronePort} />
        <LandButton port={selectedDronePort} />
        <ReturnToLaunchButton port={selectedDronePort} />

        <ControlSectionContainer>
          <GoToLocation port={selectedDronePort} />
          <DoOrbitButton port={selectedDronePort} />
        </ControlSectionContainer>
        <MissionComponent selectedDronePort={selectedDronePort} />

        {activePorts.map((port) => (
          <DroneFeedback key={port} port={port} />
        ))}

        <GpsCoords ports={activePorts} />
        <MapComponent ports={activePorts} />
      </MainContent>
    </AppContainer>
  );
}

export default App;
