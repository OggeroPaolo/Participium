import { useEffect, useState, useRef } from "react";
import useUserStore from "../store/userStore";
import {
  getAssignedReports,
  getCategories,
  getReport,
  getExternalMaintainers,
  assignExternalMaintainer,
} from "../API/API";
import {
  Container,
  Card,
  Badge,
  Modal,
  Button,
  Spinner,
  Alert,
  Form,
} from "react-bootstrap";
import { reverseGeocode } from "../utils/geocoding";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function TechAssignedReports() {
  const { user } = useUserStore();
  const userId = user.id;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [reportAddresses, setReportAddresses] = useState({});
  const [completeReportData, setCompleteReportData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingReportDetails, setIsLoadingReportDetails] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [reports, setReports] = useState([]);
  const [loadingDone, setLoadingDone] = useState(false);
  const [categoryMap, setCategoryMap] = useState({});
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
const [externalMaintainers, setExternalMaintainers] = useState([]);
const [selectedExternalMaintainer, setSelectedExternalMaintainer] = useState(null);
const [isLoadingMaintainers, setIsLoadingMaintainers] = useState(false);
const [maintainersError, setMaintainersError] = useState("");
const [assigningExternal, setAssigningExternal] = useState(false);
const assignedReportOwnerId =
  completeReportData?.assigned_to?.id ??
  completeReportData?.assignedTo?.id ??
  (typeof completeReportData?.assigned_to === "number"
    ? completeReportData.assigned_to
    : typeof completeReportData?.assignedTo === "number"
    ? completeReportData.assignedTo
    : null);
const canAssignExternal =
  Boolean(
    completeReportData &&
      completeReportData.status === "assigned" &&
      assignedReportOwnerId === userId
  );
const reportCategoryName =
  completeReportData?.category?.name ||
  (completeReportData?.category_id &&
    categoryMap[completeReportData.category_id]) ||
  (completeReportData?.category_id
    ? `Category ${completeReportData.category_id}`
    : "");

  // string formatter for status
  // can be pending_approval, assigned, in_progress, suspended, rejected, resolved
  // consider here only assigned, in_progess, suspended, resolved
  const statusColumns = {
    assigned: "Assigned",
    in_progress: "In Progress",
    suspended: "Suspended",
    resolved: "Resolved",
  };

  // Group reports by status
  const reportsByStatus = Object.keys(statusColumns).reduce((acc, status) => {
    acc[status] = reports.filter((r) => r.status === status);
    return acc;
  }, {});

  // Address-ready groups per column
  const readyReportsByStatus = {};
  Object.keys(reportsByStatus).forEach((status) => {
    const list = reportsByStatus[status];
    readyReportsByStatus[status] = list.filter((r) => reportAddresses[r.id]);
  });

  const isLoadingReports =
    reports.length > 0 &&
    Object.values(readyReportsByStatus).every((arr) => arr.length === 0);

  useEffect(() => {
    loadReports();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoryList = await getCategories();

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
      const reportList = await getAssignedReports(userId);
      setReports(reportList);

      // load addresses in background, one by one
      loadAddressesInBackground(reportList);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoadingDone(true);
    }
  };

  const loadAddressesInBackground = async (reportList) => {
    reportList.forEach(async (report) => {
      try {
        const address = await reverseGeocode(
          report.position_lat,
          report.position_lng
        );

        setReportAddresses((prev) => ({
          ...prev,
          [report.id]: address,
        }));
      } catch (error) {
        setReportAddresses((prev) => ({
          ...prev,
          [report.id]: `${report.position_lat}, ${report.position_lng}`,
        }));
      }
    });
  };

  const handleReportClick = async (report) => {
    setShowModal(true);
    setIsLoadingReportDetails(true);
    setCompleteReportData(null);
    setExternalMaintainers([]);
    setSelectedExternalMaintainer(null);
    setMaintainersError("");

    try {
      // Fetch complete report details including photos
      const completeReport = await getReport(report.id);
      console.log(completeReport);

      const reportData = completeReport.report || completeReport;
      setCompleteReportData(reportData);
    } catch (error) {
      console.error("Failed to load complete report:", error);
      setAlert({
        show: true,
        message: "Failed to load report details",
        variant: "danger",
      });
    } finally {
      setIsLoadingReportDetails(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCompleteReportData(null);
    setExternalMaintainers([]);
    setSelectedExternalMaintainer(null);
    setMaintainersError("");
    setAssigningExternal(false);

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

  const handleAssignExternalMaintainer = async () => {
    if (!completeReportData) return;

    if (!selectedExternalMaintainer) {
      setAlert({
        show: true,
        message: "Please select an external maintainer before assigning",
        variant: "warning",
      });
      return;
    }

    setAssigningExternal(true);
    try {
      await assignExternalMaintainer(
        completeReportData.id,
        selectedExternalMaintainer
      );
      setAlert({
        show: true,
        message: "Report assigned to external maintainer successfully",
        variant: "success",
      });
      await loadReports();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to assign external maintainer:", error);
      setAlert({
        show: true,
        message:
          error.message || "Failed to assign report to external maintainer",
        variant: "danger",
      });
    } finally {
      setAssigningExternal(false);
    }
  };

  // Initialize map when report data is loaded
  useEffect(() => {
    if (!completeReportData || !mapRef.current || mapInstanceRef.current)
      return;

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
  }, [completeReportData]);

  useEffect(() => {
    if (
      !showModal ||
      !completeReportData ||
      completeReportData.status !== "assigned"
    ) {
      setExternalMaintainers([]);
      setSelectedExternalMaintainer(null);
      setMaintainersError("");
      setIsLoadingMaintainers(false);
      return;
    }

    if (assignedReportOwnerId !== userId) {
      setExternalMaintainers([]);
      setSelectedExternalMaintainer(null);
      setMaintainersError("");
      setIsLoadingMaintainers(false);
      return;
    }

    const categoryId =
      completeReportData.category?.id || completeReportData.category_id;
    if (!categoryId) return;

    let active = true;
    const fetchMaintainers = async () => {
      try {
        setIsLoadingMaintainers(true);
        setMaintainersError("");
        const list = await getExternalMaintainers({ categoryId });
        if (!active) return;
        setExternalMaintainers(list);
        setSelectedExternalMaintainer((prev) =>
          list.some((m) => m.id === prev) ? prev : null
        );
      } catch (error) {
        if (!active) return;
        setExternalMaintainers([]);
        setSelectedExternalMaintainer(null);
        setMaintainersError(
          error.message || "Failed to load external maintainers"
        );
      } finally {
        if (active) {
          setIsLoadingMaintainers(false);
        }
      }
    };

    fetchMaintainers();

    return () => {
      active = false;
    };
  }, [showModal, completeReportData, userId, assignedReportOwnerId]);

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

  return (
    <Container className='py-4 body-font'>
      <h2 className='mb-4 fw-bold'>Assigned Reports Review</h2>

      {alert.show && (
        <Alert
          variant={alert.variant}
          dismissible
          onClose={() => setAlert({ ...alert, show: false })}
        >
          {alert.message}
        </Alert>
      )}

      {!loadingDone ? (
        <div
          className='d-flex justify-content-center align-items-center'
          style={{ minHeight: "80vh" }}
        >
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <Card className='shadow-sm'>
          <Card.Body className='text-center py-5'>
            <i
              className='bi bi-clipboard-check'
              style={{ fontSize: "3rem", color: "#ccc" }}
            ></i>
            <p className='mt-3 mb-0 text-muted'>
              No assigned reports to review
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div className='row g-4'>
          {Object.keys(statusColumns).map((status) => (
            <div key={status} className='col-12 col-md-6 col-lg-3 px-3'>
              <h5 className='fw-bold mb-3 text-center'>
                {statusColumns[status]}
              </h5>

              {isLoadingReports ? (
                <div
                  className='d-flex justify-content-center align-items-center'
                  style={{ minHeight: "80vh" }}
                >
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : (
                readyReportsByStatus[status]
                  .slice(0, visibleCount)
                  .map((report) => (
                    <div key={report.id} className='mb-3'>
                      <Card
                        className='shadow-sm report-card h-100'
                        onClick={() => handleReportClick(report)}
                        style={{ cursor: "pointer" }}
                      >
                        <Card.Body>
                          <div className='d-flex justify-content-between align-items-start mb-2'>
                            <strong>{report.title}</strong>
                          </div>

                          <div className='small mb-2'>
                            <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
                            {reportAddresses[report.id] || "Loading address..."}
                          </div>
                          <div className='small text-muted'>
                            <i className='bi bi-calendar3'></i>{" "}
                            {new Date(report.created_at).toLocaleDateString()}
                          </div>
                          <div className='mt-2'>
                            <Badge
                              bg={getCategoryBadge(
                                categoryMap[report.category_id]
                              )}
                            >
                              {categoryMap[report.category_id] ||
                                `Category ${report.category_id}`}
                            </Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Button for more reports */}

      {visibleCount <
        Math.max(
          ...Object.values(readyReportsByStatus).map((arr) => arr.length)
        ) && (
        <div className='text-center mt-4'>
          <Button
            className='confirm-button'
            onClick={() => setVisibleCount((prev) => prev + 3)}
          >
            Load more
          </Button>
        </div>
      )}

      {/* Review Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size='lg' centered>
        <Modal.Header closeButton>
          <Modal.Title>Review Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoadingReportDetails ? (
            <div className='text-center py-5'>
              <Spinner animation='border' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </Spinner>
              <p className='mt-3'>Loading report details...</p>
            </div>
          ) : completeReportData ? (
            <>
              <h5 className='fw-bold mb-3'>{completeReportData.title}</h5>

              <div className='mb-3'>
                <strong>Description:</strong>
                <p className='mt-2'>{completeReportData.description}</p>
              </div>

              <div className='mb-3'>
                <strong>Location:</strong>
                <p className='mt-1'>
                  <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
                  {reportAddresses[completeReportData.id] ||
                    "Loading address..."}
                </p>
                {/* Minimal read-only map */}
                <div
                  ref={mapRef}
                  style={{
                    width: "100%",
                    height: "250px",
                    borderRadius: "8px",
                    border: "1px solid #dee2e6",
                    marginTop: "10px",
                  }}
                />
              </div>

              <div className='mb-3'>
                <strong>Reported by:</strong>{" "}
                {completeReportData.is_anonymous
                  ? "Anonymous"
                  : completeReportData.user?.username ||
                    completeReportData.user?.complete_name ||
                    "Unknown"}
              </div>

              <div className='mb-3'>
                <strong>Submitted on:</strong>{" "}
                {new Date(completeReportData.created_at).toLocaleString()}
              </div>

              {completeReportData.photos &&
                completeReportData.photos.length > 0 && (
                  <div className='mb-3'>
                    <strong>Photos:</strong>
                    <div className='d-flex gap-2 mt-2 flex-wrap'>
                      {completeReportData.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo.url}
                          alt={`Report photo ${index + 1}`}
                          className='img-preview'
                          onClick={() => handleImageClick(photo.url)}
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                    </div>
                  </div>
                )}

              <div className='mb-3'>
                <strong>Category:</strong> {completeReportData.category.name}
              </div>

              <div className='mb-3'>
                <strong>Status:</strong>{" "}
                {statusColumns[completeReportData.status]}
              </div>

              {canAssignExternal && (
                <div className='mb-3'>
                  <div className='d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-2'>
                    <strong>Assign to External Maintainer</strong>
                    {reportCategoryName && (
                      <span className='badge bg-light text-dark mt-2 mt-md-0'>
                        Category: {reportCategoryName}
                      </span>
                    )}
                  </div>
                  <Form.Select
                    className='mt-2'
                    value={selectedExternalMaintainer || ""}
                    onChange={(e) =>
                      setSelectedExternalMaintainer(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    disabled={
                      isLoadingMaintainers || externalMaintainers.length === 0
                    }
                  >
                    <option value=''>
                      {isLoadingMaintainers
                        ? "Loading external maintainers..."
                        : externalMaintainers.length === 0
                        ? "No external maintainers available"
                        : "Select an external maintainer"}
                    </option>
                    {externalMaintainers.map((maintainer) => {
                      const maintainerName =
                        maintainer.fullName ||
                        maintainer.username ||
                        `Maintainer #${maintainer.id}`;
                      const optionLabel = `${maintainerName} — ${
                        maintainer.companyName || "Unknown company"
                      }${
                        reportCategoryName ? ` • ${reportCategoryName}` : ""
                      }`;
                      return (
                        <option key={maintainer.id} value={maintainer.id}>
                          {optionLabel}
                        </option>
                      );
                    })}
                  </Form.Select>
                  {maintainersError && (
                    <Form.Text className='text-danger d-block mt-1'>
                      {maintainersError}
                    </Form.Text>
                  )}
                  {!maintainersError &&
                    !isLoadingMaintainers &&
                    externalMaintainers.length === 0 && (
                      <Form.Text className='text-muted d-block mt-1'>
                        No external maintainers handle this category yet.
                      </Form.Text>
                    )}
                  <div className='d-flex justify-content-end mt-3'>
                    <Button
                      variant='primary'
                      onClick={handleAssignExternalMaintainer}
                      disabled={
                        assigningExternal ||
                        isLoadingMaintainers ||
                        !selectedExternalMaintainer
                      }
                      className='confirm-button'
                    >
                      {assigningExternal ? (
                        <>
                          <span className='spinner-border spinner-border-sm me-2' />
                          Assigning...
                        </>
                      ) : (
                        "Assign to External"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <hr />

              <div className='d-flex justify-content-end gap-2 mt-4'>
                <Button variant='secondary' onClick={handleCloseModal}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className='text-center py-5'>
              <p className='text-muted'>Failed to load report details</p>
            </div>
          )}
        </Modal.Body>
      </Modal>

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

export default TechAssignedReports;
