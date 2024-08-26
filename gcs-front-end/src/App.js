import './App.css';
import ArmButton from './components/armButton';
import DisarmButton from './components/disarmButton';
import TakeoffButton from './components/takeoffButton';
import LandButton from './components/landButton';
import GpsCoords from './components/gpsCoords';
import MapComponent from './components/MapComponent';
import GoToLocation from './components/GoToLocation';

function App() {
  return (
    <div className="App">
      <ArmButton/>
      <DisarmButton/>
      <TakeoffButton/>
      <LandButton/>
      <GoToLocation />
      <GpsCoords/>
      <MapComponent />
    </div>
  );
}

export default App;
