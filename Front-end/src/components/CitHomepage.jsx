import { useEffect, useState, useRef } from "react";
import Map from "./Map";
import { getApprovedReports } from "../API/API";
import { Container, Col, Row, Card } from "react-bootstrap";
import { reverseGeocode } from "../utils/geocoding";

function CitHomepage(props) {
  const [reports, setReports] = useState([]);
  const [selectedReportID, setSelectedReportID] = useState(0);
  const [reportAddresses, setReportAddresses] = useState({});
  const [showMapOverlay, setShowMapOverlay] = useState(true);
  const reportRefs = useRef({});

  useEffect(() => {
    const loadReports = async () => {
      const reportList = await getApprovedReports();
      //   const reportList = [
      //     {
      //       id: 1,
      //       title: "Pothole on Main St",
      //       reporterName: "johndoe",
      //       position: { lat: 45.0705, lng: 7.686 },
      //     },
      //     {
      //       id: 2,
      //       title: "Broken streetlight",
      //       reporterName: "janedoe",
      //       position: { lat: 45.071, lng: 7.687 },
      //     },
      //     {
      //       id: 1,
      //       title: "Pothole on Main St",
      //       reporterName: "johndoe",
      //       position: { lat: 45.0705, lng: 7.686 },
      //     },
      //     {
      //       id: 2,
      //       title: "Broken streetlight",
      //       reporterName: "janedoe",
      //       position: { lat: 45.071, lng: 7.687 },
      //     },
      //     {
      //       id: 1,
      //       title: "Pothole on Main St",
      //       reporterName: "johndoe",
      //       position: { lat: 45.0705, lng: 7.686 },
      //     },
      //     {
      //       id: 2,
      //       title: "Broken streetlight",
      //       reporterName: "janedoe",
      //       position: { lat: 45.071, lng: 7.687 },
      //     },
      //   ];
      setReports(reportList);
      
      // Fetch addresses for all reports
      const addresses = {};
      for (const report of reportList) {
        if (report.position?.lat && report.position?.lng) {
          try {
            const address = await reverseGeocode(report.position.lat, report.position.lng);
            addresses[report.id] = address;
          } catch (error) {
            console.error(`Failed to geocode report ${report.id}:`, error);
            addresses[report.id] = `${report.position.lat}, ${report.position.lng}`;
          }
        }
      }
      setReportAddresses(addresses);
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
    <>
      <div style={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>
        <Container fluid className='body-font'>
          <Row style={{ height: "calc(100vh - 120px)" }}>
            {/* sidebar with list of reports */}
            <Col lg={3} className='d-flex flex-column h-100 p-0'>
              <div
                className='shadow-sm bg-white border-end h-100'
                style={{
                  height: "calc(100vh - 120px)",
                  overflowY: "auto",
                  padding: "15px",
                }}
              >
                <h5 className='fw-bold mb-3'>Reports Overview</h5>

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
                          style={{ cursor: "pointer" }}
                        >
                          <Card.Body>
                            <strong>{r.title}</strong>
                            <div className='text-muted small'>
                              Reported by: <b>{r.reporterName}</b>
                            </div>
                            <div className='small mt-2'>
                              <i className='bi bi-geo-alt-fill text-danger'></i>{" "}
                              {reportAddresses[r.id] || 'Loading address...'}
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
                      <i
                        className='bi bi-journals'
                        style={{ fontSize: "3rem", color: "#ccc" }}
                      ></i>
                      <p className='mt-3 mb-0 text-muted'>No reports yet</p>
                    </Card.Body>
                  </Card>
                )}
              </div>
            </Col>

            {/* Map */}
            <Col lg={9} className='p-0'>
              <div 
                style={{ height: "calc(100vh - 120px)", position: "relative" }}
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
                  <div
                    style={{
                      position: "absolute",
                      bottom: "20px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      zIndex: 999,
                      cursor: "pointer",
                    }}
                    onClick={() => setShowMapOverlay(false)}
                  >
                    <div
                      style={{
                        background: "rgba(34, 34, 34, 0.74)",
                        padding: "15px 25px",
                        borderRadius: "12px",
                        textAlign: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        border: "1px solid rgba(200, 200, 200, 0.3)",
                        animation: "blink 2s ease-in-out infinite",
                      }}
                    >
                      <i 
                        className="bi bi-hand-index-thumb" 
                        style={{ fontSize: "2rem", color: "white" }}
                      ></i>
                      <span className="ms-2" style={{ fontSize: "0.95rem", color: "#fff" }}>
                        Click or drag to explore the map
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
}

export default CitHomepage;
