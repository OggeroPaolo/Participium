import { Link } from "react-router";
import { useActionState } from "react";
import { Form, Button, Container } from "react-bootstrap";

function Signup() {
  const [state, formAction] = useActionState(submitCredentials, {
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
      passwordConfirm: formData.get("passwordConfirm"),
    };
    try {
      await handleSignup(credentials);
      return { success: true };
    } catch (error) {
      return { error: "Invalid signup" };
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
              <Form.Control
                type='password'
                name='password'
                required
                placeholder='Enter password'
              ></Form.Control>
            </Form.Group>
            <Form.Group controlId='passwordConfirm' className='mb-3'>
              <Form.Control
                type='password'
                name='passwordConfirm'
                required
                placeholder='Confirm password'
              ></Form.Control>
            </Form.Group>

            {state.error && <p className='text-danger'>{state.error}</p>}

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
