import React from 'react';
import styled from 'styled-components';

const Button = styled.button`
  color: #34495e;
  font-size: 1em;
  margin: 1em;
  padding: 0.25em 1em;
  border: 2px solid #34495e;
  border-radius: 3px;
  &:hover {
    background-color: lightgray; /* Change background color on hover */
  }
`;

function LandDrone(port) {
    fetch(`http://localhost:${port}/land`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
          if (response.ok) {
              console.log(`Drone on port ${port} is landing.`);
          } else {
              console.error(`Failed to send land command to drone on port ${port}.`);
          }
      })
      .catch(error => {
          console.error('Error sending land command:', error);
      });
}

function LandButton({ port }) {    
    return (
        <div>
            <Button
                onClick={() => LandDrone(port)}>Land Drone</Button>
        </div>
    );
}

export default LandButton;
