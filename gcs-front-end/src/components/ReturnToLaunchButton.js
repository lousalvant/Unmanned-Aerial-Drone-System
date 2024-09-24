import React from 'react';
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

function ReturnToLaunchButton({ port }) {
    const handleReturnToLaunch = () => {
        fetch(`http://localhost:${port}/return_to_launch`, {
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
            console.log(`ReturnToLaunch command sent successfully to drone on port ${port}`);
        })
        .catch(error => {
            console.error('Error in sending ReturnToLaunch command:', error);
        });
    };

    return (
        <div>
            <Button onClick={handleReturnToLaunch}>Return to Launch</Button>
        </div>
    );
}

export default ReturnToLaunchButton;
