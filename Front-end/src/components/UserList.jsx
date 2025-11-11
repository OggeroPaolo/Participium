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
      <Container fluid className='p-3 mt-3 ms-1 me-1 body-font'>
        <h3 className='mb-3'>
          <b>List of registered internal users</b>
        </h3>
        {users.length !== 0 &&
          users.map((u) => {
            return (
              <Row key={u.email}>
                <Container className='mt-2'>
                  <Row>
                    <Col>
                      <Row>
                        <p className='mb-1'>
                          <b>{u.first_name + " " + u.last_name}</b>
                        </p>
                      </Row>
                      <Row>
                        <p className='subtitle mb-1'>{u.username}</p>
                      </Row>
                    </Col>
                    <Col className='text-end me-2'>
                      <p className='mb-1'>{formatRole(u.role_name)}</p>
                    </Col>
                  </Row>
                  <p className='subtitle'>{u.email}</p>
                  <hr />
                </Container>
              </Row>
            );
          })}
        {users.length === 0 && loadingDone && (
          <Card className='mt-5 p-2'>
            <Card.Body>
              <p className='text-center mb-0'> No registered interal users </p>
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  );
}

export default UserList;
