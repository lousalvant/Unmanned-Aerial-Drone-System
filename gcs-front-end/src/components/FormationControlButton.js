import React from 'react';
import styled from 'styled-components';

// Styled button component
const Button = styled.button`
  color: #fff;
  font-size: 0.85em;
  margin: 0.5em;
  padding: 0.4em 0;
  background-color: #3498db;
  border: 1px solid #2980b9;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;

  width: 150px;
  height: 40px;

  &:hover {
    background-color: #2980b9;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.4);
  }

  &:active {
    background-color: #1c5a85;
  }
`;

// Function to start formation control
const startFormationControl = async () => {
    try {
        const response = await fetch("http://localhost:8081/formation_control", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (response.ok) {
            alert("Formation control started successfully.");
        } else {
            const errorText = await response.text(); // Capture backend error details
            console.error("Backend Error:", errorText);
            alert("Failed to start formation control.");
        }
    } catch (error) {
        console.error("Error starting formation control:", error);
        alert("Error starting formation control.");
    }
};

// FormationControlButton Component
const FormationControlButton = () => {
    return (
        <Button onClick={startFormationControl}>Start Formation Control</Button>
    );
};

export default FormationControlButton;
