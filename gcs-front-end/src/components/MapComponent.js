import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png'; // Retina marker

const defaultPosition = [51.505, -0.09]; // Default starting position

// Component for displaying markers of each drone
const DroneMarker = ({ position, droneId }) => {
  const map = useMap(); // Get the map instance
  useEffect(() => {
    if (position) {
      map.setView(position); // Update the map center
    }
  }, [position, map]);

  return (
    <Marker position={position}>
      <Popup>
        Drone {droneId} is at latitude: {position[0]}, longitude: {position[1]}
      </Popup>
    </Marker>
  );
};

const MapComponent = ({ ports }) => {
  const [gpsPositions, setGpsPositions] = useState(
    ports.map(() => defaultPosition) // Initialize positions to default
  );

  useEffect(() => {
    const fetchGpsData = async (port, index) => {
      try {
        const res = await fetch(`http://localhost:${port}/gps`);
        if (res.ok) {
          const data = await res.json();
          if (typeof data.latitude_deg === 'number' && typeof data.longitude_deg === 'number' &&
              data.latitude_deg !== 0 && data.longitude_deg !== 0) {
            setGpsPositions(prevPositions => {
              const newPositions = [...prevPositions];
              newPositions[index] = [data.latitude_deg, data.longitude_deg];
              return newPositions;
            });
          } else {
            console.warn(`Received invalid GPS data from port ${port}:`, data);
          }
        } else {
          console.error(`Failed to fetch GPS data from port ${port}, response not OK:`, res.status);
        }
      } catch (error) {
        console.error(`Error fetching GPS data from port ${port}:`, error);
      }
    };

    const timers = ports.map((port, index) => 
      setInterval(() => {
        fetchGpsData(port, index);
      }, 500)
    );

    return () => timers.forEach(clearInterval);
  }, [ports]);

  // Fix marker icon issues with Leaflet in React
  const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41], // Size of the icon
    iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
    popupAnchor: [1, -34], // Point from which the popup should open relative to the iconAnchor
    shadowSize: [41, 41] // Size of the shadow
  });

  L.Marker.prototype.options.icon = DefaultIcon;

  return (
    <MapContainer center={defaultPosition} zoom={14} style={{ height: '300px', width: '300px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {gpsPositions.map((position, index) => (
        <DroneMarker key={index} position={position} droneId={index + 1} />
      ))}
    </MapContainer>
  );
};

export default MapComponent;
