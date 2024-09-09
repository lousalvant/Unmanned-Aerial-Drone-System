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
import { useState } from 'react';

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
  const allPorts = [8081, 8082, 8083]; // Add more ports as needed

  return (
    <AppContainer>
      <Sidebar />
      <MainContent>
        <div>
          <label>Select Drone: </label>
          <select onChange={(e) => setSelectedDronePort(e.target.value)}>
            <option value="8081">Drone 1 (Port 8081)</option>
            <option value="8082">Drone 2 (Port 8082)</option>
            <option value="8083">Drone 3 (Port 8083)</option>
            {/* Add more options as needed */}
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
        <GpsCoords ports={allPorts} />
        <MapComponent ports={allPorts} />
      </MainContent>
    </AppContainer>
  );
}

export default App;
