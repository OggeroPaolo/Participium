import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { getReport } from "../API/API";
//import yellowbull from "../assets/yellowbull.png";
import { Container, Row, Col, Carousel, Card } from "react-bootstrap";

function ReportInfo() {
  const { rid } = useParams();
  const [report, setReport] = useState({});
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      const reportById = await getReport(rid);
      setReport(reportById);
      setLoadingDone(true);
    };
    loadReport();
  }, []);

  return (
    <>
      <Container fluid className='mt-4 body-font '>
        <h2 className='mb-4 text-center'>
          <b>{report.title}</b>
        </h2>

        {!loadingDone && (
          <div className='text-center mt-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        )}

        {loadingDone && (
          <Row className='p-4 justify-content-center'>
            <Col md={5} className='me-2'>
              <Card className='shadow-sm'>
                <Carousel interval={null}>
                  {report.photos.map((img, idx) => {
                    console.log(img);
                    return (
                      <Carousel.Item key={idx} className='car-itm'>
                        <img
                          className='d-block w-100 report-car'
                          src={img.url}
                        ></img>
                      </Carousel.Item>
                    );
                  })}
                </Carousel>
              </Card>
            </Col>
            <Col md={6} className='ps-3 ms-4'>
              <p>
                <i className='bi bi-geo-alt-fill text-danger me-2'></i>{" "}
                <b>Position:</b> {report.position_lat}, {report.position_lng}
              </p>
              <p>
                <i className='bi bi-person-fill me-2'></i> <b>Reported by:</b>{" "}
                {report.user.complete_name}
              </p>
              <p>
                {" "}
                <i className='bi bi-tag-fill me-2 text-primary'></i>
                <b>Category:</b> {report.category.name}
              </p>
              <p className='mt-3'>
                <i className='bi bi-calendar-event-fill text-success me-2'></i>{" "}
                <b>Created on:</b> {Date(report.created_at).slice(0, 15)}
              </p>
              <h6 className='fw-bold mb-2'>Description</h6>
              <Card className='p-3 bg-light border-0'>
                <p className='mb-0'>{report.description}</p>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
}

export default ReportInfo;
