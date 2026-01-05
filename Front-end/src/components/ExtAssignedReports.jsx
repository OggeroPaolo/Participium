import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import {
  getExternalAssignedReports,
  getCategories,
  getCommentsInternal,
  getReport,
  updateStatus,
  createComment,
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
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function ExtAssignedReports() {
  const { user } = useUserStore();
  const userId = user.id;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

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
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // comment section variables
  const [modalPage, setModalPage] = useState("info");
  const [comments, setComments] = useState([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState("");

  const author_type =
    user?.role_type === "tech_officer"
      ? "External Maintainer"
      : "Technical Officer";

  // string formatter for status
  // can be pending_approval, assigned, in_progress, suspended, rejected, resolved
  // consider here only assigned, in_progess, suspended, resolved
  const statusColumns = {
    assigned: "Assigned",
    in_progress: "In Progress",
    suspended: "Suspended",
    resolved: "Resolved",
  };

  const formatAddress = (report) => {
    if (report?.address) return report.address;
    if (report?.position_lat && report?.position_lng) {
      return `${report.position_lat}, ${report.position_lng}`;
    }
    return "Address unavailable";
  };

  // Group reports by status
  const reportsByStatus = Object.keys(statusColumns).reduce((acc, status) => {
    acc[status] = reports.filter((r) => r.status === status);
    return acc;
  }, {});

  const reportCounts = Object.values(reportsByStatus).map((arr) => arr.length);
  const maxReportsAvailable =
    reportCounts.length > 0 ? Math.max(...reportCounts) : 0;

  const [pendingReportId, setPendingReportId] = useState(null);

  useEffect(() => {
    loadReports();
    loadCategories();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reportIdParam = params.get("reportId");
    if (reportIdParam) {
      setPendingReportId(reportIdParam);
    }
  }, [location.search]);

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
      const reportList = await getExternalAssignedReports();
      setReports(reportList);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoadingDone(true);
    }
  };

  const handleReportClick = async (report) => {
    setShowModal(true);
    setIsLoadingReportDetails(true);
    setCompleteReportData(null);

    try {
      // Fetch complete report details including photos
      const completeReport = await getReport(report.id);
      const internalComments = await getCommentsInternal(report.id);

      const reportData = completeReport.report || completeReport;
      setCompleteReportData(reportData);
      setComments(internalComments);
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

  useEffect(() => {
    if (!pendingReportId) return;

    handleReportClick({ id: Number(pendingReportId) });

    const params = new URLSearchParams(location.search);
    params.delete("reportId");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );

    setPendingReportId(null);
  }, [pendingReportId, handleReportClick, location.pathname, location.search, navigate]);

  const handleCloseModal = () => {
    setShowModal(false);
    setCompleteReportData(null);

    // Clean up map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    setModalPage("info");
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Initialize map when report data is loaded
  useEffect(() => {
    if (!completeReportData || !mapRef.current) return;

    // remove previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const { position_lat, position_lng } = completeReportData;
    if (!position_lat || !position_lng) return;

    // Initialize minimal read-only map

    // wait for modal to finish opening and the map to be visible
    const timeout = setTimeout(() => {
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
      setTimeout(() => mapInstance.invalidateSize(), 50);
    }, 300);

    return () => clearTimeout(timeout);
  }, [completeReportData, modalPage, showModal]);

  const getCategoryBadge = (category) => {
    // prettier-ignore
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

  const handleSetStatus = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      await updateStatus(completeReportData.id, selectedStatus);

      setAlert({
        show: true,
        message: "Status updated successfully",
        variant: "success",
      });

      // Reload reports list
      const reloadedReports = await getExternalAssignedReports();
      setReports(reloadedReports);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to update status:", error);
      setAlert({ show: true, message: error.message, variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // handle posting of new comments
  const writeComment = async (e) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setIsSubmittingComment(true);

    try {
      await createComment(completeReportData.id, newComment);

      // clear textarea
      setNewComment("");

      // reload comments
      const newComments = await getCommentsInternal(completeReportData.id);
      setComments(newComments);
    } catch (error) {
      setAlert({
        show: true,
        message: error.message,
        variant: "danger",
      });
      handleCloseModal();
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // make comment section scrollable
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (modalPage === "comments") {
      const timeout = setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 10);

      return () => clearTimeout(timeout);
    }
  }, [comments, modalPage]);

  return (
    <Container className='py-4 body-font assigned-reports-container'>
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

              {reportsByStatus[status].slice(0, visibleCount).map((report) => (
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
                        {formatAddress(report)}
                      </div>
                      <div className='small text-muted'>
                        <i className='bi bi-calendar3'></i>{" "}
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                      <div className='mt-2'>
                        <Badge
                          bg={getCategoryBadge(categoryMap[report.category_id])}
                        >
                          {categoryMap[report.category_id] ||
                            `Category ${report.category_id}`}
                        </Badge>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Button for more reports */}

      {visibleCount < maxReportsAvailable && maxReportsAvailable > 0 && (
        <div className='text-center mt-4'>
          <Button
            className='confirm-button'
            onClick={() => setVisibleCount((prev) => prev + 3)}
          >
            Load more
          </Button>
        </div>
      )}

      {/* Review and comments Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size='lg' centered>
        <Modal.Header className='modal-header-clean'>
          <button
            type='button'
            className='btn-close modal-close-top-right'
            onClick={handleCloseModal}
          />
          <div className='modal-tabs-container'>
            <button
              className={`modal-tab ${modalPage === "info" ? "active" : ""}`}
              onClick={() => setModalPage("info")}
            >
              Report Info
            </button>

            <button
              className={`modal-tab ${
                modalPage === "comments" ? "active" : ""
              }`}
              onClick={() => setModalPage("comments")}
            >
              Comments
            </button>
          </div>
        </Modal.Header>
        <Modal.Body>
          {/* spinner if report is loading*/}
          {isLoadingReportDetails && (
            <div className='text-center py-5'>
              <Spinner animation='border' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </Spinner>
              <p className='mt-3'>Loading report details...</p>
            </div>
          )}

          {/* report loading is done but report GET failed */}
          {!isLoadingReportDetails && !completeReportData && (
            <div className='text-center py-5'>
              <p className='text-muted'>Failed to load report details</p>
            </div>
          )}

          {/* report is available */}
          {!isLoadingReportDetails && completeReportData && (
            <>
              {/* modal page with report info */}
              {modalPage === "info" && (
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
                      {formatAddress(completeReportData)}
                    </p>
                  </div>
                </>
              )}

              {/* Minimal read-only map: must be always rendered */}
              <div
                ref={mapRef}
                className='map-container'
                style={{
                  width: "100%",
                  height: "250px",
                  borderRadius: "8px",
                  border: "1px solid #dee2e6",
                  marginTop: "10px",
                  display: modalPage === "info" ? "block" : "none",
                }}
              />

              {modalPage === "info" && (
                <>
                  <div className='mb-3 mt-2'>
                    <strong>Reported by:</strong>{" "}
                    {completeReportData.user?.username ||
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
                    <strong>Category:</strong>{" "}
                    {completeReportData.category.name}
                  </div>

                  <Form onSubmit={handleSetStatus}>
                    <div className='mb-3'>
                      <strong>Status:</strong>{" "}
                      <Form.Select
                        name='status'
                        required
                        style={{
                          display: "inline-block",
                          width: "auto",
                          padding: "0.25rem 2rem 0.25rem 0.5rem",
                          fontSize: "0.9rem",
                        }}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        disabled={
                          statusColumns[completeReportData.status] ===
                          "Resolved"
                        }
                      >
                        <option
                          key='0'
                          value={statusColumns[completeReportData.status]}
                        >
                          {statusColumns[completeReportData.status]}
                        </option>
                        {Object.keys(statusColumns).map(
                          (s) =>
                            statusColumns[completeReportData.status] !==
                              statusColumns[s] && (
                              <option key={s} value={s}>
                                {statusColumns[s]}
                              </option>
                            )
                        )}
                      </Form.Select>
                    </div>

                    <hr />

                    <div className='d-flex justify-content-end gap-2 mt-4'>
                      <Button
                        variant='secondary'
                        onClick={handleCloseModal}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      {statusColumns[completeReportData.status] !==
                        "Resolved" && (
                        <Button
                          type='submit'
                          disabled={isSubmitting}
                          className='confirm-button'
                        >
                          {isSubmitting ? (
                            <>
                              <span className='spinner-border spinner-border-sm me-2' />
                              Submitting...
                            </>
                          ) : (
                            "Update status"
                          )}
                        </Button>
                      )}
                    </div>
                  </Form>
                </>
              )}

              {modalPage === "comments" && (
                /* modal page with comment section */

                <div className='modal-comments-container'>
                  <div className='comments-list'>
                    {comments.length !== 0 ? (
                      <>
                        {comments.map((c, i) => (
                          <div key={i} className='mb-3 pb-2 border-bottom'>
                            <div className='d-flex justify-content-between align-items-start'>
                              <div className='d-flex flex-column'>
                                {c.user_id !== userId && c.role_name && (
                                  <small className='text-muted'>
                                    {c.role_name.replaceAll("_", " ")}
                                  </small>
                                )}
                                <div className='d-flex align-items-center'>
                                  <div
                                    style={{
                                      width: "14px",
                                      height: "14px",
                                      borderRadius: "50%",
                                      backgroundColor:
                                        c.user_id === userId
                                          ? "#F5E078"
                                          : "#0350b5",
                                      marginRight: "8px",
                                    }}
                                  ></div>
                                  <strong>
                                    {c.user_id === userId
                                      ? "Me"
                                      : `${c.first_name} ${c.last_name}`}
                                  </strong>
                                </div>
                              </div>

                              <small className='text-muted'>
                                {(() => {
                                  const d = new Date(c.timestamp);
                                  d.setHours(d.getHours() + 1);
                                  return d.toLocaleString("it-IT");
                                })()}
                              </small>
                            </div>

                            <div className='mt-1'>
                              <p className='mb-0 text-dark'>{c.text}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={commentsEndRef} />
                      </>
                    ) : (
                      /* no comments */
                      <p className='text-muted'>No comments yet</p>
                    )}
                  </div>

                  <Form className='comment-input pt-3' onSubmit={writeComment}>
                    <Form.Group className='mb-3'>
                      <Form.Control
                        as='textarea'
                        rows={2}
                        placeholder='Write a comment'
                        onChange={(e) => setNewComment(e.target.value)}
                        value={newComment}
                      />
                    </Form.Group>

                    <hr />

                    <div className='d-flex justify-content-end'>
                      <Button
                        className='confirm-button'
                        type='submit'
                        disabled={isSubmittingComment}
                      >
                        {isSubmittingComment ? (
                          <>
                            <span className='spinner-border spinner-border-sm me-2' />
                            Posting...
                          </>
                        ) : (
                          "Post comment"
                        )}
                      </Button>
                    </div>
                  </Form>
                </div>
              )}
            </>
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

export default ExtAssignedReports;
