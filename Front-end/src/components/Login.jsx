import { useActionState, useState } from "react";
import { Form, Button, Container, InputGroup } from "react-bootstrap";
import { loginWithEmail } from "../firebaseService";


function Login(props) {
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction] = useActionState(submitCredentials, {
    email: "",
    password: "",
  });

  async function submitCredentials(prevData, formData) {
    const credentials = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      await loginWithEmail(credentials);
      return { success: true };
    } catch (error) {
      let message = "Invalid login";
      if (error.code === "auth/user-not-found") message = "User not found.";
      else if (error.code === "auth/wrong-password") message = "Incorrect email or password.";
      else if (error.code === "auth/too-many-requests") message = "Too many failed attempts, please try later.";
      return { error: message };
    }
  }

  return (
    <>
      <Container
        fluid
        className='mt-5 ms-1 me-1 d-flex justify-content-center body-font'
      >
        <Container
          className='p-4 mt-5'
          style={{ maxWidth: "400px", width: "100%" }}
        >
          <h2 style={{ fontWeight: 700 }}>
            <b>Welcome!</b>
          </h2>
          <Form action={formAction} className='mt-5 mb-3'>
            <Form.Group controlId='email' className='mb-3'>
              <Form.Label>
                <b>Email</b>
              </Form.Label>
              <Form.Control
                type='email'
                name='email'
                required
                placeholder='Email address'
              />
            </Form.Group>
            <Form.Group controlId='password' className='mb-2'>
              <Form.Label>
                <b>Password</b>
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  name='password'
                  required
                  placeholder='Password'
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
            {state.error && <p className='text-danger'>{state.error}</p>}

            <Button type='submit' className='mt-4 confirm-button w-100'>
              LOGIN
            </Button>
          </Form>

          <Container className='d-flex justify-content-center align-items-center'>
            <p className='subtitle' style={{ fontSize: "0.9rem" }}>
              <b>
                {" "}
                Not a member? <a href='/signup'>Register now</a>{" "}
              </b>
            </p>
          </Container>
        </Container>
      </Container>
    </>
  );
}

export default Login;
