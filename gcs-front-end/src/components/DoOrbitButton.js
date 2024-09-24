import React, { useState } from 'react';
import styled from 'styled-components';

const Button = styled.button`
  color: darkred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid darkred;
  border-radius: 3px;
  &:hover {
    background-color: lightgray; /* Change background color on hover */
  }
`;

const Input = styled.input`
  margin: 0.5em;
  padding: 0.5em;
  border: 1px solid darkred;
  border-radius: 3px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #ccc;
  padding: 20px;
  margin: 10px;
  border-radius: 10px;
  width: 300px;
`;

function DoOrbitButton({ port }) {
    const [radius, setRadius] = useState('');
    const [velocity, setVelocity] = useState('');
    const [yawBehavior, setYawBehavior] = useState(0);
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [altitude, setAltitude] = useState('');

    const handleDoOrbit = () => {
        fetch(`http://localhost:${port}/do_orbit?radius=${radius}&velocity=${velocity}&yaw_behavior=${yawBehavior}&latitude=${latitude}&longitude=${longitude}&altitude=${altitude}`, {
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
            console.log(`DoOrbit command sent successfully to drone on port ${port}`);
        })
        .catch(error => {
            console.error('Error in sending DoOrbit command:', error);
        });
    };

    return (
        <Section>
            <h3>Do Orbit</h3>
            <Input
                type="text"
                value={radius}
                onChange={e => setRadius(e.target.value)}
                placeholder="Radius (meters)"
            />
            <Input
                type="text"
                value={velocity}
                onChange={e => setVelocity(e.target.value)}
                placeholder="Velocity (m/s)"
            />
            <Input
                type="text"
                value={yawBehavior}
                onChange={e => setYawBehavior(e.target.value)}
                placeholder="Yaw Behavior (0-4)"
            />
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
                placeholder="Altitude (meters)"
            />
            <Button onClick={handleDoOrbit}>Do Orbit</Button>
        </Section>
    );
}

export default DoOrbitButton;
