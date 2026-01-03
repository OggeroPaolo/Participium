import { useEffect, useState, useRef, useCallback } from "react";
import useUserStore from "../store/userStore";
import {
  getAssignedReports,
  getCategories,
  getCommentsInternal,
  getCommentsExternal,
  createExternalComment,
  getReport,
  createComment,
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
  Form,
} from "react-bootstrap";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import PropTypes from "prop-types";
import AlertBlock from "./AlertBlock";

function TechAssignedReports() {
  const { user } = useUserStore();
  const userId = user.id;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

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
  const [selectedExternalMaintainer, setSelectedExternalMaintainer] =
    useState(null);
  const [isLoadingMaintainers, setIsLoadingMaintainers] = useState(false);
  const [maintainersError, setMaintainersError] = useState("");
  const [assigningExternal, setAssigningExternal] = useState(false);
  const assignableStatuses = new Set(["assigned", "in_progress", "suspended"]);

  // --- HELPERS ---
  const getAssignedReportOwnerId = () => {
    if (completeReportData?.assigned_to?.id)
      return completeReportData.assigned_to.id;
    if (completeReportData?.assignedTo?.id)
      return completeReportData.assignedTo.id;
    if (typeof completeReportData?.assigned_to === "number")
      return completeReportData.assigned_to;
    if (typeof completeReportData?.assignedTo === "number")
      return completeReportData.assignedTo;
    return null;
  };

  const canAssignToExternal = () => {
    const ownerId = getAssignedReportOwnerId();
    return Boolean(
      completeReportData &&
        assignableStatuses.has(completeReportData.status) &&
        ownerId === userId
    );
  };

  const getReportCategoryName = () => {
    if (completeReportData?.category?.name)
      return completeReportData.category.name;
    if (
      completeReportData?.category_id &&
      categoryMap[completeReportData.category_id]
    ) {
      return categoryMap[completeReportData.category_id];
    }
    if (completeReportData?.category_id) {
      return `Category ${completeReportData.category_id}`;
    }
    return "";
  };

  const getCurrentExternalMaintainerId = () => {
    if (typeof completeReportData?.external_user === "object") {
      return completeReportData.external_user?.id;
    }
    if (typeof completeReportData?.external_user === "number") {
      return completeReportData.external_user;
    }
    return null;
  };

  const getCurrentExternalMaintainerLabel = () => {
    const id = getCurrentExternalMaintainerId();
    if (!id) return null;

    if (typeof completeReportData?.external_user === "object") {
      return (
        completeReportData.external_user.complete_name ||
        completeReportData.external_user.username ||
        `Maintainer #${id}`
      );
    }
    return `Maintainer #${id}`;
  };

  const getCurrentExternalMaintainerCompany = () => {
    return typeof completeReportData?.external_user === "object"
      ? completeReportData.external_user.company_name || null
      : null;
  };

  const getMaintainerOptions = () => {
    const id = getCurrentExternalMaintainerId();
    if (!id || externalMaintainers.some((m) => m.id === id)) {
      return externalMaintainers;
    }

    const currentMaintainer = {
      id,
      fullName: getCurrentExternalMaintainerLabel() || `Maintainer #${id}`,
      username: getCurrentExternalMaintainerLabel() || `Maintainer #${id}`,
      companyName: getCurrentExternalMaintainerCompany() || null,
    };

    return [currentMaintainer, ...externalMaintainers];
  };

  const isAssignButtonDisabledState = () => {
    return (
      assigningExternal ||
      isLoadingMaintainers ||
      !selectedExternalMaintainer ||
      selectedExternalMaintainer === getCurrentExternalMaintainerId()
    );
  };

  const assignedReportOwnerId = getAssignedReportOwnerId();
  const canAssignExternal = canAssignToExternal();
  const reportCategoryName = getReportCategoryName();
  const currentExternalMaintainerId = getCurrentExternalMaintainerId();
  const currentExternalMaintainerLabel = getCurrentExternalMaintainerLabel();
  const currentExternalMaintainerCompany =
    getCurrentExternalMaintainerCompany();
  const maintainerOptions = getMaintainerOptions();
  const isAssignButtonDisabled = isAssignButtonDisabledState();

  // comment section variables
  const [modalPage, setModalPage] = useState("info");
  const [comments, setComments] = useState([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [citizenComments, setCitizenComments] = useState([]);
  const [newCommentExt, setNewCommentExt] = useState("");

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
      const reportList = await getAssignedReports();
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
    setExternalMaintainers([]);
    setSelectedExternalMaintainer(null);
    setMaintainersError("");

    try {
      // Fetch complete report details including photos
      const completeReport = await getReport(report.id);
      const internalComments = await getCommentsInternal(report.id);
      const externalComments = await getCommentsExternal(report.id);

      const reportData = completeReport.report || completeReport;
      setCompleteReportData(reportData);
      setComments(internalComments);
      setCitizenComments(externalComments);
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

  useEffect(() => {
    if (!showModal) return;
    setSelectedExternalMaintainer(currentExternalMaintainerId || null);
  }, [showModal, currentExternalMaintainerId]);

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

    if (selectedExternalMaintainer === currentExternalMaintainerId) {
      setAlert({
        show: true,
        message:
          "Please select a different external maintainer before assigning",
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

  const writeCommentExternal = async (e) => {
    e.preventDefault();

    if (!newCommentExt.trim()) return;

    setIsSubmittingComment(true);

    try {
      await createExternalComment(completeReportData.id, newCommentExt);

      // clear textarea
      setNewCommentExt("");

      // reload comments
      const newComments = await getCommentsExternal(completeReportData.id);
      setCitizenComments(newComments);
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

  const fetchExternalMaintainers = useCallback(
    async (categoryId, activeRef) => {
      try {
        setIsLoadingMaintainers(true);
        setMaintainersError("");
        const list = await getExternalMaintainers({ categoryId });

        if (!activeRef.current) return;

        setExternalMaintainers(list);
        setSelectedExternalMaintainer((prev) =>
          list.some((m) => m.id === prev) ? prev : null
        );
      } catch (error) {
        if (!activeRef.current) return;
        setExternalMaintainers([]);
        setSelectedExternalMaintainer(null);
        setMaintainersError(
          error.message || "Failed to load external maintainers"
        );
      } finally {
        if (activeRef.current) {
          setIsLoadingMaintainers(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (
      !showModal ||
      !completeReportData ||
      !assignableStatuses.has(completeReportData.status)
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

    const activeRef = { current: true };

    fetchExternalMaintainers(categoryId, activeRef);

    return () => {
      activeRef.current = false;
    };
  }, [showModal, completeReportData, userId, assignedReportOwnerId]);

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

  return (
    <Container className='py-4 body-font assigned-reports-container'>
      <h2 className='mb-4 fw-bold'>Assigned Reports Review</h2>

      <AlertBlock
        alert={alert}
        onClose={() => setAlert({ ...alert, show: false })}
      />

      <AssignedReportsBoard
        loadingDone={loadingDone}
        reports={reports}
        statusColumns={statusColumns}
        reportsByStatus={reportsByStatus}
        visibleCount={visibleCount}
        maxReportsAvailable={maxReportsAvailable}
        formatAddress={formatAddress}
        categoryMap={categoryMap}
        getCategoryBadge={getCategoryBadge}
        onReportClick={handleReportClick}
        onLoadMore={() => setVisibleCount((prev) => prev + 3)}
      />

      <TechReportModal
        show={showModal}
        onClose={handleCloseModal}
        isLoadingReportDetails={isLoadingReportDetails}
        completeReportData={completeReportData}
        mapRef={mapRef}
        statusColumns={statusColumns}
        formatAddress={formatAddress}
        comments={comments}
        citizenComments={citizenComments}
        userId={userId}
        modalPage={modalPage}
        setModalPage={setModalPage}
        newComment={newComment}
        newCommentExt={newCommentExt}
        setNewComment={setNewComment}
        setNewCommentExt={setNewCommentExt}
        writeComment={writeComment}
        writeCommentExternal={writeCommentExternal}
        isSubmittingComment={isSubmittingComment}
        // assegnazione esterni
        canAssignExternal={canAssignExternal}
        reportCategoryName={reportCategoryName}
        externalMaintainers={externalMaintainers}
        maintainerOptions={maintainerOptions}
        selectedExternalMaintainer={selectedExternalMaintainer}
        setSelectedExternalMaintainer={setSelectedExternalMaintainer}
        isLoadingMaintainers={isLoadingMaintainers}
        maintainersError={maintainersError}
        currentExternalMaintainerId={currentExternalMaintainerId}
        currentExternalMaintainerLabel={currentExternalMaintainerLabel}
        currentExternalMaintainerCompany={currentExternalMaintainerCompany}
        isAssignButtonDisabled={isAssignButtonDisabled}
        assigningExternal={assigningExternal}
        handleAssignExternalMaintainer={handleAssignExternalMaintainer}
        handleImageClick={handleImageClick}
      />

      <ImagePreviewModal
        show={showImageModal}
        onClose={handleCloseImageModal}
        image={selectedImage}
      />
    </Container>
  );
}

function AssignedReportsBoard({
  loadingDone,
  reports,
  statusColumns,
  reportsByStatus,
  visibleCount,
  maxReportsAvailable,
  formatAddress,
  categoryMap,
  getCategoryBadge,
  onReportClick,
  onLoadMore,
}) {
  if (!loadingDone) {
    return (
      <div
        className='d-flex justify-content-center align-items-center'
        style={{ minHeight: "80vh" }}
      >
        <div className='spinner-border text-primary' aria-hidden='true'>
          <output aria-live='polite' style={{ marginLeft: "0.5rem" }}>
            Loading...
          </output>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className='shadow-sm'>
        <Card.Body className='text-center py-5'>
          <i
            className='bi bi-clipboard-check'
            style={{ fontSize: "3rem", color: "#ccc" }}
          />
          <p className='mt-3 mb-0 text-muted'>No assigned reports to review</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
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
                  onClick={() => onReportClick(report)}
                  style={{ cursor: "pointer" }}
                >
                  <Card.Body>
                    <div className='d-flex justify-content-between align-items-start mb-2'>
                      <strong>{report.title}</strong>
                    </div>
                    <div className='small mb-2'>
                      <i className='bi bi-geo-alt-fill text-danger' />{" "}
                      {formatAddress(report)}
                    </div>
                    <div className='small text-muted'>
                      <i className='bi bi-calendar3' />{" "}
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

      {/* Button for more reports */}
      {visibleCount < maxReportsAvailable && maxReportsAvailable > 0 && (
        <div className='text-center mt-4'>
          <Button className='confirm-button' onClick={onLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

function TechReportModal({
  show,
  onClose,
  isLoadingReportDetails,
  completeReportData,
  mapRef,
  statusColumns,
  formatAddress,
  comments,
  citizenComments,
  userId,
  modalPage,
  setModalPage,
  newComment,
  newCommentExt,
  setNewComment,
  setNewCommentExt,
  writeComment,
  writeCommentExternal,
  isSubmittingComment,
  canAssignExternal,
  reportCategoryName,
  externalMaintainers,
  maintainerOptions,
  selectedExternalMaintainer,
  setSelectedExternalMaintainer,
  isLoadingMaintainers,
  maintainersError,
  currentExternalMaintainerId,
  currentExternalMaintainerLabel,
  currentExternalMaintainerCompany,
  isAssignButtonDisabled,
  assigningExternal,
  handleAssignExternalMaintainer,
  handleImageClick,
}) {
  return (
    <Modal show={show} onHide={onClose} size='lg' centered>
      <Modal.Header className='modal-header-clean'>
        <button
          type='button'
          className='btn-close modal-close-top-right'
          onClick={onClose}
        />
        <div className='modal-tabs-container'>
          <button
            className={`modal-tab ${modalPage === "info" ? "active" : ""}`}
            onClick={() => setModalPage("info")}
          >
            Report Info
          </button>
          <button
            className={`modal-tab ${modalPage === "comments" ? "active" : ""}`}
            onClick={() => setModalPage("comments")}
          >
            Internal Comments
          </button>
          <button
            className={`modal-tab ${
              modalPage === "citizenChat" ? "active" : ""
            }`}
            onClick={() => setModalPage("citizenChat")}
          >
            Citizen Chat
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
            {modalPage === "info" && (
              <TechReportInfoTab
                completeReportData={completeReportData}
                mapRef={mapRef}
                modalPage={modalPage}
                statusColumns={statusColumns}
                formatAddress={formatAddress}
                canAssignExternal={canAssignExternal}
                reportCategoryName={reportCategoryName}
                externalMaintainers={externalMaintainers}
                maintainerOptions={maintainerOptions}
                selectedExternalMaintainer={selectedExternalMaintainer}
                setSelectedExternalMaintainer={setSelectedExternalMaintainer}
                isLoadingMaintainers={isLoadingMaintainers}
                maintainersError={maintainersError}
                currentExternalMaintainerId={currentExternalMaintainerId}
                currentExternalMaintainerLabel={currentExternalMaintainerLabel}
                currentExternalMaintainerCompany={
                  currentExternalMaintainerCompany
                }
                isAssignButtonDisabled={isAssignButtonDisabled}
                assigningExternal={assigningExternal}
                handleAssignExternalMaintainer={handleAssignExternalMaintainer}
                handleImageClick={handleImageClick}
                onClose={onClose}
              />
            )}

            {modalPage === "comments" && (
              <TechReportCommentsTab
                comments={comments}
                userId={userId}
                newComment={newComment}
                setNewComment={setNewComment}
                writeComment={writeComment}
                isSubmittingComment={isSubmittingComment}
              />
            )}

            {modalPage === "citizenChat" && (
              <TechReportCommentsTab
                comments={citizenComments}
                userId={userId}
                newComment={newCommentExt}
                setNewComment={setNewCommentExt}
                writeComment={writeCommentExternal}
                isSubmittingComment={isSubmittingComment}
              />
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

function TechReportInfoTab({
  completeReportData,
  mapRef,
  modalPage,
  statusColumns,
  formatAddress,
  canAssignExternal,
  reportCategoryName,
  externalMaintainers,
  maintainerOptions,
  selectedExternalMaintainer,
  setSelectedExternalMaintainer,
  isLoadingMaintainers,
  maintainersError,
  currentExternalMaintainerId,
  currentExternalMaintainerLabel,
  currentExternalMaintainerCompany,
  isAssignButtonDisabled,
  assigningExternal,
  handleAssignExternalMaintainer,
  handleImageClick,
  onClose,
}) {
  const getMaintainerSelectOption = () => {
    if (isLoadingMaintainers) {
      return "Loading external maintainers...";
    }

    if (externalMaintainers.length === 0) {
      return "No external maintainers available";
    }

    return "Select an external maintainer";
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
          <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
          {formatAddress(completeReportData)}
        </p>
      </div>

      {/* Minimal read-only map */}
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

      <div className='mb-3 mt-2'>
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

      {completeReportData.photos && completeReportData.photos.length > 0 && (
        <div className='mb-3'>
          <strong>Photos:</strong>
          <div className='d-flex gap-2 mt-2 flex-wrap'>
            {completeReportData.photos.map((photo, index) => (
              <Button
                key={`${photo.url}-${index}`}
                variant='link'
                className='p-0 img-preview-button'
                onClick={() => handleImageClick(photo.url)}
                aria-label={`Open preview of report image ${index + 1}`}
                style={{ cursor: "pointer" }}
              >
                <img
                  src={photo.url}
                  alt={photo.description || `Report detail ${index + 1}`}
                  className='img-preview'
                  style={{ display: "block" }}
                />
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className='mb-3'>
        <strong>Category:</strong> {completeReportData.category.name}
      </div>

      <div className='mb-3'>
        <strong>Status:</strong> {statusColumns[completeReportData.status]}
      </div>

      {currentExternalMaintainerId && (
        <div className='mb-2 text-muted small'>
          Currently assigned to: {currentExternalMaintainerLabel}
          {currentExternalMaintainerCompany && (
            <span className='ms-1'>({currentExternalMaintainerCompany})</span>
          )}
        </div>
      )}

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
            disabled={isLoadingMaintainers || externalMaintainers.length === 0}
          >
            <option value=''>{getMaintainerSelectOption()}</option>
            {maintainerOptions.map((maintainer) => {
              const maintainerName =
                maintainer.fullName ||
                maintainer.username ||
                `Maintainer #${maintainer.id}`;

              const companyName = maintainer.companyName || "Unknown company";
              const categorySuffix = reportCategoryName
                ? ` • ${reportCategoryName}`
                : "";

              const optionLabel = `${maintainerName} — ${companyName}${categorySuffix}`;
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
            selectedExternalMaintainer === currentExternalMaintainerId &&
            currentExternalMaintainerId !== null && (
              <Form.Text className='text-muted d-block mt-1'>
                Select a different external maintainer to enable assignment.
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
              disabled={isAssignButtonDisabled}
              className='confirm-button'
            >
              {assigningExternal ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2' />{" "}
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
        <Button variant='secondary' onClick={onClose}>
          Cancel
        </Button>
      </div>
    </>
  );
}

function TechReportCommentsTab({
  comments,
  userId,
  newComment,
  setNewComment,
  writeComment,
  isSubmittingComment,
}) {
  const commentsEndRef = useRef(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [comments]);

  return (
    <div className='modal-comments-container'>
      <div className='comments-list'>
        {comments.length === 0 ? (
          <p className='text-muted'>No comments yet</p>
        ) : (
          <>
            {comments.map((c) => (
              <div
                key={c.id ?? `${c.user_id}-${c.timestamp}`}
                className='mb-3 pb-2 border-bottom'
              >
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
                            c.user_id === userId ? "#F5E078" : "#0350b5",
                          marginRight: "8px",
                        }}
                      />
                      <strong>
                        {c.user_id === userId
                          ? "Me"
                          : `${c.first_name} ${c.last_name}`}
                      </strong>
                    </div>
                  </div>

                  <small className='text-muted'>
                    {new Date(c.timestamp).toLocaleString()}
                  </small>
                </div>

                <div className='mt-1'>
                  <p className='mb-0 text-dark'>{c.text}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </>
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
                <span className='spinner-border spinner-border-sm me-2' />{" "}
                Posting...
              </>
            ) : (
              "Post comment"
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}

function ImagePreviewModal({ show, onClose, image }) {
  return (
    <Modal show={show} onHide={onClose} size='xl' centered>
      <Modal.Header closeButton>
        <Modal.Title>Photo Preview</Modal.Title>
      </Modal.Header>
      <Modal.Body className='text-center'>
        {image && (
          <img
            src={image}
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
  );
}

TechReportModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,

  isLoadingReportDetails: PropTypes.bool.isRequired,
  completeReportData: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
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
        description: PropTypes.string,
      })
    ),
    category: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }),
    status: PropTypes.string,
  }),

  mapRef: PropTypes.shape({ current: PropTypes.any }),

  statusColumns: PropTypes.objectOf(PropTypes.string).isRequired,
  formatAddress: PropTypes.func.isRequired,

  comments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      user_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      role_name: PropTypes.string,
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      timestamp: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]),
      text: PropTypes.string,
    })
  ).isRequired,
  citizenComments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      user_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      role_name: PropTypes.string,
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      timestamp: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]),
      text: PropTypes.string,
    })
  ).isRequired,
  userId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,

  modalPage: PropTypes.oneOf(["info", "comments", "citizenChat"]).isRequired,
  setModalPage: PropTypes.func.isRequired,

  newComment: PropTypes.string.isRequired,
  setNewComment: PropTypes.func.isRequired,
  writeComment: PropTypes.func.isRequired,
  newCommentExt: PropTypes.string.isRequired,
  setNewCommentExt: PropTypes.func.isRequired,
  writeCommentExternal: PropTypes.func.isRequired,
  isSubmittingComment: PropTypes.bool.isRequired,

  canAssignExternal: PropTypes.bool.isRequired,
  reportCategoryName: PropTypes.string,

  externalMaintainers: PropTypes.arrayOf(PropTypes.object).isRequired,
  maintainerOptions: PropTypes.arrayOf(PropTypes.object).isRequired,

  selectedExternalMaintainer: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  setSelectedExternalMaintainer: PropTypes.func.isRequired,

  isLoadingMaintainers: PropTypes.bool.isRequired,
  maintainersError: PropTypes.string,

  currentExternalMaintainerId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  currentExternalMaintainerLabel: PropTypes.string,
  currentExternalMaintainerCompany: PropTypes.string,

  isAssignButtonDisabled: PropTypes.bool.isRequired,
  assigningExternal: PropTypes.bool.isRequired,
  handleAssignExternalMaintainer: PropTypes.func.isRequired,

  handleImageClick: PropTypes.func.isRequired,
};

AssignedReportsBoard.propTypes = {
  loadingDone: PropTypes.bool.isRequired,
  reports: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string,
      address: PropTypes.string,
      created_at: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]),
      category_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      status: PropTypes.string,
    })
  ).isRequired,
  statusColumns: PropTypes.objectOf(PropTypes.string).isRequired,
  reportsByStatus: PropTypes.objectOf(PropTypes.array).isRequired,
  visibleCount: PropTypes.number.isRequired,
  maxReportsAvailable: PropTypes.number.isRequired,
  formatAddress: PropTypes.func.isRequired,
  categoryMap: PropTypes.objectOf(PropTypes.string).isRequired,
  getCategoryBadge: PropTypes.func.isRequired,
  onReportClick: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
};

TechReportInfoTab.propTypes = {
  completeReportData: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
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
        description: PropTypes.string,
      })
    ),
    category: PropTypes.shape({
      name: PropTypes.string.isRequired,
    }).isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,

  mapRef: PropTypes.shape({ current: PropTypes.any }),
  modalPage: PropTypes.oneOf(["info", "comments", "citizenChat"]).isRequired,

  statusColumns: PropTypes.objectOf(PropTypes.string).isRequired,
  formatAddress: PropTypes.func.isRequired,

  canAssignExternal: PropTypes.bool.isRequired,
  reportCategoryName: PropTypes.string,

  externalMaintainers: PropTypes.arrayOf(PropTypes.object).isRequired,
  maintainerOptions: PropTypes.arrayOf(PropTypes.object).isRequired,

  selectedExternalMaintainer: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  setSelectedExternalMaintainer: PropTypes.func.isRequired,

  isLoadingMaintainers: PropTypes.bool.isRequired,
  maintainersError: PropTypes.string,

  currentExternalMaintainerId: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  currentExternalMaintainerLabel: PropTypes.string,
  currentExternalMaintainerCompany: PropTypes.string,

  isAssignButtonDisabled: PropTypes.bool.isRequired,
  assigningExternal: PropTypes.bool.isRequired,
  handleAssignExternalMaintainer: PropTypes.func.isRequired,

  handleImageClick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

TechReportCommentsTab.propTypes = {
  comments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      user_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      role_name: PropTypes.string,
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      timestamp: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]).isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  userId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  newComment: PropTypes.string.isRequired,
  setNewComment: PropTypes.func.isRequired,
  writeComment: PropTypes.func.isRequired,
  isSubmittingComment: PropTypes.bool.isRequired,
};

ImagePreviewModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  image: PropTypes.string,
};

export default TechAssignedReports;
