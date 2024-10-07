import React, { useState } from 'react';
import styled from 'styled-components';

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

const Input = styled.input`
  margin: 0.5em;
  padding: 0.5em;
  border: 1px solid #34495e;
  border-radius: 3px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #ccc;
  padding: 5px; /* Further reduce padding */
  margin: 5px;
  border-radius: 5px;
  width: 200px; /* Set a consistent width */
  height: 280px; /* Set a fixed height to make the section shorter */
  overflow-y: auto; /* Ensure content doesn't overflow */
`;

function GoToLocationDrone(port, latitude, longitude, altitude, yaw) {
    fetch(`http://localhost:${port}/goto?latitude=${latitude}&longitude=${longitude}&altitude=${altitude}&yaw=${yaw}`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        console.log(`GoToLocation command sent successfully to drone on port ${port}`);
    })
    .catch(error => {
        console.error('Error in sending GoToLocation command:', error);
    });
}

function GoToLocation({ sendCommandToDrones }) {
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [altitude, setAltitude] = useState('');
    const [yaw, setYaw] = useState('');

    const handleGotoLocation = () => {
        sendCommandToDrones((port) => {
            GoToLocationDrone(port, latitude, longitude, altitude, yaw);
        });
    };

    return (
        <Section>
            <h3>Go To Location</h3>
            <Input
                type="text"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                placeholder="Latitude"
            />
            <Input
                type="text"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                placeholder="Longitude"
            />
            <Input
                type="text"
                value={altitude}
                onChange={e => setAltitude(e.target.value)}
                placeholder="Altitude"
            />
            <Input
                type="text"
                value={yaw}
                onChange={e => setYaw(e.target.value)}
                placeholder="Yaw"
            />
            <Button onClick={handleGotoLocation}>Go To Location</Button>
        </Section>
    );
}

export default GoToLocation;
