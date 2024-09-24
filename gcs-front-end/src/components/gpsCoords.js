import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const PrettyText = styled.label`
  color: #34495e;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid #34495e;
  border-radius: 3px;
  display: block; /* Ensure each set of coordinates is on its own line */
`;

const GpsContainer = styled.div`
  margin-bottom: 1em;
  padding: 0.5em;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
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
            Drone on Port {port}: {gpsData[port].latitude_deg}, {gpsData[port].longitude_deg}, {gpsData[port].absolute_altitude_m}
          </PrettyText>
        </GpsContainer>
      ))}
    </div>
  );
}

export default GpsCoords;
