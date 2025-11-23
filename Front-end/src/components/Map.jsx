import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.awesome-markers/dist/leaflet.awesome-markers.css";
import "leaflet.awesome-markers/dist/leaflet.awesome-markers.js";

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

function Map({
  center = [45.0703, 7.6869],
  zoom = 13,
  approvedReports,
  selectedReportID,
  onMarkerSelect,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const clusterGroupRef = useRef(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const markersRef = useRef({});
  const selectedLayerRef = useRef(L.layerGroup());
  const navigate = useNavigate();

  const reportIcon = L.icon({
    iconUrl: "/icons/location-icon.png",
    iconSize: [48, 48],
    iconAnchor: [24, 40],
    popupAnchor: [0, -24],
  });

  const highlightedIcon = L.icon({
    iconUrl: "/icons/selected-location-icon.png",
    iconSize: [58, 58],
    iconAnchor: [29, 48],
    popupAnchor: [0, -30],
  });

  const newReportIcon = L.AwesomeMarkers.icon({
    icon: "plus",
    markerColor: "cadetblue",
    prefix: "fa",
  });

  // let approvedReports = [
  //   { id: 1, title: "Broken Road", username: "Alice", lat: 45.067, lng: 7.682 },
  //   {
  //     id: 2,
  //     title: "Street Flooding",
  //     username: "Bob",
  //     lat: 45.071,
  //     lng: 7.688,
  //   },

  //   // Central Turin - Centro, Porta Nuova, Quadrilatero
  //   {
  //     id: 3,
  //     title: "Damaged Traffic Light",
  //     username: "Carla",
  //     lat: 45.07,
  //     lng: 7.686,
  //   },
  //   {
  //     id: 4,
  //     title: "Potholes in Street",
  //     username: "Davide",
  //     lat: 45.073,
  //     lng: 7.678,
  //   },
  //   {
  //     id: 5,
  //     title: "Trash Overflowing",
  //     username: "Elena",
  //     lat: 45.074,
  //     lng: 7.692,
  //   },
  //   {
  //     id: 6,
  //     title: "Illegal Street Vendors",
  //     username: "Giulia",
  //     lat: 45.071,
  //     lng: 7.686,
  //   },

  //   // San Salvario / Valentino Park
  //   {
  //     id: 7,
  //     title: "Graffiti on Wall",
  //     username: "Marco",
  //     lat: 45.056,
  //     lng: 7.682,
  //   },
  //   {
  //     id: 8,
  //     title: "Fallen Tree Branch",
  //     username: "Luca",
  //     lat: 45.055,
  //     lng: 7.69,
  //   },
  //   { id: 9, title: "Broken Bench", username: "Sara", lat: 45.058, lng: 7.684 },

  //   // Lingotto / Nizza Millefonti
  //   {
  //     id: 10,
  //     title: "Heavy Traffic",
  //     username: "Paolo",
  //     lat: 45.033,
  //     lng: 7.666,
  //   },
  //   {
  //     id: 11,
  //     title: "Blocked Drain",
  //     username: "Valentina",
  //     lat: 45.03,
  //     lng: 7.673,
  //   },
  //   {
  //     id: 12,
  //     title: "Abandoned Scooter",
  //     username: "Roberto",
  //     lat: 45.037,
  //     lng: 7.678,
  //   },

  //   // Mirafiori / Santa Rita
  //   {
  //     id: 13,
  //     title: "Broken Streetlight",
  //     username: "Francesca",
  //     lat: 45.023,
  //     lng: 7.641,
  //   },
  //   {
  //     id: 14,
  //     title: "Abandoned Vehicle",
  //     username: "Anna",
  //     lat: 45.028,
  //     lng: 7.65,
  //   },
  //   {
  //     id: 15,
  //     title: "Noise Complaint",
  //     username: "Stefano",
  //     lat: 45.025,
  //     lng: 7.664,
  //   },

  //   // Aurora / Borgo Dora
  //   {
  //     id: 16,
  //     title: "Public Disturbance",
  //     username: "Enrico",
  //     lat: 45.084,
  //     lng: 7.691,
  //   },
  //   {
  //     id: 17,
  //     title: "Illegal Dumping",
  //     username: "Carolina",
  //     lat: 45.087,
  //     lng: 7.692,
  //   },
  //   {
  //     id: 18,
  //     title: "Street Light Flickering",
  //     username: "Fabio",
  //     lat: 45.082,
  //     lng: 7.703,
  //   },

  //   // Vanchiglia / University Area
  //   {
  //     id: 19,
  //     title: "Crowded Sidewalk",
  //     username: "Irene",
  //     lat: 45.076,
  //     lng: 7.708,
  //   },
  //   {
  //     id: 20,
  //     title: "Loud Construction Noise",
  //     username: "Tommaso",
  //     lat: 45.079,
  //     lng: 7.713,
  //   },
  //   {
  //     id: 21,
  //     title: "Dangerous Crosswalk",
  //     username: "Chiara",
  //     lat: 45.075,
  //     lng: 7.704,
  //   },

  //   // Crocetta / Politecnico Area
  //   {
  //     id: 22,
  //     title: "Overflowing Trash Bin",
  //     username: "Massimo",
  //     lat: 45.063,
  //     lng: 7.656,
  //   },
  //   {
  //     id: 23,
  //     title: "Roadwork Issue",
  //     username: "Alessia",
  //     lat: 45.062,
  //     lng: 7.661,
  //   },
  //   {
  //     id: 24,
  //     title: "Sidewalk Damage",
  //     username: "Matteo",
  //     lat: 45.064,
  //     lng: 7.668,
  //   },
  // ];

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

      // Click handler for map
      mapInstance.on("click", function (e) {
        const { lat, lng } = e.latlng;

        // Update selected point state
        setSelectedPoint({ lat: lat.toFixed(5), lng: lng.toFixed(5) });

        // Remove previous marker
        selectedLayerRef.current.clearLayers();

        // Add new marker
        const newMarker = L.marker([lat, lng], { icon: newReportIcon });
        selectedLayerRef.current.addLayer(newMarker);

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

          L.DomEvent.on(btn, "click", () =>
            navigate("/create-report", { state: { lat, lng } })
          );
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
    // return () => {
    //   if (mapInstanceRef.current) {
    //     mapInstanceRef.current.remove();
    //     mapInstanceRef.current = null;
    //   }
    // };
  }, [center, zoom]);

  // add reports to cluster
  useEffect(() => {
    if (!approvedReports || !clusterGroupRef.current) return;

    const clusterGroup = clusterGroupRef.current;

    // Clear old markers before adding new ones
    clusterGroup.clearLayers();
    markersRef.current = {};

    approvedReports.forEach((report) => {
      if (!report.position?.lat || !report.position?.lng) return;

      const marker = L.marker([report.position.lat, report.position.lng], {
        icon: reportIcon,
      }).bindPopup(
        `<div class="body-font">
            <p class="my-1"><b>${report.title}</b></p>
            <p class="my-1 d-inline reporte-by-size" >Reported by: </p><p class="my-1 d-inline" >${report.reporterName}</p>
            <button class="map-button report-btn">View full report</button>
            </div>`
      );

      marker.on("click", () => {
        if (onMarkerSelect) onMarkerSelect(report.id);
      });

      marker.on("popupopen", (e) => {
        const popupNode = e.popup.getElement();
        const btn = popupNode.querySelector(".report-btn");

        L.DomEvent.on(btn, "click", () => navigate(`/reports/${report.id}`));
      });

      markersRef.current[report.id] = marker;

      clusterGroup.addLayer(marker);
    });
  }, [approvedReports]);

  // highlight / un-highlight markers when selectedReportID changes
  useEffect(() => {
    if (!markersRef.current || !clusterGroupRef.current) return;

    // Remove temporary "new report" marker
    if (currentMarkerRef.current) {
      mapInstanceRef.current.removeLayer(currentMarkerRef.current);
      currentMarkerRef.current = null;
      setSelectedPoint(null);
    }

    // reset all to default icon
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker.setIcon(
        id === String(selectedReportID) ? highlightedIcon : reportIcon
      );
    });

    // center map and open popup on selected marker
    if (selectedReportID && markersRef.current[selectedReportID]) {
      const marker = markersRef.current[selectedReportID];
      const map = mapInstanceRef.current;
      const clusterGroup = clusterGroupRef.current;

      clusterGroup.zoomToShowLayer(marker, () => {
        map.panTo(marker.getLatLng());
        marker.openPopup();
      });
    }
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
