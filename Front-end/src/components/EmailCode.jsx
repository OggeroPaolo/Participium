import {
  Button,
  Card,
  Container,
  Row,
  Col,
  Image,
  Alert,
  InputGroup,
  Modal,
} from "react-bootstrap";
import { verifyEmail, resendCode } from "../API/API";
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
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  // resend code states
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // email from zustand store
  const signupEmail = useEmailStore((state) => state.signupEmail);

  const handleChange = async (value, index) => {
    // return if it's not a digit
    if (!/^[0-9]?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to the next box
    if (value && index < code.length - 1) {
      inputsRef.current[index + 1].focus();
    }

    // verify code automatically when 4 digits are entered
    const joined = newCode.join("");
    if (joined.length === 4 && !newCode.includes("")) {
      await verifyEnteredCode(joined);
    }
  };

  const handleKeyDown = (e, index) => {
    // Backspace goes to previous field
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  // verify code only
  const verifyEnteredCode = async (finalCode) => {
    try {
      await verifyEmail(signupEmail, finalCode);
      setIsCodeVerified(true);
    } catch (error) {
      setIsCodeVerified(false);

      setShowExpiredModal(true);
      // code expired (410)
      if (error.message === "Verification code expired") {
        setShowExpiredModal(true);
        setCode(Array(4).fill(""));
        inputsRef.current[0]?.focus();
        return;
      }

      setAlert({
        show: true,
        message: error.message,
        variant: "danger",
      });

      // reset code fields
      setCode(Array(4).fill(""));
      inputsRef.current[0]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isCodeVerified) {
      setAlert({
        show: true,
        message: "Please enter a valid code first",
        variant: "danger",
      });
      return;
    }

    setIsSubmitting(true);

    try {
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
        useEmailStore.getState.clearSignupData();
      }, 2500);
    } catch (error) {
      let message = error.message;
      // firebase error messages
      if (error.code === "auth/invalid-credential")
        message = "Incorrect password.";
      else if (error.code === "auth/too-many-requests")
        message = "Too many failed attempts, please try later.";

      setAlert({ show: true, message: message, variant: "danger" });

      // reset field
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // resend handler
  const handleResendCode = async () => {
    try {
      setIsResending(true);
      await resendCode(signupEmail);

      // Close modal
      setShowExpiredModal(false);

      // Reset verification state
      setIsCodeVerified(false);
      setCode(Array(4).fill(""));
      inputsRef.current[0]?.focus();

      // Inform user
      setAlert({
        show: true,
        message: "A new code has been sent to your email.",
        variant: "success",
      });
    } catch (error) {
      setAlert({
        show: true,
        message: "Failed to resend code. Try again.",
        variant: "danger",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Container className='p-2 mt-3'>
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
            {isCodeVerified && (
              <div className='text-center mb-3'>
                <i className='bi bi-check-circle-fill text-success fs-2'></i>
                <p className='text-success mt-1 mb-0'>Code verified!</p>
              </div>
            )}

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
                "Verify and login"
              )}
            </Button>
          </Form>
        </Card>
      </div>

      {/* modal for code expired */}
      <Modal
        show={showExpiredModal}
        onHide={() => setShowExpiredModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Code Expired</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          The verification code has expired. You need to request a new one.
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant='secondary'
            onClick={() => setShowExpiredModal(false)}
            disabled={isResending}
          >
            Cancel
          </Button>

          <Button
            variant='primary'
            className='confirm-button'
            onClick={handleResendCode}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <span className='spinner-border spinner-border-sm me-2'></span>
                Sending...
              </>
            ) : (
              "Send Code"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default EmailCode;
