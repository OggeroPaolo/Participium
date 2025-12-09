import { useEffect, useState, useRef } from "react";
import Map from "./Map";
import { getApprovedReports } from "../API/API";
import { Container, Col, Row, Card } from "react-bootstrap";
import { useNavigate } from "react-router";


function CitHomepage(props) {
  const [reports, setReports] = useState([]);
  const [selectedReportID, setSelectedReportID] = useState(0);
  const [showMapOverlay, setShowMapOverlay] = useState(true);
  const [showReportList, setShowReportList] = useState(false);
  const reportRefs = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadReports = async () => {
      const reportList = await getApprovedReports();
      setReports(reportList);
    };
    loadReports();
  }, []);

  // handle selection from list or map
  const handleSelectReport = (id) => {
    setSelectedReportID(id);

    // autoscroll
    if (reportRefs.current[id]) {
      reportRefs.current[id].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  return (
    <div className="cit-homepage-wrapper">
      <div className="cit-desktop-layout">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="d-none d-lg-block cit-reports-section">
          <h5 className="cit-reports-header">Reports Overview</h5>

          {reports.length !== 0 && (
            <>
              {reports.map((r) => {
                return (
                  <Card
                    key={r.id}
                    ref={(el) => (reportRefs.current[r.id] = el)}
                    className={`mt-2 shadow-sm report-card ${
                      selectedReportID === r.id ? "selected" : ""
                    }`}
                    onClick={() => handleSelectReport(r.id)}
                    onDoubleClick={() => navigate(`/reports/${r.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <Card.Body>
                      <strong>{r.title}</strong>
                      <div className='text-muted small'>
                        Reported by: <b>{r.reporterName}</b>
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

          {reports.length === 0 && (
            <Card className='m-3 shadow-sm'>
              <Card.Body className='text-center py-5'>
                <i className='bi bi-journals' style={{ fontSize: "3rem", color: "#ccc" }}></i>
                <p className='mt-3 mb-0 text-muted'>No reports yet</p>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* Map section */}
        <div 
          className="cit-map-section"
          onMouseDown={() => setShowMapOverlay(false)}
          onTouchStart={() => setShowMapOverlay(false)}
        >
          <Map
            center={[45.0703, 7.6869]}
            zoom={13}
            approvedReports={reports}
            selectedReportID={selectedReportID}
            onMarkerSelect={handleSelectReport}
          />
          
          {/* Interactive Overlay */}
          {showMapOverlay && (
            <div className="cit-map-overlay" onClick={() => setShowMapOverlay(false)}>
              <i className="bi bi-hand-index-thumb" style={{ fontSize: "2rem", color: "white" }}></i>
              <span className="ms-2" style={{ fontSize: "0.95rem", color: "#fff" }}>
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
          <div className='d-lg-none cit-mobile-overlay-backdrop' onClick={() => setShowReportList(false)} />
          <div className='d-lg-none cit-mobile-reports-overlay'>
          <div className='d-flex justify-content-between align-items-center mb-3'>
            <h5 className='fw-bold mb-0'>Reports Overview</h5>
            <button
              onClick={() => setShowReportList(false)}
              className="btn btn-link text-secondary"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {reports.length !== 0 && (
            <>
              {reports.map((r) => {
                return (
                  <Card
                    key={r.id}
                    className={`mt-2 shadow-sm report-card ${
                      selectedReportID === r.id ? "selected" : ""
                    }`}
                    onClick={() => {
                      handleSelectReport(r.id);
                      setShowReportList(false);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Card.Body>
                      <strong>{r.title}</strong>
                      <div className='text-muted small'>
                        Reported by: <b>{r.reporterName}</b>
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

          {reports.length === 0 && (
            <Card className='m-3 shadow-sm'>
              <Card.Body className='text-center py-5'>
                <i className='bi bi-journals' style={{ fontSize: "3rem", color: "#ccc" }}></i>
                <p className='mt-3 mb-0 text-muted'>No reports yet</p>
              </Card.Body>
            </Card>
          )}
          </div>
        </>
      )}
    </div>
  );
}

export default CitHomepage;
