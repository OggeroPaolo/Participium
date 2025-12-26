import CitHomepage from "../CitHomepage";
import PropTypes from "prop-types";
import { Container, Row, Col } from "react-bootstrap";

export function CitizenDashboard() {
  return (
    <Container fluid className='body-font' style={{ padding: "20px" }}>
      <CitHomepage />
    </Container>
  );
}

export function AuthenticatedUserDashboard({ user }) {
  return (
    <Container fluid className='mt-5 body-font dashboard-container'>
      <Row className='justify-content-center'>
        <Col xs={12} md={8} lg={6} className='text-center'>
          <h3 className='mb-3'>Welcome, {user?.first_name}!</h3>
          <p className='text-muted'>{getDashboardMessage(user)}</p>
        </Col>
      </Row>
    </Container>
  );
}

function getDashboardMessage(user) {
  if (user?.role_type === "admin") {
    return "Admin dashboard features coming soon."
  }
  if (user?.role_type === "tech_officer") {
    return "Operator dashboard features coming soon.";
  }
  if (user?.role_type === "external_maintainer") {
    return "Discover the features of Participium.";
  }
  if (user?.role_type === "pub_relations") {
    return "Municipal officer dashboard features coming soon."
  }

  return "Loading...";
}

AuthenticatedUserDashboard.propTypes = {
  user: PropTypes.shape({
    first_name: PropTypes.string,
    role_name: PropTypes.string,
    role_type: PropTypes.string,
  }).isRequired,
};
