import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const FeedbackContainer = styled.div`
  margin-bottom: 1em;
  padding: 1em;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
  height: 200px;
  overflow-y: auto; /* Scroll for long feedback */
`;

const DroneFeedback = ({ port }) => {
  const [feedback, setFeedback] = useState([]);
  
  useEffect(() => {
    // Function to fetch the latest logs from the REST API
    const fetchLogs = async () => {
      try {
        const response = await fetch(`http://localhost:${port}/logs`);
        if (response.ok) {
          const data = await response.json();

          // Only update feedback if the new logs are different from the current logs
          if (JSON.stringify(data) !== JSON.stringify(feedback)) {
            setFeedback(data);
          }
        } else {
          console.error("Failed to fetch logs");
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchLogs, 2000);

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [port, feedback]); // Only re-run if feedback or port changes

  return (
    <FeedbackContainer>
      <h3>Drone (Port {port}) Logs:</h3>
      {feedback.length === 0 ? (
        <p>No logs available yet.</p>
      ) : (
        feedback.map((log, index) => <p key={index}>{log}</p>)
      )}
    </FeedbackContainer>
  );
};

export default DroneFeedback;
