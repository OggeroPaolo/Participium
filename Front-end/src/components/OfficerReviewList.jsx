import { useEffect, useState } from "react";
import { Container, Card, Badge, Modal, Form, Button, Alert, Spinner } from "react-bootstrap";
import { getPendingReports, reviewReport, getCategories, getReport } from "../API/API";
import { reverseGeocode } from "../utils/geocoding";

function OfficerReviewList() {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [reportAddresses, setReportAddresses] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [completeReportData, setCompleteReportData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingReportDetails, setIsLoadingReportDetails] = useState(false);
  const [reviewAction, setReviewAction] = useState(""); // 'assigned' or 'rejected'
  const [rejectionNote, setRejectionNote] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadReports();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoryList = await getCategories();
      setCategories(categoryList);
      
      // Create a map for quick lookup: category_id -> category_name
      const map = {};
      categoryList.forEach(cat => {
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

      // Fetch addresses for all reports
      const addresses = {};
      for (const report of reportList) {
        // Backend returns position_lat and position_lng (not position.lat/lng)
        if (report.position_lat && report.position_lng) {
          try {
            const address = await reverseGeocode(report.position_lat, report.position_lng);
            addresses[report.id] = address;
          } catch (error) {
            console.error(`Failed to geocode report ${report.id}:`, error);
            addresses[report.id] = `${report.position_lat}, ${report.position_lng}`;
          }
        } else {
          console.warn(`Report ${report.id} missing position data`);
          addresses[report.id] = "Location not available";
        }
      }
      setReportAddresses(addresses);
    } catch (error) {
      console.error("Failed to load reports:", error);
      setAlert({ show: true, message: "Failed to load reports", variant: "danger" });
    }
  };

  const handleReportClick = async (report) => {
    setSelectedReport(report);
    setShowModal(true);
    setReviewAction("");
    setRejectionNote("");
    setIsLoadingReportDetails(true);
    setCompleteReportData(null);

    try {
      // Fetch complete report details including photos
      const completeReport = await getReport(report.id);
      console.log("Complete report data:", completeReport);
      setCompleteReportData(completeReport.report);
      setSelectedCategoryId(completeReport.report.category.id);
    } catch (error) {
      console.error("Failed to load complete report:", error);
      setAlert({ show: true, message: "Failed to load report details", variant: "danger" });
      // Use basic report data as fallback
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
    setReviewAction("");
    setRejectionNote("");
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!reviewAction) {
      setAlert({ show: true, message: "Please select assign or reject", variant: "warning" });
      return;
    }

    if (reviewAction === "rejected" && !rejectionNote.trim()) {
      setAlert({ show: true, message: "Please provide a note for rejection", variant: "warning" });
      return;
    }

    setIsSubmitting(true);

    try {
      await reviewReport(selectedReport.id, {
        status: reviewAction,
        note: reviewAction === "rejected" ? rejectionNote : null,
        categoryId: selectedCategoryId,
      });

      setAlert({
        show: true,
        message: `Report ${reviewAction === "assigned" ? "assigned to technical office" : "rejected"} successfully`,
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
      "Water Supply – Drinking Water": "primary",           // Blue - Water
      "Architectural Barriers": "secondary",                // Gray - Infrastructure
      "Sewer System": "info",                               // Light Blue - Water system
      "Public Lighting": "warning",                         // Yellow/Orange - Lighting
      "Waste": "success",                                   // Green - Environment
      "Road Signs and Traffic Lights": "danger",            // Red - Traffic/Safety
      "Roads and Urban Furnishings": "dark",                // Dark Gray - Roads
      "Public Green Areas and Playgrounds": "success",      // Green - Nature (grouped with environment)
      "Other": "secondary",                                 // Gray - Misc (grouped with infrastructure)
    };
    return colors[category] || "secondary";
  };

  return (
    <Container className='py-4 body-font'>
      <h2 className='mb-4 fw-bold'>Pending Reports Review</h2>

      {alert.show && (
        <Alert
          variant={alert.variant}
          dismissible
          onClose={() => setAlert({ ...alert, show: false })}
        >
          {alert.message}
        </Alert>
      )}

      {reports.length === 0 ? (
        <Card className='shadow-sm'>
          <Card.Body className='text-center py-5'>
            <i className='bi bi-clipboard-check' style={{ fontSize: "3rem", color: "#ccc" }}></i>
            <p className='mt-3 mb-0 text-muted'>No pending reports to review</p>
          </Card.Body>
        </Card>
      ) : (
        <div className='row g-3'>
          {reports.map((report) => (
            <div key={report.id} className='col-12 col-md-6 col-lg-4'>
              <Card
                className='shadow-sm report-card h-100'
                onClick={() => handleReportClick(report)}
                style={{ cursor: "pointer" }}
              >
                <Card.Body>
                  <div className='d-flex justify-content-between align-items-start mb-2'>
                    <strong>{report.title}</strong>
                    <Badge bg={getCategoryBadge(categoryMap[report.category_id])} className='ms-2'>
                      {categoryMap[report.category_id] || `Category ${report.category_id}`}
                    </Badge>
                  </div>
                  
                  <div className='small mb-2'>
                    <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
                    {reportAddresses[report.id] || "Loading address..."}
                  </div>
                  <div className='small text-muted'>
                    <i className='bi bi-calendar3'></i> {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </Card.Body>
              </Card>
            </div>
          ))}
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
                <strong>Category:</strong>{" "}
                <Form.Select
                  value={selectedCategoryId || ""}
                  onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                  style={{ 
                    display: 'inline-block', 
                    width: 'auto',
                    padding: '0.25rem 2rem 0.25rem 0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className='mb-3'>
                <strong>Description:</strong>
                <p className='mt-2'>{completeReportData.description}</p>
              </div>

              <div className='mb-3'>
                <strong>Location:</strong>
                <p className='mt-1'>
                  <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
                  {reportAddresses[completeReportData.id] || "Loading address..."}
                </p>
              </div>

              <div className='mb-3'>
                <strong>Reported by:</strong>{" "}
                {completeReportData.is_anonymous 
                  ? "Anonymous" 
                  : completeReportData.user?.username || completeReportData.user?.complete_name || "Unknown"}
              </div>

              <div className='mb-3'>
                <strong>Submitted on:</strong>{" "}
                {new Date(completeReportData.created_at).toLocaleString()}
              </div>

              {completeReportData.photos && completeReportData.photos.length > 0 && (
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
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <hr />

              <Form onSubmit={handleSubmitReview}>

                <Form.Group className='mb-3'>
                  <Form.Label className='fw-bold'>Review Decision</Form.Label>
                  <div className='d-flex gap-3'>
                    <Form.Check
                      type='radio'
                      id='assign-radio'
                      name='reviewAction'
                      label='Assign to Technical Office'
                      value='assigned'
                      checked={reviewAction === "assigned"}
                      onChange={(e) => setReviewAction(e.target.value)}
                    />
                    <Form.Check
                      type='radio'
                      id='reject-radio'
                      name='reviewAction'
                      label='Reject'
                      value='rejected'
                      checked={reviewAction === "rejected"}
                      onChange={(e) => setReviewAction(e.target.value)}
                    />
                  </div>
                </Form.Group>

                {reviewAction === "rejected" && (
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
                  <Button variant='secondary' onClick={handleCloseModal} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    variant={reviewAction === "assigned" ? "success" : "danger"}
                    disabled={
                      isSubmitting || 
                      !reviewAction || 
                      (reviewAction === "rejected" && !rejectionNote.trim())
                    }
                    className='confirm-button'
                  >
                    {isSubmitting ? (
                      <>
                        <span className='spinner-border spinner-border-sm me-2' />
                        Submitting...
                      </>
                    ) : (
                      `${reviewAction === "assigned" ? "Assign" : "Reject"} Report`
                    )}
                  </Button>
                </div>
              </Form>
            </>
          ) : (
            <div className='text-center py-5'>
              <p className='text-muted'>Failed to load report details</p>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Image Preview Modal */}
      <Modal show={showImageModal} onHide={handleCloseImageModal} size='xl' centered>
        <Modal.Header closeButton>
          <Modal.Title>Photo Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className='text-center'>
          {selectedImage && (
            <img
              src={selectedImage}
              alt='Full size preview'
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default OfficerReviewList;

