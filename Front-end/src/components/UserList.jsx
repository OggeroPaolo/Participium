import {
  Col,
  Container,
  Row,
  Card,
  Modal,
  Button,
  Form,
  ButtonGroup,
} from "react-bootstrap";
import {
  getInternalUsers,
  getUserRoles,
  updateRole,
  getExternalMaintainers,
} from "../API/API";
import { useState, useEffect } from "react";
import AlertBlock from "./AlertBlock";
import PropTypes from "prop-types";

function UserList() {
  const [users, setUsers] = useState([]);
  const [externalUsers, setExternalUsers] = useState([]);
  const [loadingDone, setLoadingDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [roleList, setRoleList] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [alertRoleUpdate, setAlertRoleUpdate] = useState({ show: false, message: "", variant: "", key: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // list navigation
  const [activeView, setActiveView] = useState("internal");

  useEffect(() => {
    const loadUsers = async () => {
      const userList = await getInternalUsers();
      setUsers(userList);
      setLoadingDone(true);
    };

    loadUsers();
  }, []);

  useEffect(() => {
    const loadExternals = async () => {
      const userList = await getExternalMaintainers();
      setExternalUsers(userList);
      setLoadingDone(true);
    };

    loadExternals();
  }, []);

  useEffect(() => {
    const loadRoles = async () => {
      const roles = await getUserRoles();
      setRoleList(roles);
      setLoadingDone(true);
    };

    loadRoles();
  }, []);

  // handle update of role
  const updateUserRole = async (e) => {
    if (!noRole) {
      setAlertRoleUpdate(prev => ({ message: "", variant: "", show: false, key: Date.now() }));
      e.preventDefault();

      if (selectedRoles.length === 0) {
        setAlert({
          show: true,
          message: "A user must have at least one role.",
          variant: "danger",
        });
        return;
      }

      setIsSaving(true);

      try {
        await updateRole(user.id, selectedRoles);

        // reload users
        const userList = await getInternalUsers();
        setUsers(userList);

        handleCloseModal();
      } catch (error) {
        setTimeout(() => {
          setAlertRoleUpdate({
            show: true,
            message: error.message || "Failed to update roles",
            variant: "danger",
            key: Date.now()
          })
        }, 150)
        setSelectedRoles(user.roles.map((r) => roleList.find((role) => role.name === r)?.id).filter(Boolean));
      } finally {
        setIsSaving(false);
      }
    }
  };

  // string formatter for user roles
  function formatRole(role_name) {
    return role_name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  const handleOpenModal = (user) => {
    if (!roleList.length) return;

    setUser(user);

    const fullRoleIds = user.roles
      .map((r) => roleList.find((role) => role.name === r)?.id)
      .filter(Boolean);
    setSelectedRoles(fullRoleIds);

    setShowModal(true);
  };

  const handleCloseModal = () => {
    setAlertRoleUpdate(prev => ({ message: "", variant: "", show: false, key: Date.now() }));
    setShowModal(false);
    setUser(null);
    setSelectedRoles([]);
  };

  // helpers to manage role changes
  const userRoleIds = user
    ? user.roles
      .map((roleName) => roleList.find((r) => r.name === roleName)?.id)
      .filter(Boolean)
      .sort()
    : [];

  const selectedRolesIds = [...selectedRoles].sort();

  const rolesUnchanged =
    JSON.stringify(userRoleIds) === JSON.stringify(selectedRolesIds);

  const noRole = selectedRoles.length === 0;

  // helpers for list navigation
  const displayedUsers = activeView === "internal" ? users : externalUsers;

  return (
    <>
      <AlertBlock
        alert={alert}
        onClose={() => setAlert({ ...alert, show: false })}
      />

      <Container fluid className='p-3 mt-3 body-font'>
        <div className='d-flex justify-content-between align-items-center mb-4'>
          <div>
            <h3 className='mb-2'>
              <b>User management</b>
            </h3>
            <h6 className='text-muted'>
              Viewing {activeView === "internal" ? "internal" : "external"}{" "}
              users
            </h6>
          </div>

          <ButtonGroup aria-label='User type switch'>
            <Button
              variant={
                activeView === "internal" ? "primary" : "outline-primary"
              }
              onClick={() => setActiveView("internal")}
            >
              <i className='bi bi-people me-2' /> Internal
            </Button>
            <Button
              variant={
                activeView === "external" ? "primary" : "outline-primary"
              }
              onClick={() => setActiveView("external")}
            >
              <i className='bi bi-person-badge me-2' /> External
            </Button>
          </ButtonGroup>
        </div>

        {!loadingDone && (
          <div className='text-center mt-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        )}

        {displayedUsers.length !== 0 && (
          <div className='d-flex flex-column gap-3'>
            {displayedUsers.map((u) => (
              <UserCard
                key={u.email}
                user={u}
                formatRole={formatRole}
                onClick={
                  activeView === "internal" && u.role_type === "tech_officer"
                    ? () => handleOpenModal(u)
                    : undefined
                }
                userType={activeView}
              />
            ))}
          </div>
        )}

        {displayedUsers.length === 0 && loadingDone && (
          <Card className='mt-5 shadow-sm'>
            <Card.Body className='text-center py-5'>
              <i
                className='bi bi-people'
                style={{ fontSize: "3rem", color: "#ccc" }}
              ></i>
              <p className='mt-3 mb-0 text-muted'>
                No {activeView === "internal" ? "internal" : "external"} users
                registered yet
              </p>
            </Card.Body>
          </Card>
        )}
      </Container>

      <Modal
        show={showModal && user != null && user.role_type === "tech_officer"}
        onHide={handleCloseModal}
        size='lg'
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit technical officer roles</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AlertBlock
            key={alertRoleUpdate.key}
            alert={alertRoleUpdate}
            onClose={() => setAlert({ ...alertRoleUpdate, show: false })}
          />
          {/* role loading is done but GET failed */}
          {roleList.length === 0 && (
            <div className='text-center py-5'>
              <p className='text-muted'>No roles available</p>
            </div>
          )}

          {roleList.length > 0 && user && (
            <>
              <h5 className='mb-3'>
                Edit roles for{" "}
                <strong>
                  {user.first_name} {user.last_name}
                </strong>
              </h5>

              <RoleCheckboxList
                roles={roleList.filter((r) => r.type === "tech_officer")}
                selectedRoles={selectedRoles}
                setSelectedRoles={setSelectedRoles}
                formatRole={formatRole}
              />

              {noRole && (
                <div className='text-danger small mt-2'>
                  At least one role must be assigned to the user.
                </div>
              )}

              <div className='d-flex justify-content-end gap-2 mt-4'>
                <Button variant='secondary' onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  className='confirm-button'
                  onClick={updateUserRole}
                  disabled={rolesUnchanged || isSaving || noRole}
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

function UserCard({ user, onClick, formatRole, userType }) {
  const isClickable =
    userType === "internal" && user.role_type === "tech_officer";

  return (
    <Card
      className={`shadow-sm user-list-card ${isClickable ? "clickable-card" : ""
        }`}
      role={isClickable ? "button" : undefined}
      onClick={onClick}
    >
      <Card.Body>
        <Row>
          <Col xs={12} md={8}>
            <h5 className='mb-2'>
              <b>
                {userType === "internal" &&
                  user.first_name + " " + user.last_name}
                {userType === "external" && user.fullName}
              </b>
            </h5>

            <UserInfo
              icon='bi-person-circle'
              label='Username:'
              value={user.username}
            />

            <UserInfo icon='bi-envelope' label='Email:' value={user.email} />
          </Col>

          <Col
            xs={12}
            md={4}
            className='d-flex flex-column align-items-end mt-2 mt-md-0'
          >
            {userType === "internal" &&
              user.roles.map((role) => (
                <span key={role} className='badge bg-primary mb-1'>
                  {formatRole(role)}
                </span>
              ))}
            {userType === "external" &&
              user.roles.map((role) => (
                <span key={role.role_name} className='badge bg-primary mb-1'>
                  {formatRole(role.role_name)}
                </span>
              ))}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

function UserInfo({ icon, label, value }) {
  return (
    <div className='mb-2'>
      <small className='text-muted'>
        <i className={`bi ${icon} me-1`} />
        {label}
      </small>{" "}
      {value}
    </div>
  );
}

function RoleCheckboxList({
  roles,
  selectedRoles,
  setSelectedRoles,
  formatRole,
}) {
  const handleRoleChange = (event) => {
    const roleId = Number(event.target.dataset.roleId);

    setSelectedRoles((prev) =>
      event.target.checked
        ? [...prev, roleId]
        : prev.filter((id) => id !== roleId)
    );
  };

  return (
    <Form>
      {roles.map((role) => (
        <Form.Check
          key={role.id}
          type='checkbox'
          id={`role-${role.name}`}
          label={formatRole(role.name)}
          checked={selectedRoles.includes(role.id)}
          data-role-id={role.id}
          onChange={handleRoleChange}
          className='mb-2'
        />
      ))}
    </Form>
  );
}

export default UserList;

RoleCheckboxList.propTypes = {
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedRoles: PropTypes.arrayOf(PropTypes.number).isRequired,
  setSelectedRoles: PropTypes.func.isRequired,
  formatRole: PropTypes.func.isRequired,
};

UserCard.propTypes = {
  user: PropTypes.shape({
    first_name: PropTypes.string,
    last_name: PropTypes.string,
    fullName: PropTypes.string,
    username: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    role_type: PropTypes.string,
    roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onClick: PropTypes.func,
  formatRole: PropTypes.func.isRequired,
  userType: PropTypes.string,
};

UserInfo.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
