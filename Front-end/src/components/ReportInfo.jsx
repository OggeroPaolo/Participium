import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import {
  getReport,
  getCommentsExternal,
  createExternalComment,
} from "../API/API";
import {
  Container,
  Row,
  Col,
  Carousel,
  Card,
  Form,
  Button,
} from "react-bootstrap";
import PropTypes from "prop-types";
import useUserStore from "../store/userStore";
import AlertBlock from "./AlertBlock";

function ReportInfo() {
  const { rid } = useParams();
  const { user } = useUserStore();
  const [report, setReport] = useState({});
  const [loadingDone, setLoadingDone] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", variant: "" });

  useEffect(() => {
    const loadReport = async () => {
      const reportById = await getReport(rid);
      setReport(reportById);
      setLoadingDone(true);
    };
    loadReport();
  }, []);

  // string formatter for status
  // can be pending_approval, assigned, in_progress, suspended, rejected, resolved
  function stringFormatter(str) {
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // comments
  useEffect(() => {
    if (!report || !user) return;

    const loadComments = async () => {
      if (user?.id === report.user?.id) {
        const userComments = await getCommentsExternal(report.id);
        setComments(userComments);
      }
    };

    loadComments();
  }, [report]);

  // handle posting of new comments
  const writeComment = async (e) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setIsSubmittingComment(true);

    try {
      await createExternalComment(report.id, newComment);

      // clear textarea
      setNewComment("");

      // reload comments
      const newComments = await getCommentsExternal(report.id);
      setComments(newComments);
    } catch (error) {
      setAlert({
        show: true,
        message: error.message,
        variant: "danger",
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <>
      <Container fluid className='mt-4 body-font report-info-container'>
        {/* report info */}
        <h2 className='mb-4 text-center'>
          <b>{report.title}</b>
        </h2>

        {!loadingDone && (
          <div className='text-center mt-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        )}

        {loadingDone && (
          <Row className='p-4 justify-content-center'>
            <Col xs={12} md={5} className='mb-3 mb-md-0'>
              <Card className='bg-light border-0 shadow-sm'>
                <Carousel interval={null}>
                  {report.photos.map((img, idx) => {
                    return (
                      <Carousel.Item key={idx}>
                        <div className='car-img-box'>
                          <img src={img.url}></img>
                        </div>
                      </Carousel.Item>
                    );
                  })}
                </Carousel>
              </Card>
            </Col>
            <Col xs={12} md={6} className='ps-md-3 ms-md-4'>
              <p>
                <i className='bi bi-geo-alt-fill text-danger me-2'></i>{" "}
                <b>Address:</b> {report.address}
              </p>
              <p>
                <i className='bi bi-person-fill me-2'></i> <b>Reported by:</b>{" "}
                {report.is_anonymous ? "Anonymous" : report.user.complete_name}
              </p>
              <p>
                {" "}
                <i className='bi bi-tag-fill me-2 text-primary'></i>
                <b>Category:</b> {report.category.name}
              </p>
              <p>
                <i className='bi bi-calendar-event-fill text-success me-2'></i>{" "}
                <b>Created on:</b> {Date(report.created_at).slice(0, 15)}
              </p>
              <p>
                <i className='bi bi-chat-left-fill text-warning me-2'></i>{" "}
                <b>Status:</b> {stringFormatter(report.status)}
              </p>
              <h6 className='fw-bold mb-2'>Description</h6>
              <Card className='p-3 bg-light border-0'>
                <p className='mb-0'>{report.description}</p>
              </Card>
              {report.note && (
                <>
                  <h6 className='fw-bold mb-2 mt-3'>Reviewer notes</h6>
                  <Card className='p-3 bg-light border-0'>
                    <p className='mb-0'>{report.note}</p>
                  </Card>
                </>
              )}
            </Col>
          </Row>
        )}

        {user?.id === report.user?.id && report.status !== "rejected" && (
          <Row className='justify-content-center mt-3 mb-3'>
            <Col xs={12} md={11}>
              <Card className='shadow-sm comments-card'>
                <Card.Body>
                  <CommentsTab
                    comments={comments}
                    userId={user?.id}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    writeComment={writeComment}
                    isSubmittingComment={isSubmittingComment}
                    status={report.status}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>

      <AlertBlock
        alert={alert}
        onClose={() => setAlert({ ...alert, show: false })}
      />
    </>
  );
}

function CommentsTab({
  comments,
  userId,
  newComment,
  setNewComment,
  writeComment,
  isSubmittingComment,
  status,
}) {
  const commentsEndRef = useRef(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [comments]);

  return (
    <>
      <h5 className='fw-bold mb-4 d-flex align-items-center gap2'>
        <i className='bi bi-chat-dots me-2' /> Chat
      </h5>

      <div className='comments-list scrollable-comments'>
        {comments.length === 0 ? (
          <p className='text-muted'>
            No comments yet
            {status === "resolved" ? "." : ", start the conversation!"}
          </p>
        ) : (
          <>
            {comments.map((c) => (
              <div
                key={c.id ?? `${c.user_id}-${c.timestamp}`}
                className='mb-3 pb-2 border-bottom'
              >
                <div className='d-flex justify-content-between align-items-start'>
                  <div className='d-flex flex-column'>
                    {c.user_id !== userId && c.role_name && (
                      <small className='text-muted'>
                        {c.role_name.replaceAll("_", " ")}
                      </small>
                    )}
                    <div className='d-flex align-items-center'>
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          backgroundColor:
                            c.user_id === userId ? "#F5E078" : "#0350b5",
                          marginRight: "8px",
                        }}
                      />
                      <strong>
                        {c.user_id === userId
                          ? "Me"
                          : `${c.first_name} ${c.last_name}`}
                      </strong>
                    </div>
                  </div>

                  <small className='text-muted'>
                    {new Date(c.timestamp).toLocaleString()}
                  </small>
                </div>

                <div className='mt-1'>
                  <p className='mb-0 text-dark'>{c.text}</p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </>
        )}
      </div>

      {status !== "resolved" && (
        <Form className='comment-input pt-3' onSubmit={writeComment}>
          <Form.Group className='mb-3'>
            <Form.Control
              as='textarea'
              rows={2}
              placeholder='Write a comment'
              onChange={(e) => setNewComment(e.target.value)}
              value={newComment}
            />
          </Form.Group>

          <hr />

          <div className='d-flex justify-content-end'>
            <Button
              className='confirm-button'
              type='submit'
              disabled={isSubmittingComment}
            >
              {isSubmittingComment ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2' />{" "}
                  Posting...
                </>
              ) : (
                "Post comment"
              )}
            </Button>
          </div>
        </Form>
      )}

      {status === "resolved" && (
        <Container className='m-3 ms-0 ps-0'>
          <small className='text-muted'>
            This report is resolved, chat messages functionalities are not
            anymore available.
          </small>
        </Container>
      )}
    </>
  );
}

CommentsTab.propTypes = {
  comments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      user_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      role_name: PropTypes.string,
      first_name: PropTypes.string,
      last_name: PropTypes.string,
      timestamp: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]).isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  userId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  newComment: PropTypes.string.isRequired,
  setNewComment: PropTypes.func.isRequired,
  writeComment: PropTypes.func.isRequired,
  isSubmittingComment: PropTypes.bool.isRequired,
  status: PropTypes.string.isRequired,
};

export default ReportInfo;
