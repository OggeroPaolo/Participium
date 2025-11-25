import { useState, useEffect, useActionState, useRef } from "react";
import { Form, Button, Container, Alert } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router";
import { getCategories, createReport } from "../API/API.js";
import L from "leaflet";

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

  const getMapHeight = () => {
    if (typeof window === "undefined") {
      return "400px";
    }
    return window.innerWidth < 768 ? "260px" : "400px";
  };

  const [mapHeight, setMapHeight] = useState(getMapHeight());

  useEffect(() => {
    const handleResize = () => {
      setMapHeight(getMapHeight());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;

      props.setPinpoint({ lat: lat.toFixed(5), lng: lng.toFixed(5) });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    });
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current?.invalidateSize) {
      mapInstanceRef.current.invalidateSize();
    }
  }, [mapHeight]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div ref={mapRef} style={{ height: mapHeight, width: "100%" }} />

      <div className='location-info-box'>
        <strong>Selected location:</strong>
        <div>Lat: {props.propLat}</div>
        <div>Lng: {props.propLng}</div>
      </div>
    </div>
  );
}

export default ReportCreation;
