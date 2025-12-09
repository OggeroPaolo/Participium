import { Button, Card, Container, Row, Col, Image } from "react-bootstrap";
import { verifyEmail } from "../API/API";
import { Form } from "react-bootstrap";
import { useState, useRef } from "react";
import yellowbull from "../assets/yellowbull.png";

function EmailCode() {
  const [code, setCode] = useState(Array(4).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputsRef = useRef([]);

  const handleChange = (value, index) => {
    // return if it's not a digit
    if (!/^[0-9]?$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to the next box
    if (value && index < 5) {
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
      await verifyEmail(props.email, finalCode);

      setAlert({
        show: true,
        message: "Status updated successfully",
        variant: "success",
      });

      // navigate if successful
    } catch (error) {
      setAlert({ show: true, message: error.message, variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className='d-flex justify-content-center align-items-center p-3 mt-4'>
      <Card
        className='p-4 m-4 shadow-sm'
        style={{ maxWidth: "620px", width: "100%" }}
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
        <h4 className='text-center mb-3'>Two-Factor Authentication</h4>
        <div className='d-flex justify-content-center align-items-center text-muted mb-4'>
          <i class='bi bi-envelope me-2'></i>
          <p className='m-0'>Enter the 4-digit code we sent to your email.</p>
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
    </Container>
  );
}

export default EmailCode;
