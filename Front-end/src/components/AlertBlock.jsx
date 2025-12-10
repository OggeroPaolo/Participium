import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

function AlertBlock({ alert, onClose }) {
  if (!alert.show) return null;
  return (
    <Alert variant={alert.variant} dismissible onClose={onClose}>
      {alert.message}
    </Alert>
  );
}

AlertBlock.propTypes = {
  alert: PropTypes.shape({
    show: PropTypes.bool.isRequired,
    message: PropTypes.string.isRequired,
    variant: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AlertBlock;