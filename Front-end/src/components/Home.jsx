import { Container, Row, Col } from "react-bootstrap";
import { useEffect, useState } from "react";
import useUserStore from "../store/userStore";
import Map from "./Map";
import { getApprovedReports } from "../API/API.js"

function Home() {
  const { user, isAuthenticated } = useUserStore();
  const [approvedReports, setapprovedReports] = useState(null);

  useEffect(() => {
    const loadApprovedReports = async () => {
      const reportList = await getApprovedReports();
      setapprovedReports(reportList);
    };

    loadApprovedReports();
  }, []);

  return (
    <>
      {isAuthenticated ? (
        user?.role_type === 'citizen' ? (
          <Container fluid style={{ padding: '20px' }} className='body-font'>
            <div style={{ height: 'calc(100vh - 120px)' }}>
              <Map center={[45.0703, 7.6869]} zoom={13} approvedReports={approvedReports} />
            </div>
          </Container>
        ) : (
          <Container fluid className='mt-5 body-font'>
            <Row className='justify-content-center'>
              <Col md={8} lg={6} className='text-center'>
                <h3 className='mb-3'>Welcome, {user?.first_name}!</h3>
                <p className='text-muted'>
                  Admin and operator features coming soon.
                </p>
              </Col>
            </Row>
          </Container>
        )
      ) : (
        <Container fluid className='mt-5 body-font'>
          <Row className='justify-content-center'>
            <Col md={8} lg={6} className='text-center'>
              <h1 className='display-4 fw-bold mb-4'>
                Welcome to Participium
              </h1>
              <p className='lead mb-4'>
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


