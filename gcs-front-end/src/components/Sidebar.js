import React from 'react';
import styled from 'styled-components';
import TimeDisplay from './TimeDisplay';

const SidebarContainer = styled.div`
  width: 250px;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  box-shadow: 2px 0px 5px rgba(0,0,0,0.1);
`;

const Title = styled.h1`
  font-size: 1.5em;
  margin-bottom: 2em;
`;

const MenuButton = styled.button`
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  background-color: #34495e;
  border: none;
  color: white;
  text-align: center;
  font-size: 1em;
  border-radius: 5px;
  cursor: pointer;
  &:hover {
    background-color: #1abc9c;
  }
`;

function Sidebar() {
  return (
    <SidebarContainer>
      <Title>Drone Dashboard</Title>
      <TimeDisplay />
      <MenuButton>Overview</MenuButton>
      <MenuButton>Documentation</MenuButton>
      <MenuButton>About</MenuButton>
    </SidebarContainer>
  );
}

export default Sidebar;
