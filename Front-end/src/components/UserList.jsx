import { Col, Container, Row, Card } from "react-bootstrap";
import { getInternalUsers } from "../API/API";
import { useState, useEffect } from "react";

const test = false;

function UserList() {
  const [users, setUsers] = useState([]);
  const [loadingDone, setLoadingDone] = useState(false);

  if (!test) {
    useEffect(() => {
      const loadUsers = async () => {
        const userList = await getInternalUsers();
        setUsers(userList);
        setLoadingDone(true);
      };

      loadUsers();
    }, []);
  }

  if (test) {
    useEffect(() => {
      const loadUsers = () => {
        const userList = [
          {
            first_name: "Mario ",
            last_name: "Rossi",
            username: "mrossi",
            role_id: "1",
            email: "mariorossi1@gmail.com",
          },
          {
            first_name: "Mario ",
            last_name: "Rossi",
            username: "mrossi",
            role_id: "1",
            email: "mariorossi2@gmail.com",
          },
          {
            first_name: "Mario ",
            last_name: "Rossi",
            username: "mrossi",
            role_id: "1",
            email: "mariorossi3@gmail.com",
          },
          {
            first_name: "Mario ",
            last_name: "Rossi",
            username: "mrossi",
            role_id: "1",
            email: "mariorossi4@gmail.com",
          },
          {
            first_name: "Mario ",
            last_name: "Rossi",
            username: "mrossi",
            role_id: "1",
            email: "mariorossi5@gmail-com",
          },
        ];
        setUsers(userList);
      };

      loadUsers();
    }, []);
  }

  // string formatter for user roles
  function formatRole(role_name) {
    return role_name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return (
    <>
      <Container fluid className='p-3 mt-3 body-font'>
        <h3 className='mb-4'>
          <b>List of registered internal users</b>
        </h3>
        
        {!loadingDone && (
          <div className='text-center mt-5'>
            <div className='spinner-border text-primary' role='status'>
              <span className='visually-hidden'>Loading...</span>
            </div>
          </div>
        )}
        
        {users.length !== 0 && (
          <div className='d-flex flex-column gap-3'>
            {users.map((u) => {
              return (
                <Card key={u.email} className='shadow-sm user-list-card'>
                  <Card.Body>
                    <Row>
                      <Col xs={12} md={8}>
                        <h5 className='mb-2'>
                          <b>{u.first_name} {u.last_name}</b>
                        </h5>
                        <div className='mb-2'>
                          <small className='text-muted'>
                            <i className='bi bi-person-circle me-1'></i>
                            Username:
                          </small>{' '}
                          {u.username}
                        </div>
                        <div>
                          <small className='text-muted'>
                            <i className='bi bi-envelope me-1'></i>
                            Email:
                          </small>{' '}
                          {u.email}
                        </div>
                      </Col>
                      
                      <Col xs={12} md={4} className='text-md-end mt-2 mt-md-0'>
                        <span 
                          className='badge bg-primary'
                          style={{ fontSize: '0.85rem' }}
                        >
                          {formatRole(u.role_name)}
                        </span>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              );
            })}
          </div>
        )}
        
        {users.length === 0 && loadingDone && (
          <Card className='mt-5 shadow-sm'>
            <Card.Body className='text-center py-5'>
              <i className='bi bi-people' style={{ fontSize: '3rem', color: '#ccc' }}></i>
              <p className='mt-3 mb-0 text-muted'>
                No internal users registered yet
              </p>
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  );
}

export default UserList;
