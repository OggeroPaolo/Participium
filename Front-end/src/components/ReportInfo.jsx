import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { getReport } from "../API/API";
import yellowbull from "../assets/yellowbull.png";
import { Container, Row, Col, Carousel, Card } from "react-bootstrap";

function ReportInfo() {
  const { rid } = useParams();
  const [report, setReport] = useState({
    title: "broken street light",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc posuere erat eu turpis congue tincidunt ac ut metus. Integer iaculis arcu at dui tincidunt, at pretium eros rutrum. Donec vitae nisl sapien. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec mauris dui, elementum at magna a, viverra vulputate dolor. Vivamus euismod fringilla risus, at dignissim dolor finibus eu. Etiam odio arcu, consequat luctus nisi ac, aliquet blandit orci. Sed semper metus urna, id laoreet nisl tincidunt quis. Morbi cursus dolor sit amet est interdum auctor at ac justo.",
    user: {
      firstName: "mario",
      lastName: "rossi",
    },
    images: [yellowbull, yellowbull],
    category: "public lights",
    position: {
      lat: 45.0485,
      lng: 7.04534,
    },
    creationdate: "2025-11-11",
  });

  useEffect(() => {
    const loadReport = async () => {
      // const reportById = await getReport(rid);
      const reportById = {
        title: "broken street light",
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc posuere erat eu turpis congue tincidunt ac ut metus. Integer iaculis arcu at dui tincidunt, at pretium eros rutrum. Donec vitae nisl sapien. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec mauris dui, elementum at magna a, viverra vulputate dolor. Vivamus euismod fringilla risus, at dignissim dolor finibus eu. Etiam odio arcu, consequat luctus nisi ac, aliquet blandit orci. Sed semper metus urna, id laoreet nisl tincidunt quis. Morbi cursus dolor sit amet est interdum auctor at ac justo.",
        user: {
          firstName: "mario",
          lastName: "rossi",
        },
        images: [yellowbull, yellowbull],
        category: "public lights",
        position: {
          lat: 45.545746,
          lng: 7.04534,
        },
        creationdate: "2025-11-11",
      };

      setReport(reportById);
    };
    loadReport();
  }, []);

  return (
    <>
      <Container fluid className='mt-4 body-font '>
        <h2 className='mb-4 text-center'>
          <b>{report.title}</b>
        </h2>
        <Row className='p-4 justify-content-center'>
          <Col md={5} className='me-2'>
            <Card className='shadow-sm'>
              <Carousel interval={null}>
                {report.images.map((img) => {
                  return (
                    <Carousel.Item key={img} className='car-itm'>
                      <img className='d-block w-100 report-car' src={img}></img>
                    </Carousel.Item>
                  );
                })}
              </Carousel>
            </Card>
          </Col>
          <Col md={6} className='ps-3 ms-4'>
            <p>
              <i className='bi bi-geo-alt-fill text-danger me-2'></i>{" "}
              <b>Position:</b> {report.position.lat}, {report.position.lng}
            </p>
            <p>
              <i className='bi bi-person-fill me-2'></i> <b>Reported by:</b>{" "}
              {report.user.firstName} {report.user.lastName}
            </p>
            <p>
              {" "}
              <i className='bi bi-tag-fill me-2 text-primary'></i>
              <b>Category:</b> {report.category}
            </p>
            <p className='mt-3'>
              <i className='bi bi-calendar-event-fill text-success me-2'></i>{" "}
              <b>Created on:</b> {report.creationdate}
            </p>
            <h6 className='fw-bold mb-2'>Description</h6>
            <Card className='p-3 bg-light border-0'>
              <p className='mb-0'>{report.description}</p>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default ReportInfo;
