import React, { useState } from 'react';
import styled from 'styled-components';

const MissionContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #ccc;
  padding: 5px;
  margin: 5px;
  border-radius: 5px;
  width: 200px;
  height: 280px;
  overflow-y: auto;
  text-align: center;
`;

const FileInputContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 1em;
  width: 100%;
`;

const FileInput = styled.input`
  width: 100%;
  max-width: 180px;
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

const MissionComponent = ({ sendCommandToDrones }) => {
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
          setFileContent(jsonContent);
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  // Handle mission upload
  const handleMissionUpload = async (port) => {
    if (!fileContent) {
      alert('No mission file uploaded');
      return;
    }

    const response = await fetch(`http://localhost:${port}/upload_mission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mission_plan: fileContent }),
    });

    if (response.ok) {
      console.log(`Mission uploaded successfully to drone on port ${port}`);
      setMissionUploaded(true);
    } else {
      console.error(`Failed to upload mission to drone on port ${port}`);
      setMissionUploaded(false);
    }
  };

  // Start the mission
  const startMission = async (port) => {
    if (!missionUploaded) {
      alert('No mission uploaded to start');
      return;
    }

    const response = await fetch(`http://localhost:${port}/start_mission`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      console.log(`Mission started successfully on drone on port ${port}`);
    } else {
      console.error(`Failed to start mission on drone on port ${port}`);
    }
  };

  return (
    <MissionContainer>
      <h3>Upload Mission</h3>
      <FileInputContainer>
        <FileInput type="file" accept=".json" onChange={handleFileChange} />
      </FileInputContainer>
      <Button onClick={() => sendCommandToDrones(handleMissionUpload)} disabled={!fileContent}>
        Upload Mission
      </Button>
      <Button onClick={() => sendCommandToDrones(startMission)} disabled={!missionUploaded}>
        Start Mission
      </Button>
    </MissionContainer>
  );
};

export default MissionComponent;
