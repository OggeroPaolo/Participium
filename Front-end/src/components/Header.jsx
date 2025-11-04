import { Outlet } from "react-router";
import { Navbar } from "react-bootstrap";
import { Container } from "react-bootstrap";
import yellowbull from "../assets/yellowbull.png";
import { Nav } from "react-bootstrap";

function Header() {
  const expand = "sm";

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
              <Nav.Link href='/signup'>Sign Up</Nav.Link>
              <Nav.Link href='/login'>Log in</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Outlet />
    </>
  );
}

export default Header;
