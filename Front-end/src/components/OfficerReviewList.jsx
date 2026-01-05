import { useEffect, useState, useRef } from "react";
import {
  Container,
  Card,
  Badge,
  Modal,
  Form,
  Button,
  Spinner,
} from "react-bootstrap";
import {
  getPendingReports,
  reviewReport,
  getCategories,
  getReport,
  getCategoryOperators,
} from "../API/API";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PropTypes from 'prop-types';
import AlertBlock from "./AlertBlock";

function OfficerReviewList() {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [completeReportData, setCompleteReportData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingReportDetails, setIsLoadingReportDetails] = useState(false);
  const [reviewAction, setReviewAction] = useState(""); // 'assigned' or 'rejected'
  const [rejectionNote, setRejectionNote] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [availableOfficers, setAvailableOfficers] = useState([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState(null);
  const [isLoadingOfficers, setIsLoadingOfficers] = useState(false);
  const [officerError, setOfficerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // --- HELPERS ---

  const loadCategories = async () => {
    try {
      const categoryList = await getCategories();
      setCategories(categoryList);

      // Create a map for quick lookup: category_id -> category_name
      const map = {};
      categoryList.forEach((cat) => {
        map[cat.id] = cat.name;
      });
      setCategoryMap(map);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadReports = async () => {
    try {
      const reportList = await getPendingReports();
      setReports(reportList);
    } catch (error) {
      console.error("Failed to load reports:", error);
      setAlert({
        show: true,
        message: "Failed to load reports",
        variant: "danger",
      });
    }
  };

  const loadInitialData = async () => {
    setIsLoadingInitial(true);
    await Promise.all([loadReports(), loadCategories()]);
    setIsLoadingInitial(false);
  };

  const loadOfficersForCategory = async () => {
    if (!showModal || !selectedCategoryId) {
      setAvailableOfficers([]);
      setSelectedOfficerId(null);
      return;
    }

    let isCurrent = true;
    setIsLoadingOfficers(true);
    setOfficerError("");

    try {
      const operators = await getCategoryOperators(selectedCategoryId);
      if (!isCurrent) return;

      setAvailableOfficers(operators);
      setSelectedOfficerId((prev) =>
        operators.some((op) => op.id === prev) ? prev : null
      );
    } catch (error) {
      if (!isCurrent) return;
      setAvailableOfficers([]);
      setSelectedOfficerId(null);
      setOfficerError(error.message || "Failed to load officers for category");
    } finally {
      if (isCurrent) {
        setIsLoadingOfficers(false);
      }
    }

    return () => {
      isCurrent = false;
    };
  };

  const handleReportClick = async (report) => {
    setSelectedReport(report);
    setShowModal(true);
    setReviewAction("");
    setRejectionNote("");
    setSelectedOfficerId(null);
    setAvailableOfficers([]);
    setOfficerError("");
    setIsLoadingReportDetails(true);
    setCompleteReportData(null);

    try {
      const completeReport = await getReport(report.id);
      console.log("Complete report response:", completeReport);
      console.log("Complete report.report:", completeReport.report);

      const reportData = completeReport.report || completeReport;
      setCompleteReportData(reportData);

      const categoryId =
        reportData.category?.id || reportData.category_id || report.category_id;
      console.log("Setting category ID to:", categoryId);
      setSelectedCategoryId(categoryId);
    } catch (error) {
      console.error("Failed to load complete report:", error);
      setAlert({
        show: true,
        message: "Failed to load report details",
        variant: "danger",
      });
      setSelectedCategoryId(report.category_id);
    } finally {
      setIsLoadingReportDetails(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReport(null);
    setCompleteReportData(null);
    setSelectedCategoryId(null);
    setAvailableOfficers([]);
    setSelectedOfficerId(null);
    setOfficerError("");
    setReviewAction("");
    setRejectionNote("");

    // Clean up map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const loadCityBorder = async (mapInstance) => {
    try {
      const response = await fetch("/turin_geojson.geojson");
      const geojson = await response.json();

      L.geoJSON(geojson, {
        style: {
          color: "#2886da",
          weight: 2,
          opacity: 0.4,
          fillColor: "#2886da",
          fillOpacity: 0.07,
        },
      }).addTo(mapInstance);
    } catch (err) {
      console.error("Failed loading GeoJSON", err);
    }
  };

  const initMapForReport = () => {
    // Initialize map when report data is loaded
    if (!completeReportData || !mapRef.current || mapInstanceRef.current) return;

    const { position_lat, position_lng } = completeReportData;
    if (!position_lat || !position_lng) return;

    // Initialize minimal read-only map
    const mapInstance = L.map(mapRef.current, {
      center: [position_lat, position_lng],
      zoom: 15,
      zoomControl: true,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: false,
    });

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapInstance);

    // Add marker at report location (same icon as CitHomepage)
    const reportIcon = L.icon({
      iconUrl: "/icons/light-blue-location-icon.png",
      iconSize: [48, 48],
      iconAnchor: [24, 40],
      popupAnchor: [0, -24],
    });

    L.marker([position_lat, position_lng], { icon: reportIcon }).addTo(
      mapInstance
    );

    mapInstanceRef.current = mapInstance;

    // Ensure proper rendering
    setTimeout(() => {
      if (mapInstance && mapInstance.invalidateSize) {
        mapInstance.invalidateSize();
      }
    }, 100);

    // City border
    loadCityBorder(mapInstance);
  };


  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!reviewAction) {
      setAlert({
        show: true,
        message: "Please select assign or reject",
        variant: "warning",
      });
      return;
    }

    if (reviewAction === "rejected" && !rejectionNote.trim()) {
      setAlert({
        show: true,
        message: "Please provide a note for rejection",
        variant: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await reviewReport(selectedReport.id, {
        status: reviewAction,
        note: reviewAction === "rejected" ? rejectionNote : null,
        categoryId: selectedCategoryId,
        officerId: reviewAction === "assigned" ? selectedOfficerId : null,
      });

      setAlert({
        show: true,
        message: `Report ${reviewAction === "assigned"
          ? "assigned to technical office"
          : "rejected"
          } successfully`,
        variant: "success",
      });

      // Reload reports list
      await loadReports();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to submit review:", error);
      setAlert({ show: true, message: error.message, variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (category) => {
    const colors = {
      "Water Supply – Drinking Water": "primary", // Blue - Water
      "Architectural Barriers": "secondary", // Gray - Infrastructure
      "Sewer System": "info", // Light Blue - Water system
      "Public Lighting": "warning", // Yellow/Orange - Lighting
      "Waste": "success", // Green - Environment
      "Road Signs and Traffic Lights": "danger", // Red - Traffic/Safety
      "Roads and Urban Furnishings": "dark", // Dark Gray - Roads
      "Public Green Areas and Playgrounds": "success", // Green - Nature (grouped with environment)
      "Other": "secondary", // Gray - Misc (grouped with infrastructure)
    };
    return colors[category] || "secondary";
  };


  // -- EFFECTS --

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadOfficersForCategory();
  }, [selectedCategoryId, showModal]);

  useEffect(() => {
    initMapForReport();
  }, [completeReportData]);

  useEffect(() => {
    if (reviewAction !== "assigned") {
      setSelectedOfficerId(null);
    }
  }, [reviewAction]);

  return (
    <Container className='py-4 body-font'>
      <h2 className='mb-4 fw-bold'>Pending Reports Review</h2>
      <AlertBlock alert={alert} onClose={() => setAlert({ ...alert, show: false })} />

      <div className="officer-review-cards">
        <ReportsSection
          isLoadingInitial={isLoadingInitial}
          reports={reports}
          categoryMap={categoryMap}
          getCategoryBadge={getCategoryBadge}
          onReportClick={handleReportClick}
        />
      </div>

      <ReviewModal
        show={showModal}
        onClose={handleCloseModal}
        completeReportData={completeReportData}
        isLoadingReportDetails={isLoadingReportDetails}
        mapRef={mapRef}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        availableOfficers={availableOfficers}
        selectedOfficerId={selectedOfficerId}
        setSelectedOfficerId={setSelectedOfficerId}
        isLoadingOfficers={isLoadingOfficers}
        officerError={officerError}
        reviewAction={reviewAction}
        setReviewAction={setReviewAction}
        rejectionNote={rejectionNote}
        setRejectionNote={setRejectionNote}
        isSubmitting={isSubmitting}
        handleSubmitReview={handleSubmitReview}
        handleImageClick={handleImageClick}
      />

      {/* Image Preview Modal */}
      <Modal
        show={showImageModal}
        onHide={handleCloseImageModal}
        size='xl'
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Photo Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className='text-center'>
          {selectedImage && (
            <img
              src={selectedImage}
              alt='Full size preview'
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

function ReportsSection({
  isLoadingInitial,
  reports,
  categoryMap,
  getCategoryBadge,
  onReportClick,
}) {
  if (isLoadingInitial) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "80vh" }}
      >
        <div className="spinner-border text-primary" aria-hidden="true">
          <output
            aria-live="polite"
            style={{ marginLeft: '0.5rem' }}
          >
            Loading...
          </output>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <i
            className="bi bi-clipboard-check"
            style={{ fontSize: "3rem", color: "#ccc" }}
          ></i>
          <p className="mt-3 mb-0 text-muted">No pending reports to review</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="row g-3">
      {reports.map((report) => (
        <div key={report.id} className="col-12 col-md-6 col-lg-4">
          <Card
            className="shadow-sm report-card h-100"
            onClick={() => onReportClick(report)}
            style={{ cursor: "pointer" }}
          >
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <strong>{report.title}</strong>
                <Badge
                  bg={getCategoryBadge(categoryMap[report.category_id])}
                  className="ms-2"
                >
                  {categoryMap[report.category_id] ||
                    `Category ${report.category_id}`}
                </Badge>
              </div>
              <div className="small mb-2">
                <i className="bi bi-geo-alt-fill text-danger"></i>{" "}
                {report.address}
              </div>
              <div className="small text-muted">
                <i className="bi bi-calendar3"></i>{" "}
                {new Date(report.created_at).toLocaleDateString()}
              </div>
            </Card.Body>
          </Card>
        </div>
      ))}
    </div>
  );
}

function ReviewModal({
  show,
  onClose,
  completeReportData,
  isLoadingReportDetails,
  mapRef,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  availableOfficers,
  selectedOfficerId,
  setSelectedOfficerId,
  isLoadingOfficers,
  officerError,
  reviewAction,
  setReviewAction,
  rejectionNote,
  setRejectionNote,
  isSubmitting,
  handleSubmitReview,
  handleImageClick,
}) {
  return (
    <Modal show={show} onHide={onClose} size='lg' centered>
      <Modal.Header closeButton>
        <Modal.Title>Review Report</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ReviewLoadingOrError
          isLoading={isLoadingReportDetails}
          hasData={!!completeReportData}
        >
          {completeReportData && (
            <ReviewContent
              completeReportData={completeReportData}
              mapRef={mapRef}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
              availableOfficers={availableOfficers}
              selectedOfficerId={selectedOfficerId}
              setSelectedOfficerId={setSelectedOfficerId}
              isLoadingOfficers={isLoadingOfficers}
              officerError={officerError}
              reviewAction={reviewAction}
              setReviewAction={setReviewAction}
              rejectionNote={rejectionNote}
              setRejectionNote={setRejectionNote}
              isSubmitting={isSubmitting}
              handleSubmitReview={handleSubmitReview}
              onClose={onClose}
              handleImageClick={handleImageClick}
            />
          )}

        </ReviewLoadingOrError>
      </Modal.Body>
    </Modal>
  );
}

function ReviewLoadingOrError({ isLoading, hasData, children }) {
  if (isLoading) {
    return (
      <div className='text-center py-5'>
        <Spinner animation='border' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </Spinner>
        <p className='mt-3'>Loading report details...</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className='text-center py-5'>
        <p className='text-muted'>Failed to load report details</p>
      </div>
    );
  }

  return children;
};

function ReviewContent({
  completeReportData,
  mapRef,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  availableOfficers,
  selectedOfficerId,
  setSelectedOfficerId,
  isLoadingOfficers,
  officerError,
  reviewAction,
  setReviewAction,
  rejectionNote,
  setRejectionNote,
  isSubmitting,
  handleSubmitReview,
  onClose,
  handleImageClick,
}) {

  const getSubmitLabel = (reviewAction) => {
    if (reviewAction === 'assigned') {
      return 'Assign Report';
    }
    return 'Reject Report';
  };

  const getOfficerSelectOption = () => {
    if (isLoadingOfficers) {
      return 'Loading available officers...';
    }

    if (availableOfficers.length === 0) {
      return 'No officers available';
    }

    return 'Let system auto-assign';
  };


  return (
    <>
      <h5 className='fw-bold mb-3'>{completeReportData.title}</h5>

      <div className='mb-3'>
        <strong>Description:</strong>
        <p className='mt-2'>{completeReportData.description}</p>
      </div>

      <div className='mb-3'>
        <strong>Location:</strong>
        <p className='mt-1'>
          <i className='bi bi-geo-alt-fill text-danger'></i>{' '}
          {completeReportData.address}
        </p>
        <div
          ref={mapRef}
          className="map-container"
          style={{
            width: '100%',
            height: '250px',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            marginTop: '10px',
          }}
        />
      </div>

      <div className='mb-3'>
        <strong>Reported by:</strong>{' '}
        {completeReportData.user?.username ||
          completeReportData.user?.complete_name ||
          'Unknown'}
      </div>

      <div className='mb-3'>
        <strong>Submitted on:</strong>{' '}
        {new Date(completeReportData.created_at).toLocaleString()}
      </div>

      {completeReportData.photos &&
        completeReportData.photos.length > 0 && (
          <div className='mb-3'>
            <strong>Photos:</strong>
            <div className='d-flex gap-2 mt-2 flex-wrap'>
              {completeReportData.photos.map((photo, index) => (
                <Button
                  key={`${photo.url}-${index}`}
                  variant="link"
                  className="p-0 img-preview-button"
                  onClick={() => handleImageClick(photo.url)}
                  aria-label="Open photo preview"
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={photo.url}
                    alt={`Report ${index + 1}`}
                    className='img-preview'
                    style={{ display: 'block' }}
                  />
                </Button>
              ))}
            </div>
          </div>
        )}

      <div className='mb-3'>
        <strong>Category:</strong>{' '}
        <Form.Select
          value={selectedCategoryId || ''}
          onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
          style={{
            display: 'inline-block',
            width: 'auto',
            padding: '0.25rem 2rem 0.25rem 0.5rem',
            fontSize: '0.9rem',
          }}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Form.Select>
      </div>

      <Form.Group className='mb-3'>
        <Form.Label className='fw-bold'>
          Assign to Officer{' '}
          <span className='fw-normal'>(optional when assigning)</span>
        </Form.Label>
        <Form.Select
          value={selectedOfficerId || ''}
          onChange={(e) =>
            setSelectedOfficerId(
              e.target.value ? Number(e.target.value) : null
            )
          }
          disabled={isLoadingOfficers || availableOfficers.length === 0}
          style={{
            display: 'inline-block',
            width: '100%',
            padding: '0.25rem 2rem 0.25rem 0.5rem',
            fontSize: '0.9rem',
          }}
        >
          <option value=''>
            {getOfficerSelectOption()}
          </option>
          {availableOfficers.map((officer) => {
            const fullName = [officer.first_name, officer.last_name]
              .filter(Boolean)
              .join(' ');
            return (
              <option key={officer.id} value={officer.id}>
                {fullName || officer.username || `Officer #${officer.id}`}
              </option>
            );
          })}
        </Form.Select>
        {officerError && (
          <Form.Text className='text-danger d-block mt-1'>
            {officerError}
          </Form.Text>
        )}
        {!officerError &&
          !isLoadingOfficers &&
          availableOfficers.length === 0 && (
            <Form.Text className='text-muted d-block mt-1'>
              No officers are linked to this category. Leave this empty to let
              the backend auto-assign.
            </Form.Text>
          )}
      </Form.Group>

      <hr />

      <Form onSubmit={handleSubmitReview}>
        <Form.Group className='mb-3'>
          <Form.Label className='fw-bold'>Review Decision</Form.Label>
          <div className='d-flex gap-3'>
            <Form.Check
              type='radio'
              id='assign-radio'
              name='reviewAction'
              label='Assign'
              value='assigned'
              checked={reviewAction === 'assigned'}
              onChange={(e) => setReviewAction(e.target.value)}
            />
            <Form.Check
              type='radio'
              id='reject-radio'
              name='reviewAction'
              label='Reject'
              value='rejected'
              checked={reviewAction === 'rejected'}
              onChange={(e) => setReviewAction(e.target.value)}
            />
          </div>
        </Form.Group>

        {reviewAction === 'rejected' && (
          <Form.Group className='mb-3'>
            <Form.Label className='fw-bold'>Note for Rejection *</Form.Label>
            <Form.Control
              as='textarea'
              rows={3}
              placeholder='Please explain why this report is being rejected...'
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              required
            />
          </Form.Group>
        )}

        <div className='d-flex justify-content-end gap-2 mt-4'>
          <Button
            variant='secondary'
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            variant={reviewAction === 'assigned' ? 'success' : 'danger'}
            disabled={
              isSubmitting ||
              !reviewAction ||
              (reviewAction === 'rejected' && !rejectionNote.trim())
            }
            className='confirm-button'
          >
            {isSubmitting ? (
              <>
                <span className='spinner-border spinner-border-sm me-2' />{' '}
                Submitting...
              </>
            ) : (
              getSubmitLabel(reviewAction)
            )}
          </Button>
        </div>
      </Form>
    </>
  );
}

ReportsSection.propTypes = {
  isLoadingInitial: PropTypes.bool.isRequired,
  reports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      address: PropTypes.string,
      created_at: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]),
      category_id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]),
    })
  ).isRequired,
  categoryMap: PropTypes.objectOf(PropTypes.string).isRequired,
  getCategoryBadge: PropTypes.func.isRequired,
  onReportClick: PropTypes.func.isRequired,
};

ReviewModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  completeReportData: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    address: PropTypes.string,
    is_anonymous: PropTypes.bool,
    created_at: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
    user: PropTypes.shape({
      username: PropTypes.string,
      complete_name: PropTypes.string,
    }),
    photos: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string.isRequired,
      })
    ),
    position_lat: PropTypes.number,
    position_lng: PropTypes.number,
  }),
  isLoadingReportDetails: PropTypes.bool.isRequired,
  mapRef: PropTypes.shape({ current: PropTypes.any }),
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedCategoryId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  setSelectedCategoryId: PropTypes.func.isRequired,
  availableOfficers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      username: PropTypes.string,
    })
  ).isRequired,
  selectedOfficerId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  setSelectedOfficerId: PropTypes.func.isRequired,
  isLoadingOfficers: PropTypes.bool.isRequired,
  officerError: PropTypes.string,
  reviewAction: PropTypes.oneOf(['assigned', 'rejected', '']),
  setReviewAction: PropTypes.func.isRequired,
  rejectionNote: PropTypes.string.isRequired,
  setRejectionNote: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  handleSubmitReview: PropTypes.func.isRequired,
  handleImageClick: PropTypes.func.isRequired,
};

