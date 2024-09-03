import React from 'react';
import styled from 'styled-components';

const Button = styled.button`
  color: darkred;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid darkred;
  border-radius: 3px;
`;

function DisarmDrone(port) {
    fetch(`http://localhost:${port}/disarm`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    })
    .then(response => {
        if (response.ok) {
            console.log(`Drone on port ${port} is disarming.`);
        } else {
            console.error(`Failed to send disarm command to drone on port ${port}.`);
        }
    })
    .catch(error => {
        console.error('Error sending disarm command:', error);
    });
}

function DisarmButton({ port }) {
    return (
        <div>
            <Button
                onClick={() => DisarmDrone(port)}>Disarm Drone</Button>
        </div>
    );
}

export default DisarmButton;
