import { useState, useEffect, useActionState, useRef } from "react";
import { Form, Button, Container, Alert } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router";
import { getCategories, createReport } from "../API/API.js";
import L from "leaflet";
import { reverseGeocode } from "../utils/geocoding";

function ReportCreation() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialLat = location.state?.lat || 45.0703;
  const initialLng = location.state?.lng || 7.6869;

  const [categories, setCategories] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [pics, setPics] = useState([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [address, setAddress] = useState("Loading address...");

  const [pinpoint, setPinpoint] = useState({
    lat: initialLat.toFixed(5),
    lng: initialLng.toFixed(5),
  });
  const [isValidLocation, setIsValidLocation] = useState(true);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadCategories = async () => {
      const categoryList = await getCategories();
      setCategories(categoryList);
    };

    loadCategories();
  }, []);

  // clean up preview URLs of images
  useEffect(() => {
    return () => {
      previewImages.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, [previewImages]);

  const [state, formAction, isPending] = useActionState(submitReport, {
    title: "",
    description: "",
    category: "",
    photos: [],
    is_anonymous: false,
    address: "",
  });

  async function submitReport(prevData, formData) {
    const attributes = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      photos: pics,
      is_anonymous: isAnonymous,
      address: address,
    };

    try {
      if (!attributes.photos || attributes.photos.length === 0) {
        throw new Error("Please upload at least one photo.");
      }

      await createReport(attributes, pinpoint.lat, pinpoint.lng);
      setTimeout(() => {
        navigate("/");
      }, 2500);
      return {
        success: "Report created successfully! Redirecting to homepage...",
      };
    } catch (error) {
      setPics([]);
      setPreviewImages([]);
      setIsAnonymous(false);
      return { error: error.message };
    }
  }

  // function for image preview and number of pictures
  function handleImageChange(e) {
    const incomingFiles = Array.from(e.target.files);

    // if more than 3 photos are added
    if (pics.length + incomingFiles.length > 3) {
      alert("You can only upload a maximum of 3 images.");

      if (fileInputRef.current) fileInputRef.current.value = null;
      return;
    }

    const updatedPics = [...pics, ...incomingFiles];
    setPics(updatedPics);

    const previews = updatedPics.slice(0, 3).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviewImages(previews);

    if (fileInputRef.current) fileInputRef.current.value = null;
  }

  return (
    <>
      <Container
        fluid
        className='mt-3 ms-1 me-1 d-flex justify-content-center body-font'
      >
        <Container className='p-4' style={{ maxWidth: "800px" }}>
          <h3 className='mb-3'>
            <b>Create a new report</b>
          </h3>
          <MapReport
            propLat={pinpoint.lat}
            propLng={pinpoint.lng}
            setPinpoint={setPinpoint}
            setIsValidLocation={setIsValidLocation}
            setAddress={setAddress}
          />
          <Form action={formAction}>
            <Form.Group controlId='title' className='mb-3 mt-4'>
              <Form.Label>
                <b>Title</b>
              </Form.Label>
              <Form.Control type='text' name='title' required />
            </Form.Group>
            <Form.Group controlId='description' className='mb-3'>
              <Form.Label>
                <b>Description</b>
              </Form.Label>
              <Form.Control type='text' name='description' required />
            </Form.Group>
            <Form.Group controlId='category' className='mb-3'>
              <Form.Label>
                <b>Category</b>
              </Form.Label>
              <Form.Select name='category' required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className='mb-3'>
              <Form.Label>
                <b>Upload a picture (max 3)</b>
              </Form.Label>
              <Form.Control
                type='file'
                name='photos'
                multiple
                onChange={handleImageChange}
                id='photo-input'
                accept='image/*'
                style={{ display: "none" }}
                ref={fileInputRef}
              />
              <Button
                onClick={() => document.getElementById("photo-input").click()}
                className='w-100 select-ph-btn'
              >
                SELECT PHOTOS
              </Button>
              <div className='d-flex gap-3 flex-wrap mt-3'>
                {previewImages.map((img, index) => (
                  <img
                    className='img-preview'
                    key={index}
                    src={img.url}
                    alt='preview'
                  />
                ))}
              </div>
            </Form.Group>
            <Form.Group className='mb-3 anonymous-switch-group' controlId='isAnonymous'>
              <Form.Check
                type='switch'
                id='anonymous-switch'
                label={<strong className='anonymous-label'>I want to be anonymous</strong>}
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className='anonymous-switch-control'
              />
              <Form.Text className='text-muted anonymous-help-text'>
                Your name will not be visible to other users
              </Form.Text>
            </Form.Group>

            {!isValidLocation && (
              <Alert variant='warning'>
                <i className='bi bi-exclamation-triangle-fill me-2'></i>
                <strong>Location outside Torino!</strong> Please select a
                location within Torino city limits.
              </Alert>
            )}

            {state.error && <Alert variant='danger'>{state.error}</Alert>}
            {state.success && (
              <Alert variant='success' className='mt-4'>
                {state.success}
              </Alert>
            )}
            {isPending && (
              <div className='loading-overlay'>
                <div
                  className='spinner-border text-light'
                  style={{ width: "3rem", height: "3rem" }}
                ></div>
                <div className='mt-3 text-light fw-semibold'>
                  Creating report...
                </div>
              </div>
            )}

            <Button
              type='submit'
              className='mt-4 confirm-button w-100'
              disabled={!isValidLocation || isPending}
            >
              {!isValidLocation
                ? "INVALID LOCATION - SELECT WITHIN TORINO"
                : "CREATE REPORT"}
            </Button>
          </Form>
        </Container>
      </Container>
    </>
  );
}

