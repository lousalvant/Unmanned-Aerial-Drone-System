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

function ArmDrone(port) {
    fetch(`http://localhost:${port}/arm`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
}

function ArmButton({ sendCommandToDrones }) {
  return (
      <div>
          <Button
              onClick={() => sendCommandToDrones(ArmDrone)}>Arm</Button>
      </div>
  );
}

export default ArmButton;
