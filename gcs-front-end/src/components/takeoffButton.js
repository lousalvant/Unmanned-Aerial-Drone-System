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

function TakeoffDrone(port) {
    fetch(`http://localhost:${port}/takeoff`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
          if (response.ok) {
              console.log(`Drone on port ${port} is taking off.`);
          } else {
              console.error(`Failed to send takeoff command to drone on port ${port}.`);
          }
      })
      .catch(error => {
          console.error('Error sending takeoff command:', error);
      });
}

function TakeoffButton({ port }) {    
    return (
        <div>
            <Button
                onClick={() => TakeoffDrone(port)}>Takeoff Drone</Button>
        </div>
    );
}

export default TakeoffButton;
