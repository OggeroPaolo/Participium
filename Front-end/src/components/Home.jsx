import { Container, Row, Col } from "react-bootstrap";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import useUserStore from "../store/userStore";
import CitHomepage from "./CitHomepage";

function Home() {
  const { user, isAuthenticated } = useUserStore();
  const navigate = useNavigate();

  return (
    <>
      {isAuthenticated ? (
        user?.role_name === "Citizen" ? (
          <Container fluid style={{ padding: "20px" }} className='body-font'>
            <CitHomepage />
          </Container>
        ) : (
          <Container fluid className='mt-5 body-font'>
            <Row className='justify-content-center'>
              <Col md={8} lg={6} className='text-center'>
                <h3 className='mb-3'>Welcome, {user?.first_name}!</h3>
                <p className='text-muted'>
                  {user?.role_name === "Admin"
                    ? "Admin dashboard features coming soon."
                    : user?.role_type === "tech_officer"
                    ? "Operator dashboard features coming soon."
                    : user?.role_type === "external_maintainer"
                    ? "Discover the features of Participium."
                    : user?.role_name === "Municipal_public_relations_officer"
                    ? "Municipal officer dashboard features coming soon."
                    : "Loading..."}
                </p>
              </Col>
            </Row>
          </Container>
        )
      ) : (
        <Container fluid className='mt-5 body-font'>
          <Row className='justify-content-center'>
            <Col md={8} lg={6} className='text-center'>
              <h1 className='display-4 fw-bold mb-4'>Welcome to Participium</h1>
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
