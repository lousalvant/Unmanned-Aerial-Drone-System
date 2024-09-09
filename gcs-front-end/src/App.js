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
  justify-content: space-around;
  width: 100%;
`;

function App() {
  const [selectedDronePort, setSelectedDronePort] = useState(8081); // Default port
  const [activePorts, setActivePorts] = useState([]); // Store active drone ports
  const allPorts = [8081, 8082, 8083]; // Add more ports as needed

  useEffect(() => {
    // Function to detect active ports by checking GPS data availability
    const detectActivePorts = async () => {
      const detectedPorts = [];
      for (let port of allPorts) {
        try {
          const res = await fetch(`http://localhost:${port}/gps`);
          if (res.ok) {
            detectedPorts.push(port); // Add active port to the list
          }
        } catch (error) {
          // Suppress the connection refused error to clean up console
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

  if (activePorts.length === 0) {
    return <div>Loading drones...</div>;
  }

  return (
    <AppContainer>
      <Sidebar />
      <MainContent>
        <div>
          <label>Select Drone: </label>
          <select onChange={(e) => setSelectedDronePort(e.target.value)}>
            {activePorts.map(port => (
              <option key={port} value={port}>Drone (Port {port})</option>
            ))}
          </select>
        </div>
        <ArmButton port={selectedDronePort} />
        <DisarmButton port={selectedDronePort} />
        <TakeoffButton port={selectedDronePort} />
        <LandButton port={selectedDronePort} />
        <ControlSectionContainer>
          <GoToLocation port={selectedDronePort} />
          <DoOrbitButton port={selectedDronePort} />
        </ControlSectionContainer>
        <ReturnToLaunchButton port={selectedDronePort} />
        <GpsCoords ports={activePorts} />
        <MapComponent ports={activePorts} />
      </MainContent>
    </AppContainer>
  );
}

export default App;
