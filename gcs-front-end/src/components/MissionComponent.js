import React, { useState } from 'react';
import styled from 'styled-components';

const MissionContainer = styled.div`
display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #ccc;
  padding: 5px; /* Further reduce padding */
  margin: 5px;
  border-radius: 5px;
  width: 200px; /* Set a consistent width */
  height: 280px; /* Set a fixed height to make the section shorter */
  overflow-y: auto; /* Ensure content doesn't overflow */
  align-items: center; /* Center content */
  text-align: center; /* Center text */
`;

const FileInputContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1em; /* Add margin for spacing */
  width: 100%;
`;

const FileInput = styled.input`
  width: 100%; /* Make sure the input stretches across the container */
  max-width: 180px; /* Set a max width to prevent it from being too large */
`;

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

const MissionComponent = ({ selectedDronePort }) => {
  const [fileContent, setFileContent] = useState(null);
  const [missionUploaded, setMissionUploaded] = useState(false);

  // Handle file selection and reading
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonContent = JSON.parse(e.target.result);
          setFileContent(jsonContent); // Store the parsed mission
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  // Handle mission upload to the drone
  const handleMissionUpload = async () => {
    if (!fileContent) {
      alert('No mission file uploaded');
      return;
    }

    const response = await fetch(`http://localhost:${selectedDronePort}/upload_mission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mission_plan: fileContent }),
    });

    if (response.ok) {
      console.log('Mission uploaded successfully');
      setMissionUploaded(true);
    } else {
      console.error('Failed to upload mission');
      setMissionUploaded(false);
    }
  };

  // Start the mission after upload
  const startMission = async () => {
    if (!missionUploaded) {
      alert('No mission uploaded to start');
      return;
    }

    const response = await fetch(`http://localhost:${selectedDronePort}/start_mission`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log('Mission started successfully');
    } else {
      console.error('Failed to start mission');
    }
  };

  return (
    <MissionContainer>
      <h3>Upload Mission</h3>
      <FileInputContainer>
        <FileInput type="file" accept=".json" onChange={handleFileChange} />
      </FileInputContainer>
      <Button onClick={handleMissionUpload} disabled={!fileContent}>
        Upload Mission
      </Button>
      <Button onClick={startMission} disabled={!missionUploaded}>
        Start Mission
      </Button>
    </MissionContainer>
  );
};

export default MissionComponent;
