import { useActionState, useEffect, useState } from "react";
import { Form, Button, Container, Alert, InputGroup } from "react-bootstrap";
import { useNavigate } from "react-router";
import { createInternalUser, getUserRoles } from "../API/API.js";

function UserCreation() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const loadRoles = async () => {
      const roleList = await getUserRoles();
      setRoles(roleList);
    };

    loadRoles();
  }, []);

  const [state, formAction] = useActionState(submitCredentials, {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    userRole: "",
  });

  async function submitCredentials(prevData, formData) {
    const credentials = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
      role_id: formData.get("userRole"),
    };

    try {
      await createInternalUser(credentials);
      setTimeout(() => {
        navigate("/user-list");
      }, 2500);
      return {
        success: "Account created successfully! Redirecting to users list...",
      };
    } catch (error) {
      return { error: "Invalid user creation" };
    }
  }

  // string formatter for user roles
  function formatRole(role) {
    const r = role.name;
    return r
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return (
    <>
      <Container
        fluid
        className='mt-3 ms-1 me-1 d-flex justify-content-center body-font'
      >
        <Container className='p-4' style={{ maxWidth: "800px" }}>
          <h3>
            <b>Create a new user</b>
          </h3>
          {state.success && (
            <Alert variant='success' className='mt-4'>
              {state.success}
            </Alert>
          )}
          <Form action={formAction}>
            <Form.Group controlId='firstName' className='mb-3 mt-4'>
              <Form.Label>
                <b>First name</b>
              </Form.Label>
              <Form.Control type='text' name='firstName' required />
            </Form.Group>
            <Form.Group controlId='lastName' className='mb-3'>
              <Form.Label>
                <b>Last Name</b>
              </Form.Label>
              <Form.Control type='text' name='lastName' required />
            </Form.Group>
            <Form.Group controlId='username' className='mb-3'>
              <Form.Label>
                <b>Username</b>
              </Form.Label>
              <Form.Control type='text' name='username' required />
            </Form.Group>
            <Form.Group controlId='email' className='mb-3'>
              <Form.Label>
                <b>Email</b>
              </Form.Label>
              <Form.Control type='email' name='email' required />
            </Form.Group>
            <Form.Group controlId='password' className='mb-3'>
              <Form.Label>
                <b>Password</b>
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  name='password'
                  required
                  placeholder='Enter password'
                ></Form.Control>
                <Button
                  variant='outline-secondary'
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <i className='bi bi-eye-slash'></i>
                  ) : (
                    <i className='bi bi-eye'></i>
                  )}
                </Button>
              </InputGroup>
            </Form.Group>
            <Form.Group controlId='userRole' className='mb-3'>
              <Form.Label>
                <b>User role</b>
              </Form.Label>
              <Form.Select name='userRole' required>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatRole(r)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {state.error && <Alert variant='danger'>{state.error}</Alert>}

            <Button type='submit' className='mt-4 confirm-button w-100'>
              CREATE USER
            </Button>
          </Form>
        </Container>
      </Container>
    </>
  );
}

export default UserCreation;
