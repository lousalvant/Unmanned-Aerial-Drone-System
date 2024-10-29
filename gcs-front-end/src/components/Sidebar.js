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

const SmallTelemetryItem = styled.div`
  font-size: 0.75em;
  margin-bottom: 5px;
`;

const DroneSection = styled.div`
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #34495e;
`;

const ToggleButton = styled.button`
  width: 100%;
  padding: 5px;
  background-color: #1abc9c;
  border: none;
  color: white;
  text-align: center;
  font-size: 0.9em;
  border-radius: 5px;
  margin-bottom: 10px;
  cursor: pointer;
  &:hover {
    background-color: #16a085;
  }
`;

// Wrapper for telemetry data with collapsing/expanding animation
const TelemetryWrapper = styled.div`
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
  max-height: ${(props) => (props.expanded ? '1000px' : '0')};  // Adjust the max-height as needed
`;

const Sidebar = ({ ports }) => {
  const [droneData, setDroneData] = useState({});
  const [expandedPorts, setExpandedPorts] = useState({});

  // Function to toggle the visibility of telemetry data
  const toggleTelemetry = (port) => {
    setExpandedPorts((prevExpandedPorts) => ({
      ...prevExpandedPorts,
      [port]: !prevExpandedPorts[port], // Toggle the expanded state for the specific port
    }));
  };

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
          },
        }));
      } catch (error) {
        console.error(`Error fetching telemetry data for port ${port}:`, error);
      }
    };
  
    // Fetch telemetry data at a regular interval
    const intervalId = setInterval(() => {
      ports.forEach(port => {
        fetchTelemetryData(port);
      });
    }, 1000); // Poll every second, adjust as needed
  
    // Clear interval on component unmount
    return () => clearInterval(intervalId);
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

          {/* Toggle Button for Telemetry */}
          <ToggleButton onClick={() => toggleTelemetry(port)}>
            {expandedPorts[port] ? 'Hide Telemetry' : 'Show Telemetry'}
          </ToggleButton>

          {/* Collapsible section for telemetry data */}
          <TelemetryWrapper expanded={expandedPorts[port]}>
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
          </TelemetryWrapper>
        </DroneSection>
      ))}
    </SidebarContainer>
  );
};

export default Sidebar;
