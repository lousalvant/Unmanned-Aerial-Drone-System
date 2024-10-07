import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PrettyText = styled.label`
  color: #ffffff; /* Adjust for better readability in sidebar */
  font-size: 0.8em; /* Smaller font size to fit the sidebar */
  margin: 0.5em; /* Reduce margin */
  padding: 0.5em;
  display: block; /* Ensure each set of coordinates is on its own line */
  word-wrap: break-word; /* Allow long lines to break */
`;

const GpsContainer = styled.div`
  margin-top: 20px;
  margin-bottom: 0.5em;
  padding: 0.5em;
  background-color: #34495e; /* Adjust background for better sidebar integration */
  border-radius: 5px;
  text-align: left; /* Align text to the left */
  width: 220px; /* Fixed width */
  height: 110px; /* Fixed height */
  overflow: auto; /* Add scrolling if content exceeds fixed height */
`;

const DEFAULT_POSITION_STATE = {
  latitude_deg: 0,
  longitude_deg: 0,
  absolute_altitude_m: 0,
  relative_altitude_m: 0,
};

function GpsCoords({ ports }) {
  const [gpsData, setGpsData] = useState(
    ports.reduce((acc, port) => {
      acc[port] = DEFAULT_POSITION_STATE;
      return acc;
    }, {})
  );

  useEffect(() => {
    const fetchGpsData = async (port) => {
      try {
        const res = await fetch(`http://localhost:${port}/gps`);
        if (!res.ok) throw new Error(`Error fetching GPS data from port ${port}`);
        const newGpsPos = await res.json();
        setGpsData((prevState) => ({
          ...prevState,
          [port]: newGpsPos,
        }));
      } catch (error) {
        console.error(error);
      }
    };

    const timers = ports.map((port) =>
      setInterval(() => {
        fetchGpsData(port);
      }, 500)
    );

    return () => timers.forEach(clearInterval);
  }, [ports]);

  return (
    <div>
      {ports.map((port) => (
        <GpsContainer key={port}>
          <PrettyText>
            Drone {port}:
            <br />
            Lat: {gpsData[port].latitude_deg.toFixed(4)}
            <br />
            Long: {gpsData[port].longitude_deg.toFixed(4)}
            <br />
            Alt: {gpsData[port].absolute_altitude_m}m
          </PrettyText>
        </GpsContainer>
      ))}
    </div>
  );
}

export default GpsCoords;
