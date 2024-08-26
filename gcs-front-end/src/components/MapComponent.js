// MapComponent.js

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png'; // Retina marker

const defaultPosition = [51.505, -0.09]; // Default starting position

const MapComponent = () => {
  const [gpsPos, setGpsPos] = useState(defaultPosition);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8081/gps");
        if (res.ok) {
          const data = await res.json();
          if (typeof data.latitude_deg === 'number' && typeof data.longitude_deg === 'number' &&
              data.latitude_deg !== 0 && data.longitude_deg !== 0) {
            console.log("Valid GPS Data:", data); // Debugging line
            setGpsPos([data.latitude_deg, data.longitude_deg]);
          } else {
            console.warn("Received invalid GPS data:", data);
          }
        } else {
          console.error("Failed to fetch GPS data, response not OK:", res.status);
        }
      } catch (error) {
        console.error("Error fetching GPS data:", error);
      }
    }, 500); // Fetch every 500ms

    return () => clearInterval(timer);
  }, []);

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
    <MapContainer key={gpsPos.toString()} center={gpsPos} zoom={13} style={{ height: '400px', width: '60%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {gpsPos && (
        <Marker position={gpsPos}>
          <Popup>
            Drone is at latitude: {gpsPos[0]}, longitude: {gpsPos[1]}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
};

export default MapComponent;
