import { Outlet } from "react-router";
import { Navbar } from "react-bootstrap";
import { Container } from "react-bootstrap";
import yellowbull from "../assets/yellowbull.png";
import { Nav } from "react-bootstrap";
import NotificationBell from "./NotificationBell.jsx";

function Header(props) {
  const expand = "sm";
  const { user, isAuthenticated } = props;

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
                  {user?.role_name === "Admin" && (
                    <>
                      <Nav.Link href='/user-creation'>User Creation</Nav.Link>
                      <Nav.Link href='/user-list'>User List</Nav.Link>
                    </>
                  )}
                  <div className='nav-divider d-sm-none'></div>
                  {user?.role_name === "Citizen" && (
                    <Nav.Link href='/create-report'>New Report</Nav.Link>
                  )}
                  <NotificationBell />
                  <Nav.Link href='#' onClick={handleLogout}>
                    Logout
                  </Nav.Link>
                </>
              ) : (
                <>
                  <Nav.Link href='/login'>Login</Nav.Link>
                  <Nav.Link href='/signup'>Signup</Nav.Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Outlet />
    </>
  );
}

export default Header;
