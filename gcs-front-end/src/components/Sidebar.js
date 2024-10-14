import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import TimeDisplay from './TimeDisplay';
import GpsCoords from '../components/gpsCoords';

const SidebarContainer = styled.div`
  width: 250px;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  box-shadow: 2px 0px 5px rgba(0,0,0,0.1);
  overflow-y: auto;
`;

const Title = styled.h1`
  font-size: 1.5em;
  margin-bottom: 1em;
`;

const MenuButton = styled.button`
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  background-color: #34495e;
  border: none;
  color: white;
  text-align: center;
  font-size: 1em;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background-color: lightgray;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.2em;
  margin-top: 20px;
  margin-bottom: 10px;
  text-align: center;
`;

const TelemetryItem = styled.div`
  font-size: 0.9em;
  margin-bottom: 5px;
`;

// New styled component for smaller telemetry text
const SmallTelemetryItem = styled.div`
  font-size: 0.75em;  // Adjust the font size to be smaller
  margin-bottom: 5px;
`;

const DroneSection = styled.div`
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #34495e;
`;

const Sidebar = ({ ports }) => {
  const [droneData, setDroneData] = useState({});

  useEffect(() => {
    const fetchTelemetryData = async (port) => {
      try {
          const healthResponse = await fetch(`http://localhost:${port}/health`);
          const healthJson = await healthResponse.json();

          const flightModeResponse = await fetch(`http://localhost:${port}/flight_mode`);
          const flightModeJson = await flightModeResponse.json();

          const statusTextResponse = await fetch(`http://localhost:${port}/status_text`);
          const statusTextJson = await statusTextResponse.json();

          const batteryResponse = await fetch(`http://localhost:${port}/battery`);
          const batteryJson = await batteryResponse.json();

          setDroneData(prevData => ({
              ...prevData,
              [port]: {
                  health: healthJson,
                  flightMode: flightModeJson.flight_mode,
                  statusText: statusTextJson,
                  battery: batteryJson,
              }
          }));
      } catch (error) {
          console.error(`Error fetching telemetry data for port ${port}:`, error);
      }
    };  

    ports.forEach(port => {
      fetchTelemetryData(port);
    });
  }, [ports]);

  return (
    <SidebarContainer>
      <Title>Drone Dashboard</Title>
      <TimeDisplay />
      <MenuButton>Overview</MenuButton>
      <MenuButton>Documentation</MenuButton>
      <MenuButton>About</MenuButton>
      
      <GpsCoords ports={ports} />  {/* Display GPS coordinates */}

      {/* Iterate through each drone's telemetry data */}
      {ports.map(port => (
        <DroneSection key={port}>
          <SectionTitle>Drone (Port {port})</SectionTitle>

          {/* Health Information */}
          {droneData[port]?.health && (
              <div>
                  <SectionTitle>Health Status</SectionTitle>
                  <TelemetryItem>Gyrometer Calibrated: {droneData[port].health.is_gyrometer_calibration_ok ? 'Yes' : 'No'}</TelemetryItem>
                  <TelemetryItem>Accelerometer Calibrated: {droneData[port].health.is_accelerometer_calibration_ok ? 'Yes' : 'No'}</TelemetryItem>
                  <TelemetryItem>Magnetometer Calibrated: {droneData[port].health.is_magnetometer_calibration_ok ? 'Yes' : 'No'}</TelemetryItem>
              </div>
          )}

          {/* Flight Mode Information */}
          {droneData[port]?.flightMode && (
              <div>
                  <SectionTitle>Flight Mode</SectionTitle>
                  <SmallTelemetryItem>Current Mode: {droneData[port].flightMode}</SmallTelemetryItem>
              </div>
          )}

          {/* StatusText Information */}
          {droneData[port]?.statusText && (
              <div>
                  <SectionTitle>Status Text</SectionTitle>
                  <SmallTelemetryItem>Type: {droneData[port].statusText.type}</SmallTelemetryItem>
                  <SmallTelemetryItem>Message: {droneData[port].statusText.text}</SmallTelemetryItem>
              </div>
          )}

          {/* Battery Information */}
          {droneData[port]?.battery && (
            <div>
              <SectionTitle>Battery</SectionTitle>
              <TelemetryItem>Voltage: {droneData[port].battery.voltage_v || 'N/A'} V</TelemetryItem>
              <TelemetryItem>Current: {droneData[port].battery.current_battery_a || 'N/A'} A</TelemetryItem>
              <TelemetryItem>Remaining: {droneData[port].battery.remaining_percent || 'N/A'}%</TelemetryItem>
            </div>
          )}
        </DroneSection>
      ))}
    </SidebarContainer>
  );
};

export default Sidebar;
