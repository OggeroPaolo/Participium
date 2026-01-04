import { useEffect, useState, useRef, useMemo } from "react";
import CityMap from "./CityMap";
import { getApprovedReports } from "../API/API";

import { Card, Form, InputGroup, Modal, Button } from "react-bootstrap";

import { useNavigate } from "react-router";
import useUserStore from "../store/userStore.js";

function CitHomepage(props) {
  const [reports, setReports] = useState([]);
  const [selectedReportID, setSelectedReportID] = useState(0);
  const [showMapOverlay, setShowMapOverlay] = useState(true);
  const [showReportList, setShowReportList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [userReports, setUserReports] = useState([]);
  const [showUserReports, setShowUserReports] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const reportRefs = useRef({});
  const navigate = useNavigate();

  const { user, isAuthenticated } = useUserStore();
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      const reportList = await getApprovedReports();
      setReports(reportList);

      if (isAuthenticated) {
        const myReports = reportList.filter(
          (r) => r.reporterUsername === user.username
        );
        setUserReports(myReports);
      }
    };
    loadReports();
  }, []);

  // Filter reports for dropdown suggestions based on address
  const reportSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    const query = searchQuery.toLowerCase().trim();
    return reports.filter((report) =>
      report.address?.toLowerCase().includes(query)
    );
  }, [reports, searchQuery]);

  // Handle clicking outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // handle selection from list or map
  const handleReportClick = (id) => {
    setSelectedReportID(id);

    // autoscroll
    if (reportRefs.current[id]) {
      reportRefs.current[id].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Handle report selection from dropdown
  const handleSelectReport = (reportId, address) => {
    setSelectedReportID(reportId);
    setSelectedAddress(address);
    setSearchQuery(address);
    setShowDropdown(false);

    // Scroll to the selected report in the list
    if (reportRefs.current[reportId]) {
      reportRefs.current[reportId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedAddress(""); // Clear selection when typing
    setSelectedReportID(0); // Clear report selection when typing
    setShowDropdown(value.trim().length > 0 && reportSuggestions.length > 0);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedAddress("");
    setShowDropdown(false);
  };

  // visualization of user reports helper
  const firstUserReportIndex = useMemo(() => {
    if (!isAuthenticated || userReports.length === 0) return -1;

    const firstUserReportId = userReports[0].id;

    return reports.findIndex((r) => r.id === firstUserReportId);
  }, [reports, userReports, isAuthenticated]);

  return (
    <div className='cit-homepage-wrapper body-font'>
      <div className='cit-desktop-layout'>
        {/* Desktop sidebar - hidden on mobile */}

        <div className='d-none d-lg-block cit-reports-section'>
          <h5 className='cit-reports-header'>Reports Overview</h5>

          {/* Search bar with dropdown */}
          <Form.Group className='mb-3 mt-3' style={{ position: "relative" }}>
            <InputGroup>
              <InputGroup.Text
                style={{
                  backgroundColor: "#0350b5",
                  color: "white",
                  borderColor: "#0350b5",
                }}
              >
                <i className='bi bi-search'></i>
              </InputGroup.Text>
              <div style={{ position: "relative", flex: 1 }}>
                <Form.Control
                  ref={searchInputRef}
                  type='text'
                  placeholder='Search by address...'
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (
                      searchQuery.trim().length > 0 &&
                      reportSuggestions.length > 0
                    ) {
                      setShowDropdown(true);
                    }
                  }}
                  style={{ borderColor: "#0350b5" }}
                />
              </div>
              {searchQuery && (
                <InputGroup.Text
                  role='button'
                  tabIndex={0}
                  aria-label='Clear search'
                  style={{
                    cursor: "pointer",
                    backgroundColor: "#0350b5",
                    color: "white",
                    borderColor: "#0350b5",
                  }}
                  onClick={handleClearSearch}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleClearSearch();
                    }
                  }}
                >
                  <i className='bi bi-x'></i>
                </InputGroup.Text>
              )}
            </InputGroup>
            {/* Dropdown with report suggestions */}
            {showDropdown && reportSuggestions.length > 0 && (
              <div
                ref={dropdownRef}
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                  backgroundColor: "white",
                  border: "1px solid #dee2e6",
                  borderRadius: "0.375rem",
                  marginTop: "2px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
                }}
              >
                {reportSuggestions.map((report, index) => (
                  <div
                    key={report.id}
                    role='button'
                    tabIndex={0}
                    aria-label={`Select report: ${report.title}`}
                    onClick={() =>
                      handleSelectReport(report.id, report.address)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectReport(report.id, report.address);
                      }
                    }}
                    style={{
                      padding: "10px 15px",
                      cursor: "pointer",
                      borderBottom:
                        index < reportSuggestions.length - 1
                          ? "1px solid #f0f0f0"
                          : "none",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "white";
                    }}
                    onFocus={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onBlur={(e) => {
                      e.target.style.backgroundColor = "white";
                    }}
                  >
                    <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                      {report.title}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                      <i className='bi bi-geo-alt-fill text-danger me-2'></i>
                      {report.address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Form.Group>

          {isAuthenticated && (
            <Form.Check
              type='switch'
              id='filter-my-reports'
              label='Show only my reports'
              checked={showUserReports}
              onChange={(e) => setShowUserReports(e.target.checked)}
              className='mt-2 mb-3'
            />
          )}

          {isAuthenticated &&
            userReports.length > 0 &&
            firstUserReportIndex >= 2 && (
              <Button
                size='sm'
                variant='outline-secondary'
                className='mb-2'
                onClick={() => {
                  const first = userReports[0];
                  if (reportRefs.current[first.id]) {
                    reportRefs.current[first.id].scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }}
              >
                <i className='bi bi-person-check me-1' /> Jump to my reports
              </Button>
            )}

          {(showUserReports ? userReports : reports) !== 0 && (
            <>
              {(showUserReports ? userReports : reports).map((r) => {
                return (
                  <Card
                    key={r.id}
                    ref={(el) => (reportRefs.current[r.id] = el)}
                    role='button'
                    tabIndex={0}
                    aria-label={`Select report: ${r.title}`}
                    className={`mt-2 shadow-sm report-card ${
                      selectedReportID === r.id ? "selected" : ""
                    } ${
                      isAuthenticated && r.reporterUsername === user.username
                        ? "my-report"
                        : ""
                    }`}
                    onClick={() => handleReportClick(r.id)}
                    onDoubleClick={() => navigate(`/reports/${r.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleReportClick(r.id);
                      } else if (e.key === " " && !e.shiftKey) {
                        e.preventDefault();
                        handleReportClick(r.id);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Card.Body>
                      <strong>{r.title}</strong>
                      <div className='text-muted small'>
                        Reported by:{" "}
                        {r.is_anonymous ? (
                          <b>Anonymous</b>
                        ) : (
                          <b>{r.reporterName}</b>
                        )}
                      </div>
                      <div className='small mt-2'>
                        <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
                        {r.address}
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </>
          )}

          {(showUserReports ? userReports : reports).length === 0 && (
            <Card className='m-3 shadow-sm'>
              <Card.Body className='text-center py-5'>
                <i
                  className='bi bi-journals'
                  style={{ fontSize: "3rem", color: "#ccc" }}
                ></i>
                <p className='mt-3 mb-0 text-muted'>No reports yet</p>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Map section */}
        <div
          className='cit-map-section'
          onMouseDown={() => setShowMapOverlay(false)}
          onTouchStart={() => setShowMapOverlay(false)}
        >
          <CityMap
            isAuthenticated={isAuthenticated}
            center={[45.0703, 7.6869]}
            zoom={13}
            approvedReports={reports}
            showUserReports = {showUserReports}
            userReports = {userReports}
            selectedReportID={selectedReportID}
            onMarkerSelect={handleReportClick}
          />

          {/* Interactive Overlay */}
          {showMapOverlay && (
            <div
              className='cit-map-overlay'
              role='button'
              tabIndex={0}
              aria-label='Close map overlay'
              onClick={() => setShowMapOverlay(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowMapOverlay(false);
                }
              }}
            >
              <i
                className='bi bi-hand-index-thumb'
                style={{ fontSize: "2rem", color: "white" }}
              ></i>
              <span
                className='ms-2'
                style={{ fontSize: "0.95rem", color: "#fff" }}
              >
                Click or drag to explore the map
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Floating button to open report list */}
      <button
        className='d-lg-none cit-mobile-toggle-btn'
        onClick={() => setShowReportList(true)}
      >
        Reports List
      </button>

      {/* Mobile: Overlay report list */}
      {showReportList && (
        <>
          <div
            className='d-lg-none cit-mobile-overlay-backdrop'
            role='button'
            tabIndex={0}
            aria-label='Close report list'
            onClick={() => setShowReportList(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowReportList(false);
              }
            }}
          />
          <div className='d-lg-none cit-mobile-reports-overlay'>
            <div className='d-flex justify-content-between align-items-center mb-3'>
              <h5 className='fw-bold mb-0'>Reports Overview</h5>
              <button
                onClick={() => setShowReportList(false)}
                className='btn btn-link text-secondary'
              >
                <i className='bi bi-x-lg'></i>
              </button>
            </div>

            {/* Search bar for mobile */}
            <Form.Group className='mb-3' style={{ position: "relative" }}>
              <InputGroup>
                <InputGroup.Text
                  style={{
                    backgroundColor: "#0350b5",
                    color: "white",
                    borderColor: "#0350b5",
                  }}
                >
                  <i className='bi bi-search'></i>
                </InputGroup.Text>
                <div style={{ position: "relative", flex: 1 }}>
                  <Form.Control
                    type='text'
                    placeholder='Search by address...'
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (
                        searchQuery.trim().length > 0 &&
                        reportSuggestions.length > 0
                      ) {
                        setShowDropdown(true);
                      }
                    }}
                    style={{ borderColor: "#0350b5" }}
                  />
                </div>
                {searchQuery && (
                  <InputGroup.Text
                    role='button'
                    tabIndex={0}
                    aria-label='Clear search'
                    style={{
                      cursor: "pointer",
                      backgroundColor: "#0350b5",
                      color: "white",
                      borderColor: "#0350b5",
                    }}
                    onClick={handleClearSearch}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClearSearch();
                      }
                    }}
                  >
                    <i className='bi bi-x'></i>
                  </InputGroup.Text>
                )}
              </InputGroup>
              {/* Dropdown with report suggestions */}
              {showDropdown && reportSuggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    backgroundColor: "white",
                    border: "1px solid #dee2e6",
                    borderRadius: "0.375rem",
                    marginTop: "2px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
                  }}
                >
                  {reportSuggestions.map((report, index) => (
                    <div
                      key={report.id}
                      role='button'
                      tabIndex={0}
                      aria-label={`Select report: ${report.title}`}
                      onClick={() => {
                        handleSelectReport(report.id, report.address);
                        setShowReportList(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectReport(report.id, report.address);
                          setShowReportList(false);
                        }
                      }}
                      style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        borderBottom:
                          index < reportSuggestions.length - 1
                            ? "1px solid #f0f0f0"
                            : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "white";
                      }}
                      onFocus={(e) => {
                        e.target.style.backgroundColor = "#f8f9fa";
                      }}
                      onBlur={(e) => {
                        e.target.style.backgroundColor = "white";
                      }}
                    >
                      <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                        {report.title}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#6c757d" }}>
                        <i className='bi bi-geo-alt-fill text-danger me-2'></i>
                        {report.address}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Form.Group>

            {(showUserReports ? userReports : reports).length !== 0 && (
              <>
                {(showUserReports ? userReports : reports).map((r) => {
                  return (
                    <Card
                      key={r.id}
                      role='button'
                      tabIndex={0}
                      aria-label={`Select report: ${r.title}`}
                      className={`mt-2 shadow-sm report-card ${
                        selectedReportID === r.id ? "selected" : ""
                      } ${
                        isAuthenticated && r.reporterUsername === user.username
                          ? "my-report"
                          : ""
                      }`}
                      onClick={() => {
                        handleReportClick(r.id);
                        setShowReportList(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleReportClick(r.id);
                          setShowReportList(false);
                        } else if (e.key === " " && !e.shiftKey) {
                          e.preventDefault();
                          handleReportClick(r.id);
                          setShowReportList(false);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <Card.Body>
                        <strong>{r.title}</strong>
                        <div className='text-muted small'>
                          Reported by:{" "}
                          {r.is_anonymous ? (
                            <b>Anonymous</b>
                          ) : (
                            <b>{r.reporterName}</b>
                          )}
                        </div>
                        <div className='small mt-2'>
                          <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
                          {r.address}
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </>
            )}

            {(showUserReports ? userReports : reports).length === 0 && (
              <Card className='m-3 shadow-sm'>
                <Card.Body className='text-center py-5'>
                  <i
                    className='bi bi-journals'
                    style={{ fontSize: "3rem", color: "#ccc" }}
                  ></i>
                  <p className='mt-3 mb-0 text-muted'>No reports yet</p>
                </Card.Body>
              </Card>
            )}
          </div>
        </>
      )}

      {/* welcome popup */}
      <Modal
        show={showWelcomeModal}
        onHide={() => setShowWelcomeModal(false)}
        centered
      >
        <Modal.Header closeButton className='border-0 pb-0'></Modal.Header>

        <Modal.Title className='fw-bold text-center'>
          Welcome to Participium
        </Modal.Title>
        <Modal.Body className='text-center px-4'>
          <p className='lead mb-3'>Your city, your voice.</p>

          <p className='text-muted mb-4'>
            Explore civic reports across the city, follow ongoing issues, and
            help improve your community.
          </p>

          <div className='text-muted '>
            Log in to create new reports and actively participate.
          </div>
        </Modal.Body>

        <Modal.Footer className='justify-content-center gap-2 pb-4'>
          <Button
            className='confirm-button px-4'
            onClick={() => setShowWelcomeModal(false)}
          >
            Start Exploring
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default CitHomepage;
