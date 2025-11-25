import { useEffect, useState, useRef } from "react";
import Map from "./Map";
import { getApprovedReports } from "../API/API";
import { Container, Col, Row, Card } from "react-bootstrap";

function CitHomepage(props) {
  const [reports, setReports] = useState([]);
  const [selectedReportID, setSelectedReportID] = useState(0);
  const [activeTab, setActiveTab] = useState("map");
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.innerWidth >= 992;
  });
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

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setIsDesktop(window.innerWidth >= 992);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderReportList = (extraClasses = "") => (
    <div className={`shadow-sm bg-white cit-sidebar-scroll ${extraClasses}`}>
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
                    {r.position.lat}, {r.position.lng}
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
  );

  const renderMapPanel = (customClass = "") => (
    <div className={`cit-map-panel ${customClass}`}>
      <Map
        center={[45.0703, 7.6869]}
        zoom={13}
        approvedReports={reports}
        selectedReportID={selectedReportID}
        onMarkerSelect={handleSelectReport}
      />
    </div>
  );

  return (
    <>
      <div className='cit-layout'>
        <Container fluid className='body-font h-100'>
          {isDesktop ? (
            <Row className='cit-desktop-row'>
              <Col lg={3} className='d-flex flex-column h-100 p-0'>
                {renderReportList()}
              </Col>
              <Col lg={9} className='p-0'>
                {renderMapPanel()}
              </Col>
            </Row>
          ) : (
            <div className='cit-mobile-wrapper'>
              <div className='cit-mobile-tabs'>
                <button
                  type='button'
                  className={`cit-tab-btn ${activeTab === "map" ? "active" : ""}`}
                  onClick={() => setActiveTab("map")}
                >
                  Map View
                </button>
                <button
                  type='button'
                  className={`cit-tab-btn ${activeTab === "list" ? "active" : ""}`}
                  onClick={() => setActiveTab("list")}
                >
                  List View
                </button>
              </div>

              {activeTab === "map"
                ? renderMapPanel("cit-map-panel--mobile")
                : renderReportList("cit-sidebar-scroll--mobile")}
            </div>
          )}
        </Container>
      </div>
    </>
  );
}

export default CitHomepage;
