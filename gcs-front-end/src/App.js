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
import Sidebar from './components/Sidebar'; // Import the Sidebar component
import styled from 'styled-components';

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

function App() {
  return (
    <AppContainer>
      <Sidebar />
      <MainContent>
        <ArmButton />
        <DisarmButton />
        <TakeoffButton />
        <LandButton />
        <GoToLocation />
        <DoOrbitButton />
        <ReturnToLaunchButton />
        <GpsCoords />
        <MapComponent />
      </MainContent>
    </AppContainer>
  );
}

export default App;
