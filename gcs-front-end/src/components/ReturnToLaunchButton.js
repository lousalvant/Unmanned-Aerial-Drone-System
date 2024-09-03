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

function handleReturnToLaunch() {
    fetch('http://localhost:8081/return_to_launch', {
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
        console.log('ReturnToLaunch command sent successfully');
    })
    .catch(error => {
        console.error('Error in sending ReturnToLaunch command:', error);
    });
}

function ReturnToLaunchButton() {
    return (
        <div>
            <Button onClick={handleReturnToLaunch}>Return to Launch</Button>
        </div>
    );
}

export default ReturnToLaunchButton;
