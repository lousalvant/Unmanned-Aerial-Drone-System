import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const FeedbackContainer = styled.div`
  margin-bottom: 1em;
  padding: 0;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
  height: ${({ isVisible }) => (isVisible ? '200px' : '0')}; /* Collapse if hidden */
  width: 400px; /* Fixed width */
  overflow-y: ${({ isVisible }) => (isVisible ? 'auto' : 'hidden')}; /* Enable scroll only if visible */
  font-size: 0.8em;
  position: relative;
  transition: height 0.3s ease; /* Smooth transition */
`;

const Logs = styled.div`
  padding: 10px;
  font-size: 0.9em;
`;

const Header = styled.h3`
  position: sticky;
  top: 0;
  background-color: #f9f9f9;
  padding: 8px;
  margin: 0;
  border-bottom: 1px solid #ccc;
  text-align: center;
  font-size: 0.9em;
  z-index: 1; /* Keep the header above the logs */
  height: 10px; /* Set a consistent height for the header */
`;

const DroneFeedback = ({ port, isVisible }) => {
  const [feedback, setFeedback] = useState([]);
  const feedbackRef = useRef(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`http://localhost:${port}/logs`);
        if (response.ok) {
          const data = await response.json();
          if (JSON.stringify(data) !== JSON.stringify(feedback)) {
            setFeedback(data);
          }
        } else {
          console.error('Failed to fetch logs');
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };

    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval); // Cleanup on component unmount
  }, [port, feedback]);

  useEffect(() => {
    if (feedbackRef.current && isVisible) {
      feedbackRef.current.scrollTop = feedbackRef.current.scrollHeight;
    }
  }, [feedback, isVisible]);

  return (
    <FeedbackContainer ref={feedbackRef} isVisible={isVisible}>
      <Header>Drone (Port {port}) Logs:</Header>
      <Logs>
        {feedback.length === 0 ? (
          <p>No logs available yet.</p>
        ) : (
          feedback.map((log, index) => <p key={index}>{log}</p>)
        )}
      </Logs>
    </FeedbackContainer>
  );
};

export default DroneFeedback;
