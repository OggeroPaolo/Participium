import { useEffect, useState } from "react";
import Map from "./Map";
import { getReportBasics } from "../API/API";
import { Container, Col, Row, Card, Badge } from "react-bootstrap";

function CitHomepage() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const loadReports = async () => {
      //const reportList = await getReportBasics();
      const reportList = [
        {
          id: 1,
          title: "Pothole on Main St",
          reporterName: "johndoe",
          position: { lat: 45.0705, lng: 7.686 },
        },
        {
          id: 2,
          title: "Broken streetlight",
          reporterName: "janedoe",
          position: { lat: 45.071, lng: 7.687 },
        },
        {
          id: 1,
          title: "Pothole on Main St",
          reporterName: "johndoe",
          position: { lat: 45.0705, lng: 7.686 },
        },
        {
          id: 2,
          title: "Broken streetlight",
          reporterName: "janedoe",
          position: { lat: 45.071, lng: 7.687 },
        },
        {
          id: 1,
          title: "Pothole on Main St",
          reporterName: "johndoe",
          position: { lat: 45.0705, lng: 7.686 },
        },
        {
          id: 2,
          title: "Broken streetlight",
          reporterName: "janedoe",
          position: { lat: 45.071, lng: 7.687 },
        },
      ];
      setReports(reportList);
    };
    loadReports();
  }, []);

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
                        <Card key={r.id} className='mt-2 shadow-sm'>
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
              <div style={{ height: "calc(100vh - 120px)" }}>
                <Map center={[45.0703, 7.6869]} zoom={13} />
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
}

export default CitHomepage;
