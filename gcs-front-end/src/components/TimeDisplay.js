import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const TimeContainer = styled.div`
  font-size: 1.2em;
  margin-bottom: 1em;
  color: #ecf0f1;
`;

function TimeDisplay() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000); // Update every second

        return () => clearInterval(timer); // Cleanup the interval on component unmount
    }, []);

    const formattedTime = time.toLocaleTimeString(); // Format the time to a human-readable string

    return (
        <TimeContainer>
            {formattedTime}
        </TimeContainer>
    );
}

export default TimeDisplay;
