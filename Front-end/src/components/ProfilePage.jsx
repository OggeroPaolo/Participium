import { useEffect, useState, useActionState } from "react";
import useUserStore from "../store/userStore.js";
import { Badge, Form, Row, Col, Card, Button } from "react-bootstrap";
import {
  modifyUserInfo,
  getApprovedReports,
  getCategories,
} from "../API/API.js";
import avatarPlaceholder from "../assets/avatar_placeholder.png";
import { useNavigate } from "react-router";
import AlertBlock from "./AlertBlock";

function ProfilePage() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const REPORTS_PER_PAGE = 8;

  const [enableNotifications, setEnableNotifications] = useState(
    user.email_notifications_enabled
  );
  const [reports, setReports] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [editProfile, setEditProfile] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });
  const [profilePic, setProfilePic] = useState(
    user.profile_photo_url || avatarPlaceholder
  );
  const [profilePreview, setProfilePreview] = useState(
    user.profile_photo_url || avatarPlaceholder
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [telegramUsername, setTelegramUsername] = useState(
    user.telegram_username ?? ""
  );

  const totalPages = Math.ceil(reports.length / REPORTS_PER_PAGE);
  const paginatedReports = reports.slice(
    (currentPage - 1) * REPORTS_PER_PAGE,
    currentPage * REPORTS_PER_PAGE
  );

  const [, formAction, isPending] = useActionState(updateUserInfo, {
    telegram_username: "",
    email_notifications_enabled: false,
  });

  async function updateUserInfo(prevData, formData) {
    const attributes = {
      telegram_username: telegramUsername,
      email_notifications_enabled: enableNotifications,
    };

    console.log("form function is called", attributes);

    try {
      await modifyUserInfo(attributes, profilePic, user.id);
      setAlert({
        show: true,
        message: "Account modified successfully!",
        variant: "success",
      });
    } catch (error) {
      setAlert({
        show: true,
        message: error.message || "Failed to update account.",
        variant: "danger",
      });
    } finally {
      setEditProfile(false);
    }
  }

  useEffect(() => {
    const loadReports = async () => {
      try {
        const myReports = await getApprovedReports();
        myReports.filter((report) => report.user_id === user.id);
        setReports(myReports);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };

    const loadCategories = async () => {
      try {
        const categoryList = await getCategories();

        // Create a map for quick lookup: category_id -> category_name
        const map = {};
        categoryList.forEach((cat) => {
          map[cat.id] = cat.name;
        });
        setCategoryMap(map);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    loadReports();
    loadCategories();
  }, []);

  const getCategoryBadge = (category) => {
    // prettier-ignore
    const colors = {
      "Water Supply – Drinking Water": "primary", // Blue - Water
      "Architectural Barriers": "secondary", // Gray - Infrastructure
      "Sewer System": "info", // Light Blue - Water system
      "Public Lighting": "warning", // Yellow/Orange - Lighting
      "Waste": "success", // Green - Environment prettier-ignore
      "Road Signs and Traffic Lights": "danger", // Red - Traffic/Safety
      "Roads and Urban Furnishings": "dark", // Dark Gray - Roads
      "Public Green Areas and Playgrounds": "success", // Green - Nature (grouped with environment)
      "Other": "secondary", // Gray - Misc (grouped with infrastructure)
    };
    return colors[category] || "secondary";
  };

  const formatAddress = (report) => {
    if (report?.address) return report.address;
    if (report?.position_lat && report?.position_lng) {
      return `${report.position_lat}, ${report.position_lng}`;
    }
    return "Address unavailable";
  };

  // handle profile picture
  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAlert({
        show: true,
        message: "Please select a valid image file.",
        variant: "danger",
      });
      return;
    }

    setProfilePic(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <AlertBlock
        alert={alert}
        onClose={() => setAlert({ ...alert, show: false })}
      />
      <Row className='body-font g-4 p-3'>
        {/* PROFILE */}
        <Col xs={12} lg={5}>
          <Card className='shadow-sm h100'>
            <Card.Body>
              <div className='text-center mb-4'>
                <div className='profile-avatar-wrapper mx-auto mb-3 position-relative'>
                  <img
                    src={profilePreview}
                    alt='Profile'
                    className='profile-avatar'
                    onError={(e) => {
                      e.currentTarget.src = avatarPlaceholder;
                    }}
                  />

                  {editProfile && (
                    <>
                      <label
                        htmlFor='profile-pic-upload'
                        className='btn btn-dark position-absolute d-flex align-items-center justify-content-center rounded-circle'
                        style={{
                          width: "80px",
                          height: "80px",
                        }}
                        title='Change profile picture'
                      >
                        <i className='bi bi-camera-fill fs-4'></i>
                        <span className='visually-hidden'>
                          Change profile picture
                        </span>
                      </label>
                      <input
                        id='profile-pic-upload'
                        type='file'
                        accept='image/*'
                        className='d-none'
                        onChange={handleProfilePicChange}
                      />
                    </>
                  )}
                </div>

                <h5 className='mb-0'>
                  {user.first_name + " " + user.last_name}
                </h5>
                <small className='text-muted'>@{user.username}</small>

                <hr className='my-3' />
              </div>
              <Form action={formAction}>
                <div className='d-flex justify-content-end gap-2 mb-3'>
                  {!editProfile && (
                    <Button
                      variant='secondary'
                      onClick={() => setEditProfile(true)}
                    >
                      Edit Profile
                    </Button>
                  )}
                  {editProfile && (
                    <>
                      <Button
                        type='submit'
                        className='confirm-button'
                        disabled={isPending}
                      >
                        {isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant='outline-secondary'
                        onClick={() => {
                          setEditProfile(false);
                          setProfilePic(null);
                          setProfilePreview(
                            user.profile_photo_url || avatarPlaceholder
                          );
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
                <Form.Group className='mb-3' controlId='telegram'>
                  <Form.Label>
                    <strong>Telegram username </strong>
                  </Form.Label>
                  <Form.Control
                    type='text'
                    value={telegramUsername}
                    placeholder='Telegram username'
                    readOnly={!editProfile}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className='mb-3' controlId='email'>
                  <Form.Label>
                    <strong>Email </strong>
                  </Form.Label>
                  <Form.Control type='text' value={user.email} readOnly />
                </Form.Group>
                <Form.Group className='mb-3' controlId='notifications-switch'>
                  <Form.Check
                    type='switch'
                    id='email-notifications-switch'
                    label={<strong>Enable email notifications</strong>}
                    checked={enableNotifications}
                    onChange={(e) => setEnableNotifications(e.target.checked)}
                    disabled={!editProfile}
                  />
                  <Form.Text className='text-muted'>
                    Updates on your reports will be sent to your email.
                  </Form.Text>
                </Form.Group>
                <Form.Group className='mb-3' controlId='creationDate'>
                  <Form.Label>
                    <strong>Account created </strong>
                  </Form.Label>
                  <Form.Control
                    type='text'
                    readOnly
                    value={new Date(user.created_at).toLocaleDateString()}
                  />
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* REPORTS */}
        <Col xs={12} lg={7}>
          <Card className='shadow-sm'>
            <Card.Body>
              <h4 className='mb-4'>My reports</h4>
              <Row className='g-3'>
                {reports.length === 0 && (
                  <Col>
                    <div className='text-center py-5 text-muted'>
                      <i
                        className='bi bi-clipboard-check fs-1 mb-3 d-block'
                        aria-hidden='true'
                      ></i>
                      <p className='mb-0'>No reports submitted yet. </p>
                    </div>
                  </Col>
                )}

                {paginatedReports.map((report) => (
                  <Col md={6} key={report.id}>
                    <Card
                      className='shadow-sm report-card h-100'
                      onClick={() => navigate(`/reports/${report.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <Card.Body>
                        <h6 className='mb-1'>{report.title}</h6>
                        <div className='small text-muted mb-1'>
                          <i className='bi bi-geo-alt-fill text-danger me-1' />{" "}
                          {formatAddress(report)}
                        </div>

                        <Badge
                          bg={getCategoryBadge(categoryMap[report.category_id])}
                        >
                          {categoryMap[report.category_id] ||
                            `Category ${report.category_id}`}
                        </Badge>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>

            {totalPages > 1 && (
              <div className='d-flex justify-content-center mt-3 mb-3'>
                <div className='btn-group'>
                  <Button
                    variant='outline-secondary'
                    size='sm'
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    ← Previous
                  </Button>

                  <Button variant='outline-secondary' size='sm' disabled>
                    Page {currentPage} of {totalPages}
                  </Button>

                  <Button
                    variant='outline-secondary'
                    size='sm'
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default ProfilePage;
