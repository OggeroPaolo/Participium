import { Outlet } from "react-router";
import { Navbar } from "react-bootstrap";
import { Container } from "react-bootstrap";
import yellowbull from "../assets/yellowbull.png";
import { Nav } from "react-bootstrap";
import NotificationBell from "./NotificationBell.jsx";
import WelcomeModal from "./HomeComponents/WelcomeModal.jsx";
import { useState } from "react";

function Header(props) {
  const expand = "sm";
  const { user, isAuthenticated } = props;

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const displayName =
    user?.username || user?.first_name || user?.email || "User";

  const handleLogout = async (e) => {
    e.preventDefault();
    if (props.onLogout) {
      await props.onLogout();
    }
  };

  return (
    <>
      <Navbar
        expand={expand}
        sticky='top'
        className='site-header'
        data-bs-theme='dark'
      >
        <Container
          fluid
          className='d-flex align-items-center justify-content-between'
        >
          <Navbar.Brand href='/'>
            <img
              alt='logo'
              src={yellowbull}
              width='30'
              height='30'
              className='d-inline-block align-top me-1'
            />{" "}
            Participium
          </Navbar.Brand>
          <Navbar.Toggle aria-controls='responsive-navbar-nav' />
          <Navbar.Collapse id='responsive-navbar-nav'>
            <Nav className='ms-auto'>
              {isAuthenticated ? (
                <>
                  {user && (
                    <Navbar.Text className='me-3 nav-text'>
                      <span>Welcome, </span>
                      <span>{displayName}</span>
                    </Navbar.Text>
                  )}
                  {user?.role_type === "admin" && (
                    <>
                      <Nav.Link href='/user-creation'>User Creation</Nav.Link>
                      <Nav.Link href='/user-list'>User List</Nav.Link>
                    </>
                  )}
                  {user?.role_type === "citizen" && (
                    <>
                      <Nav.Link href='/create-report'>New Report</Nav.Link>
                      <Nav.Link
                        href='/profile'
                        className='nav-icon-link'
                        title='Profile'
                      >
                        <i className='bi bi-person-circle fs-5'></i>
                      </Nav.Link>
                      <Nav.Link
                        role='button'
                        className='nav-icon-link'
                        title='Info'
                        onClick={() => setShowWelcomeModal(true)}
                      >
                        <i className='bi bi-question-circle fs-5'></i>
                      </Nav.Link>
                    </>
                  )}

                  <NotificationBell />

                  {user?.role_type === "tech_officer" && (
                    <>
                      <Nav.Link href='/tech-assigned-reports'>
                        Assigned reports
                      </Nav.Link>
                    </>
                  )}
                  {user?.role_type === "external_maintainer" && (
                    <>
                      <Nav.Link href='/ext-assigned-reports'>
                        Assigned reports
                      </Nav.Link>
                    </>
                  )}
                  {user?.role_type === "pub_relations" && (
                    <>
                      <Nav.Link href='/review-reports'>Review reports</Nav.Link>
                    </>
                  )}

                  <Nav.Link href='#' onClick={handleLogout}>
                    Logout
                  </Nav.Link>
                </>
              ) : (
                <>
                  <Nav.Link href='/login'>Login</Nav.Link>
                  <Nav.Link href='/signup'>Signup</Nav.Link>
                  <Nav.Link
                    role='button'
                    className='nav-icon-link'
                    title='Info'
                    onClick={() => setShowWelcomeModal(true)}
                  >
                    <i className='bi bi-question-circle fs-5 ms-2'></i>
                  </Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Outlet />
      <WelcomeModal
        showWelcomeModal={showWelcomeModal}
        setShowWelcomeModal={setShowWelcomeModal}
      />
    </>
  );
}

export default Header;
