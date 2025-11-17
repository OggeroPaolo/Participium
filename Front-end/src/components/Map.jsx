import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router";

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function Map({ center = [45.0703, 7.6869], zoom = 13 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize map only once
    if (!mapInstanceRef.current && mapRef.current) {
      const mapInstance = L.map(mapRef.current, {
        preferCanvas: false,
        zoomControl: true,
      }).setView(center, zoom);

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance);

      // Click handler for map
      mapInstance.on("click", function (e) {
        const { lat, lng } = e.latlng;

        // Update selected point state
        setSelectedPoint({ lat: lat.toFixed(5), lng: lng.toFixed(5) });

        // Remove previous marker
        if (currentMarkerRef.current) {
          mapInstance.removeLayer(currentMarkerRef.current);
        }

        // Add new marker
        const newMarker = L.marker([lat, lng]).addTo(mapInstance);
        newMarker.bindPopup(
          `<div class="body-font">
            <b>Selected Point</b><br>
            Lat: ${lat.toFixed(5)}<br>
            Lng: ${lng.toFixed(5)}<br>
            <button class="map-button report-btn">Create a new report</button>
            </div>`
        );

        newMarker.on("popupopen", (e) => {
          const popupNode = e.popup.getElement();
          const btn = popupNode.querySelector(".report-btn");

          L.DomEvent.on(btn, "click", () => navigate("/create-report"));
        });

        newMarker.openPopup();

        currentMarkerRef.current = newMarker;
      });

      mapInstanceRef.current = mapInstance;

      // Ensure proper rendering
      setTimeout(() => {
        if (mapInstance && mapInstance.invalidateSize) {
          mapInstance.invalidateSize();
        }
      }, 100);
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "500px",
          border: "1px solid #000000ff",
          borderRadius: "4px",
        }}
      />

      {selectedPoint && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "white",
            padding: "10px 15px",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 1000,
            fontSize: "14px",
          }}
        >
          <strong>Selected Location:</strong>
          <div>Lat: {selectedPoint.lat}</div>
          <div>Lng: {selectedPoint.lng}</div>
        </div>
      )}
    </div>
  );
}

export default Map;
