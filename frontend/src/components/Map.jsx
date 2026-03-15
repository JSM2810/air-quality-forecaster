// src/components/Map.jsx
// Shows Hyderabad on a map with an AQI marker using React-Leaflet

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// AQI color for the circle marker
const getMarkerColor = (aqi) => {
  if (!aqi) return "#6b7280";
  if (aqi <= 50)  return "#22c55e";
  if (aqi <= 100) return "#facc15";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  return "#9333ea";
};

// City coordinates — easy to expand later
const CITIES = [
  { name: "Hyderabad", lat: 17.385, lon: 78.4867 },
];

export default function Map({ cityData }) {
  // cityData = { Hyderabad: 87, ... } — name -> aqi value

  return (
    <div className="rounded-2xl overflow-hidden shadow" style={{ height: "350px" }}>
      <MapContainer
        center={[17.385, 78.4867]}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {CITIES.map((city) => {
          const aqi = cityData?.[city.name];
          const color = getMarkerColor(aqi);
          return (
            <CircleMarker
              key={city.name}
              center={[city.lat, city.lon]}
              radius={aqi ? Math.min(30, 15 + aqi / 10) : 15}
              color={color}
              fillColor={color}
              fillOpacity={0.6}
              weight={2}
            >
              <Popup>
                <strong>{city.name}</strong><br />
                AQI: {aqi ? Math.round(aqi) : "No data"}
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}