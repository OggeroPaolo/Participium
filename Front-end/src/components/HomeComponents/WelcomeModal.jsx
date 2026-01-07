import { Modal, Button } from "react-bootstrap";
import PropTypes from "prop-types";

function WelcomeModal({ showWelcomeModal, setShowWelcomeModal }) {
  return (
    <Modal
      show={showWelcomeModal}
      onHide={() => setShowWelcomeModal(false)}
      centered
    >
      <Modal.Header closeButton className='border-0 pb-0'></Modal.Header>

      <Modal.Title className='fw-bold text-center'>
        Welcome to Participium
      </Modal.Title>
      <Modal.Body className='text-center px-4'>
        <p className='lead mb-3'>Your city, your voice.</p>

        <p className='text-muted mb-4'>
          Explore civic reports across the city, follow ongoing issues, and help
          improve your community.
        </p>

        <div className='text-muted '>
          Log in to create new reports and actively participate.
        </div>
      </Modal.Body>

      <Modal.Footer className='justify-content-center gap-2 pb-4'>
        <Button
          className='confirm-button px-4'
          onClick={() => setShowWelcomeModal(false)}
        >
          Start Exploring
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

WelcomeModal.propTypes = {
  showWelcomeModal: PropTypes.bool.isRequired,
  setShowWelcomeModal: PropTypes.func.isRequired,
};

export default WelcomeModal;
