import React, { useState } from 'react';
import styled from 'styled-components';

const Button = styled.button`
  color: darkred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid darkred;
  border-radius: 3px;
`;

const Input = styled.input`
  margin: 0.5em;
  padding: 0.5em;
  border: 1px solid darkred;
  border-radius: 3px;
`;

function GoToLocation() {
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [altitude, setAltitude] = useState('');
    const [yaw, setYaw] = useState('');

    const handleGotoLocation = () => {
        fetch(`http://localhost:8081/goto?latitude=${latitude}&longitude=${longitude}&altitude=${altitude}&yaw=${yaw}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
    };

    return (
        <div>
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
        </div>
    );
}

export default GoToLocation;