ReviewContent.propTypes = {
  completeReportData: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    address: PropTypes.string,
    is_anonymous: PropTypes.bool,
    created_at: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]),
    user: PropTypes.shape({
      username: PropTypes.string,
      complete_name: PropTypes.string,
    }),
    photos: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string.isRequired,
      })
    ),
    position_lat: PropTypes.number,
    position_lng: PropTypes.number,
  }).isRequired,
  mapRef: PropTypes.shape({ current: PropTypes.any }),
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedCategoryId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  setSelectedCategoryId: PropTypes.func.isRequired,
  availableOfficers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      username: PropTypes.string,
    })
  ).isRequired,
  selectedOfficerId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  setSelectedOfficerId: PropTypes.func.isRequired,
  isLoadingOfficers: PropTypes.bool.isRequired,
  officerError: PropTypes.string,
  reviewAction: PropTypes.oneOf(['assigned', 'rejected', '']).isRequired,
  setReviewAction: PropTypes.func.isRequired,
  rejectionNote: PropTypes.string.isRequired,
  setRejectionNote: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  handleSubmitReview: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  handleImageClick: PropTypes.func.isRequired,
};
ReviewLoadingOrError.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  hasData: PropTypes.bool.isRequired,
  children: PropTypes.node,
};

export default OfficerReviewList;
