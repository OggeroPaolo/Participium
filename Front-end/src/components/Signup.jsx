import { useActionState, useState } from "react";
import { Form, Button, Container, Alert, InputGroup } from "react-bootstrap";
import { handleSignup } from "../API/API";
import { useNavigate } from "react-router";
import { useEmailStore } from "../store/emailStore";

function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConf, setShowPasswordConf] = useState(false);

  // store email with zustand so user does not have to enter it again during verification
  const { setSignupEmail } = useEmailStore();

  const [state, formAction, isPending] = useActionState(submitCredentials, {
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  async function submitCredentials(prevData, formData) {
    const credentials = {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const passwordConfirm = formData.get("passwordConfirm");

    if (credentials.password !== passwordConfirm) {
      return { error: "Passwords do not match" };
    }

    try {
      await handleSignup(credentials);

      // save email
      setSignupEmail(credentials.email);

      setTimeout(() => {
        // redirection to code verification
        navigate("/email-verification");
      }, 2500);
      return {
        success:
          "Account created successfully! Redirecting to email verification...",
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  return (
    <>
      <Container
        fluid
        className='mt-3 ms-1 me-1 d-flex justify-content-center body-font'
      >
        <Container className='p-4' style={{ maxWidth: "400px", width: "100%" }}>
          <h3>
            <b>Sign up</b>
          </h3>
          <p className='subtitle'> Create an account to get started</p>
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
            <Form.Group controlId='password' className='mb-2'>
              <Form.Label>
                <b>Password</b>
              </Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  name='password'
                  required
                  placeholder='Enter password'
                  minLength='6'
                  maxLength='25'
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
            <Form.Group controlId='passwordConfirm' className='mb-3'>
              <InputGroup>
                <Form.Control
                  type={showPasswordConf ? "text" : "password"}
                  name='passwordConfirm'
                  required
                  placeholder='Confirm password'
                  minLength='6'
                  maxLength='25'
                ></Form.Control>
                <Button
                  variant='outline-secondary'
                  onClick={() => setShowPasswordConf((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPasswordConf ? (
                    <i className='bi bi-eye-slash'></i>
                  ) : (
                    <i className='bi bi-eye'></i>
                  )}
                </Button>
              </InputGroup>
            </Form.Group>

            {state.error && <Alert variant='danger'>{state.error}</Alert>}
            {state.success && (
              <Alert variant='success' className='mt-4'>
                {state.success}
              </Alert>
            )}
            {isPending && (
              <div className='loading-overlay'>
                <div
                  className='spinner-border text-light'
                  style={{ width: "3rem", height: "3rem" }}
                ></div>
                <div className='mt-3 text-light fw-semibold'>Signing in...</div>
              </div>
            )}

            <Button type='submit' className='mt-4 confirm-button w-100'>
              SIGNUP
            </Button>
          </Form>
        </Container>
      </Container>
    </>
  );
}

export default Signup;
