import { Button, Col, Container, Row } from "@ims-systems-00/ims-ui-kit";
import { useEffect, useState } from "react";
import logo from "images/logo.png";
import { logout } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import React from "react";

const states = {
  loggingOut: "logging out",
  loggedOut: "logged out",
  logoutFail: "logout fail",
};

function Logout() {
  const navigate = useNavigate();
  const [state, setState] = useState(states.loggingOut);
  async function _logout() {
    try {
      await logout();
      setState(states.loggedOut);
    } catch (err) {
      setState(states.logoutFail);
    }
  }
  useEffect(() => {
    _logout();
  }, []);
  useEffect(() => {
    if (state === states.loggedOut) window.location = "/login";
  }, [state]);
  return (
    <Container className={"py-5"}>
      <Row>
        <Col md="4" className={"mx-auto"}>
          <img
            style={{ height: 30 }}
            className="img-fluid mx-auto d-block"
            src={logo}
            alt="logo"
          />
          {state === states.loggingOut && (
            <p className={"mt-3"}>We are safely logging you out...</p>
          )}
          {state === states.logoutFail && (
            <React.Fragment>
              <p className={"mt-3"}>There was an error.</p>
              <Button color="primary" onClick={navigate("/login")}>
                Fix errors
              </Button>
            </React.Fragment>
          )}
        </Col>
      </Row>
    </Container>
  );
}
export default Logout;
