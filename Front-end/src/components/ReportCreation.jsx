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
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [pics, setPics] = useState([]);

  const [pinpoint, setPinpoint] = useState({
    lat: initialLat.toFixed(5),
    lng: initialLng.toFixed(5),
  });

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

  const [state, formAction] = useActionState(submitReport, {
    title: "",
    description: "",
    category: "",
    photos: [],
  });

  async function submitReport(prevData, formData) {
    setIsFormLoading(true);

    const attributes = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      photos: formData.getAll("photos"),
    };

    try {
      if (attributes.photos[0].size === 0) {
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
      return { error: error.message };
    } finally {
      setIsFormLoading(false);
    }
  }

  // function for image preview
  function handleImageChange(e) {
    const incomingFiles = Array.from(e.target.files);

    // if more than 3 photos are added
    if (pics.length + incomingFiles.length > 3) {
      alert("You can only upload a maximum of 3 images.");

      e.target.value = null; // reset file input
      return;
    }

    const updatedPics = [...pics, ...incomingFiles];
    setPics(updatedPics);

    const previews = updatedPics.slice(0, 3).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviewImages(previews);
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

            {state.error && <Alert variant='danger'>{state.error}</Alert>}
            {state.success && (
              <Alert variant='success' className='mt-4'>
                {state.success}
              </Alert>
            )}
            {isFormLoading && (
              <>
                <div
                  className='d-flex justify-content-center align-items-center'
                  style={{ minHeight: "10vh" }}
                >
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              </>
            )}

            <Button type='submit' className='mt-4 confirm-button w-100'>
              CREATE REPORT
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
  const [address, setAddress] = useState('Loading address...');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Get initial address
  useEffect(() => {
    const getAddress = async () => {
      setIsGeocoding(true);
      const addr = await reverseGeocode(parseFloat(props.propLat), parseFloat(props.propLng));
      setAddress(addr);
      setIsGeocoding(false);
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

      props.setPinpoint({ lat: lat.toFixed(5), lng: lng.toFixed(5) });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }

      // Update address
      setIsGeocoding(true);
      setAddress('Loading address...');
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setIsGeocoding(false);
    });
  }, []);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={mapRef} style={{ height: "400px", width: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          padding: "10px",
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          zIndex: 1000,
          fontSize: "14px",
          maxWidth: "250px",
        }}
      >
        <strong>Selected location:</strong>
        <div style={{ marginTop: "5px", color: "#555" }}>
          {isGeocoding ? (
            <span>
              <i className="spinner-border spinner-border-sm me-2"></i>
              Loading...
            </span>
          ) : (
            address
          )}
        </div>
        <div style={{ fontSize: "11px", color: "#999", marginTop: "5px" }}>
          {props.propLat}, {props.propLng}
        </div>
      </div>
    </div>
  );
}

export default ReportCreation;
