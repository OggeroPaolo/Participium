import {
  Button,
  Card,
  Container,
  Row,
  Col,
  Image,
  Alert,
  InputGroup,
} from "react-bootstrap";
import { verifyEmail } from "../API/API";
import { Form } from "react-bootstrap";
import { useState, useRef } from "react";
import yellowbull from "../assets/yellowbull.png";
import { useNavigate } from "react-router";
import { useEmailStore } from "../store/emailStore";
import { loginWithEmail } from "../firebaseService";

function EmailCode() {
  const [code, setCode] = useState(Array(4).fill(""));
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [showPassword, setShowPassword] = useState(false);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  // email from zustand store
  const signupEmail = useEmailStore((state) => state.signupEmail);

  const handleChange = (value, index) => {
    // return if it's not a digit
    if (!/^[0-9]?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to the next box
    if (value && index < code.length - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Backspace goes to previous field
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    const finalCode = code.join("");

    try {
      await verifyEmail(signupEmail, finalCode);

      // complete login
      const credentials = {
        email: signupEmail,
        password: password,
      };
      await loginWithEmail(credentials);

      setAlert({
        show: true,
        message: "Email verified successfully",
        variant: "success",
      });

      // navigate if successful
      setTimeout(() => {
        navigate("/");
      }, 2500);
    } catch (error) {
      setAlert({ show: true, message: error.message, variant: "danger" });

      // reset field
      setCode(Array(4).fill(""));
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className='p-2 mt-3'>
      {alert.show && (
        <div className='w-100 d-flex justify-content-center mt-3'>
          <Alert
            variant={alert.variant}
            dismissible
            onClose={() => setAlert({ ...alert, show: false })}
            style={{ maxWidth: "640px", width: "100%" }}
          >
            {alert.message}
          </Alert>
        </div>
      )}

      <div className='d-flex justify-content-center align-items-center'>
        <Card
          className='p-4 m-4 shadow-sm'
          style={{ maxWidth: "640px", width: "100%" }}
        >
          <Row className='justify-content-center mb-3'>
            <Col xs='auto' className='text-center'>
              <Image
                src={yellowbull}
                fluid
                style={{ width: "100px", height: "auto" }}
              />
            </Col>
          </Row>
          <h4 className='text-center mb-3'>
            {" "}
            <i className='bi bi-envelope me-2'></i>Two-Factor Authentication
          </h4>
          <div className='d-flex justify-content-center align-items-start text-muted mb-4 ms-3 me-3'>
            <p className='m-0'>
              Enter the 4-digit code we sent to your email and your password.
            </p>
          </div>

          <Form onSubmit={handleSubmit}>
            <div className='d-flex justify-content-center gap-1 mb-4'>
              {code.map((digit, i) => (
                <input
                  key={i}
                  type='text'
                  maxLength={1}
                  className='form-control text-center'
                  style={{
                    width: "60px",
                    height: "70px",
                    fontSize: "28px",
                    margin: "0 4px",
                    border: "2px solid #0121495e",
                    borderRadius: "10px",
                  }}
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  ref={(el) => (inputsRef.current[i] = el)}
                />
              ))}
            </div>

            <Form.Group className='mb-4 pt-2'>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder='Password'
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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

            <Button
              type='submit'
              className='confirm-button w-100'
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2' />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </Form>
        </Card>
      </div>
    </Container>
  );
}

export default EmailCode;
