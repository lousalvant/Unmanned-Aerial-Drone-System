import React from 'react';
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

function HoldButton({ sendCommandToDrones }) {
  const handleHoldCommand = (port) => {
    fetch(`http://localhost:${port}/hold`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Hold command failed on port ${port}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log(`Hold command response for drone on port ${port}:`, data);
    })
    .catch(error => {
      console.error('Error in sending Hold command:', error);
    });
  };

  return (
    <Button onClick={() => sendCommandToDrones(handleHoldCommand)}>Hold</Button>
  );
}

export default HoldButton;