function MapReport(props) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [address, setAddress] = useState("Loading address...");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isValidLocation, setIsValidLocation] = useState(true);

  // Get initial address and validate location
  useEffect(() => {
    const getAddress = async () => {
      setIsGeocoding(true);
      try {
        const addr = await reverseGeocode(
          parseFloat(props.propLat),
          parseFloat(props.propLng)
        );
        setAddress(addr);
        props.setAddress?.(addr);

        // Validate location is in Torino
        const isTorino =
          addr.toLowerCase().includes("torino") ||
          addr.toLowerCase().includes("turin") ||
          addr.toLowerCase().includes("to,");
        setIsValidLocation(isTorino);

        // Update parent component
        if (props.setIsValidLocation) {
          props.setIsValidLocation(isTorino);
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
        setAddress("Failed to load address");
        props.setAddress?.("Failed to load address");
        setIsValidLocation(false);
        if (props.setIsValidLocation) {
          props.setIsValidLocation(false);
        }
      } finally {
        setIsGeocoding(false);
      }
    };
    getAddress();
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // initialize map
    const map = L.map(mapRef.current).setView(
      [props.propLat, props.propLng],
      16
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // starting marker
    const marker = L.marker([props.propLat, props.propLng], {
      icon: L.icon({
        iconUrl: "/icons/red-plus-icon.png",
        iconSize: [48, 48],
        iconAnchor: [24, 40],
      }),
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // allow user to modify location
    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;

      // Update marker immediately (responsive)
      props.setPinpoint({ lat: lat.toFixed(5), lng: lng.toFixed(5) });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }

      // Validate location and update address
      setIsGeocoding(true);
      setAddress("Verifying location...");
      props.setAddress?.("Verifying location...");

      try {
        const addr = await reverseGeocode(lat, lng);
        setAddress(addr);
        props.setAddress?.(addr);

        // Check if location is in Torino
        const isTorino =
          addr.toLowerCase().includes("torino") ||
          addr.toLowerCase().includes("turin") ||
          addr.toLowerCase().includes("to,");
        setIsValidLocation(isTorino);

        // Update parent component
        if (props.setIsValidLocation) {
          props.setIsValidLocation(isTorino);
        }
      } catch (error) {
        console.error("Geocoding failed:", error);
        setAddress("Failed to verify location");
        props.setAddress?.("Failed to verify location");
        setIsValidLocation(false);
        if (props.setIsValidLocation) {
          props.setIsValidLocation(false);
        }
      } finally {
        setIsGeocoding(false);
      }
    });
  }, []);

  //add city border to map
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    async function loadGeoJSON() {
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
      } catch (err) {
        console.error("Failed loading GeoJSON", err);
      }
    }

    loadGeoJSON();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        ref={mapRef}
        className='report-creation-map'
        style={{ height: "400px", width: "100%" }}
      />

      <div
        className='location-info-box'
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          padding: "10px",
          background: isValidLocation ? "#fff" : "#fff3cd",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          zIndex: 1000,
          fontSize: "14px",
          maxWidth: "250px",
          border: isValidLocation ? "none" : "2px solid #ffc107",
        }}
      >
        <strong>
          <i className='bi bi-exclamation-triangle-fill me-2'></i>
          {isValidLocation ? "Selected location:" : "Invalid Location"}
        </strong>
        <div
          style={{
            marginTop: "5px",
            color: isValidLocation ? "#555" : "#856404",
          }}
        >
          {isGeocoding ? (
            <span>
              <i className='spinner-border spinner-border-sm me-2'></i>
              Loading...
            </span>
          ) : (
            address
          )}
        </div>
        {!isValidLocation && !isGeocoding && (
          <div
            style={{
              fontSize: "12px",
              color: "#dc3545",
              marginTop: "5px",
              fontWeight: "500",
            }}
          >
            Location must be within Torino
          </div>
        )}
        <div style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>
          {props.propLat}, {props.propLng}
        </div>
      </div>
    </div>
  );
}

export default ReportCreation;
