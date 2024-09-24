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

function ArmDrone(port) {
    fetch(`http://localhost:${port}/arm`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
}

function ArmButton({ port }) {
    return (
        <div>
            <Button
                onClick={() => ArmDrone(port)}>Arm Drone</Button>
        </div>
    );
}

export default ArmButton;
