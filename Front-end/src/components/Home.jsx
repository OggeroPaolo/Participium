import { Container, Row, Col } from "react-bootstrap";
import useUserStore from "../store/userStore";
import Map from "./Map";

function Home() {
  const { isAuthenticated } = useUserStore();

  return (
    <>
      {isAuthenticated ? (
        <Container fluid style={{ padding: '20px' }}>
          <div style={{ height: 'calc(100vh - 120px)' }}>
            <Map center={[45.0703, 7.6869]} zoom={13} />
          </div>
        </Container>
      ) : (
        <Container fluid className='mt-5 body-font'>
          <Row className="justify-content-center">
            <Col md={8} lg={6} className="text-center">
              <h1 className="display-4 fw-bold mb-4">
                Welcome to Participium
              </h1>
              <p className="lead mb-4">
                Join our community and start participating in civic engagement.
              </p>
            </Col>
          </Row>
        </Container>
      )}
    </>
  );
}

export default Home;


