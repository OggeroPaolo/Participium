import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.awesome-markers/dist/leaflet.awesome-markers.css";
import "leaflet.awesome-markers/dist/leaflet.awesome-markers.js";
import { reverseGeocode } from "../utils/geocoding";
import PropTypes from "prop-types";

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

function CityMap({
  center = [45.0703, 7.6869],
  zoom = 13,
  approvedReports,
  showUserReports,
  userReports,
  selectedReportID,
  onMarkerSelect,
  isAuthenticated,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const cityBorderRef = useRef(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const markersRef = useRef({});
  const selectedLayerRef = useRef(L.layerGroup());
  const navigate = useNavigate();
  const centerLat = Array.isArray(center) ? center[0] : 45.0703;
  const centerLng = Array.isArray(center) ? center[1] : 7.6869;

  const reportIcon = L.icon({
    iconUrl: "/icons/light-blue-location-icon.png",
    iconSize: [48, 48],
    iconAnchor: [24, 40],
    popupAnchor: [0, -24],
  });

  const highlightedIcon = L.icon({
    iconUrl: "/icons/dark-blue-location-icon.png",
    iconSize: [58, 58],
    iconAnchor: [29, 48],
    popupAnchor: [0, -30],
  });

  const newReportIcon = L.icon({
    iconUrl: "/icons/red-plus-icon.png",
    iconSize: [58, 58],
    iconAnchor: [29, 48],
    popupAnchor: [0, -30],
  });

  // ========= HELPERS =========
  const resetSelectedPoint = () => {
    selectedLayerRef.current.clearLayers();
    currentMarkerRef.current = null;
    setSelectedPoint(null);
  };

  const createNewReportMarker = (lat, lng) => {
    // Add new marker immediately (responsive feel)
    const marker = L.marker([lat, lng], { icon: newReportIcon });
    selectedLayerRef.current.addLayer(marker);

    // Initial popup with loading state
    marker.bindPopup(
      `<div class="body-font">
            <b>Selected Location</b><br>
            <span id="address-text">Verifying location...</span><br>
            <button class="map-button report-btn" disabled style="opacity: 0.5; cursor: not-allowed;">Verifying...</button>
            </div>`
    );

    marker.openPopup();
    currentMarkerRef.current = marker;
    return marker;
  };

  const attachCreateReportButton = (marker, lat, lng) => {
    // timeout per assicurarsi che il DOM sia pronto
    setTimeout(() => {
      const popupNode = marker.getPopup()?.getElement();
      if (!popupNode) return;

      const btn = popupNode.querySelector(".report-btn");
      if (!btn) return;

      const action = btn.dataset.action;

      L.DomEvent.on(btn, "click", () => {
        if (action === "create") {
          navigate("/create-report", { state: { lat, lng } });
        } else {
          navigate("/login");
        }
      });
    }, 100);
  };

  const setPopupLocationValid = (marker, address, lat, lng) => {
    marker.setPopupContent(
      `<div class="body-font">
        <b>Selected Location</b><br>
        ${address}<br>
        <button class="map-button report-btn"
        data-action="${isAuthenticated ? "create" : "login"}">${
        isAuthenticated ? "Create a new report" : "Login to create reports"
      }</button>
      </div>`
    );
    // Re-attach button listener
    attachCreateReportButton(marker, lat, lng);
  };

  const setPopupLocationOutsideTorino = (marker, address) => {
    marker.setPopupContent(
      `<div class="body-font">
          <b> Location Outside Torino</b><br>
          ${address}<br>
          <small style="color: #dc3545;">Reports can only be created within Torino city limits.</small><br>
          <button class="map-button" disabled style="opacity: 0.5; cursor: not-allowed; margin-top: 8px;">Cannot create report here</button>
      </div>`
    );
  };

  const setPopupGeocodingError = (marker, lat, lng) => {
    marker.setPopupContent(
      `<div class="body-font">
        <b> Verification Failed</b><br>
        ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
        <small style="color: #dc3545;">Could not verify location. Please try again.</small><br>
        <button class="map-button" disabled style="opacity: 0.5; cursor: not-allowed; margin-top: 8px;">Cannot create report</button>
      </div>`
    );
  };

  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;

    // Store coordinates immediately
    setSelectedPoint({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
    setIsGeocoding(true);
    setSelectedAddress("Loading address...");

    // Remove previous marker
    selectedLayerRef.current.clearLayers();

    // Add new marker immediately (responsive feel)
    const marker = createNewReportMarker(lat, lng);

    // Get human-readable address and validate in background
    try {
      const address = await reverseGeocode(lat, lng);
      const lower = address.toLowerCase();
      // Check if address contains Torino/Turin/TO
      const isTorino =
        lower.includes("torino") ||
        lower.includes("turin") ||
        lower.includes("to,");

      setSelectedAddress(address);
      setIsGeocoding(false);

      if (!marker.getPopup()) return;

      if (isTorino) {
        // Location valid - enable button
        setPopupLocationValid(marker, address, lat, lng);
        return;
      }

      // Location outside Torino - show error, disable button
      setPopupLocationOutsideTorino(marker, address);
    } catch (error) {
      console.error("Geocoding failed:", error);
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setIsGeocoding(false);

      // Show error in popup
      if (!marker.getPopup()) return;
      setPopupGeocodingError(marker, lat, lng);
    }
  };

  const handleReportPopupOpen = (e, reportId) => {
    setTimeout(() => {
      const popupNode = e.popup.getElement();
      if (!popupNode) return;

      const btn = popupNode.querySelector(".report-btn");
      if (!btn) return;

      const btnClone = btn.cloneNode(true);
      btn.parentNode.replaceChild(btnClone, btn);
      L.DomEvent.on(btnClone, "click", () => navigate(`/reports/${reportId}`));
    }, 0);
  };

  const addReportMarkerToCluster = (clusterGroup, report) => {
    if (!report.position?.lat || !report.position?.lng) return;

    const reporter = report.is_anonymous ? "Anonymous" : report.reporterName;

    const marker = L.marker([report.position.lat, report.position.lng], {
      icon: reportIcon,
    }).bindPopup(
      `<div class="body-font">
        <p class="my-1"><b>${report.title}</b></p>
        <p class="my-1 d-inline reporte-by-size">Reported by: </p>
        <p class="my-1 d-inline">${reporter}</p>
        <button class="map-button report-btn">View full report</button>
      </div>`
    );

    marker.on("click", () => {
      if (onMarkerSelect) onMarkerSelect(report.id);
      resetSelectedPoint();
    });

    marker.on("popupopen", (e) => {
      // estraiamo in helper per ridurre annidamento
      handleReportPopupOpen(e, report.id);
    });

    markersRef.current[report.id] = marker;
    clusterGroup.addLayer(marker);
  };

  // ========= EFFECTS =========

  useEffect(() => {
    // Initialize map only once
    if (mapInstanceRef.current || !mapRef.current) return;

    const mapInstance = L.map(mapRef.current, {
      preferCanvas: false,
      zoomControl: true,
    }).setView([centerLat, centerLng], zoom);

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapInstance);

    // add layer for new report selection
    selectedLayerRef.current.addTo(mapInstance);

    // cluster initialization
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: function (zoom) {
        // Larger clusters at low zoom, smaller clusters at high zoom
        return zoom < 10 ? 200 : 120;
      },
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 17,
    });
    clusterGroupRef.current = clusterGroup;
    mapInstance.addLayer(clusterGroup);

    clusterGroup.on("clusterclick", resetSelectedPoint);

    // Click handler for map
    mapInstance.on("click", handleMapClick);

    mapInstanceRef.current = mapInstance;

    // Ensure proper rendering
    setTimeout(() => {
      if (mapInstance && mapInstance.invalidateSize) {
        mapInstance.invalidateSize();
      }
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      clusterGroupRef.current = null;
      markersRef.current = {};
      selectedLayerRef?.current?.clearLayers?.();
      currentMarkerRef.current = null;
    };
  }, [centerLat, centerLng, zoom]);

  //add city border to map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const loadGeoJSON = async () => {
      try {
        const response = await fetch("/turin_geojson.geojson");
        const geojson = await response.json();

        const layer = L.geoJSON(geojson, {
          style: {
            color: "#2886da",
            weight: 2,
            opacity: 0.4,
            fillColor: "#2886da",
            fillOpacity: 0.07,
          },
        }).addTo(mapInstanceRef.current);

        cityBorderRef.current = layer;

        mapInstanceRef.current.fitBounds(layer.getBounds()); //maybe should take the pan to fit the boundary away
      } catch (err) {
        console.error("Failed loading GeoJSON", err);
      }
    };

    loadGeoJSON();
  }, []);

  // Determine which list to use based on the switch state
  const reportsToDisplay = showUserReports ? userReports : approvedReports;

  // Update the cluster whenever the active list changes
  useEffect(() => {
    if (!reportsToDisplay || !clusterGroupRef.current) return;

    const clusterGroup = clusterGroupRef.current;

    // Clear old markers before adding new ones
    clusterGroup.clearLayers();
    markersRef.current = {};

    reportsToDisplay.forEach((report) =>
      addReportMarkerToCluster(clusterGroup, report)
    );

    if (cityBorderRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(cityBorderRef.current.getBounds());
    }


    // Add reportsToDisplay to the dependency array
  }, [reportsToDisplay]);

  // highlight / un-highlight markers when selectedReportID changes
  useEffect(() => {
    if (!markersRef.current || !clusterGroupRef.current) return;

    // reset all to default icon
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.setIcon(
        id === String(selectedReportID) ? highlightedIcon : reportIcon
      );
    });

    // center map and open popup on selected marker
    if (!selectedReportID || !markersRef.current[selectedReportID]) return;

    const marker = markersRef.current[selectedReportID];
    const map = mapInstanceRef.current;
    const clusterGroup = clusterGroupRef.current;

    clusterGroup.zoomToShowLayer(marker, () => {
      map.panTo(marker.getLatLng());
      marker.openPopup();
    });
  }, [selectedReportID]);

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
          className='location-info-box'
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
            maxWidth: "250px",
          }}
        >
          <strong>Selected Location:</strong>
          <div style={{ marginTop: "5px", color: "#555" }}>
            {isGeocoding ? (
              <span>
                <i className='spinner-border spinner-border-sm me-2'></i>{" "}
                Loading address...
              </span>
            ) : (
              selectedAddress || "Unknown location"
            )}
          </div>
          <div style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>
            {selectedPoint.lat}, {selectedPoint.lng}
          </div>
        </div>
      )}
    </div>
  );
}

CityMap.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number), // [lat, lng]
  zoom: PropTypes.number,
  approvedReports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      reporterName: PropTypes.string,
      position: PropTypes.shape({
        lat: PropTypes.number,
        lng: PropTypes.number,
      }),
    })
  ),
  showUserReports: PropTypes.bool,
  userReports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      reporterName: PropTypes.string,
      position: PropTypes.shape({
        lat: PropTypes.number,
        lng: PropTypes.number,
      }),
    })
  ),
  selectedReportID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onMarkerSelect: PropTypes.func,
  isAuthenticated: PropTypes.bool,
};

export default CityMap;
