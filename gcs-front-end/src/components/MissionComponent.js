import React, { useState } from 'react';

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
    <div>
      <h3>Upload and Start Mission</h3>
      <input type="file" accept=".json" onChange={handleFileChange} />
      <button onClick={handleMissionUpload} disabled={!fileContent}>
        Upload Mission
      </button>
      <button onClick={startMission} disabled={!missionUploaded}>
        Start Mission
      </button>
    </div>
  );
};

export default MissionComponent;
