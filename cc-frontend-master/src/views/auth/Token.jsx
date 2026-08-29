import { Row, Col, Container, Input } from "@ims-systems-00/ims-ui-kit";
import logo from "images/logo.png";
import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { token } from "../../services/authService";
import { useApplication } from "../../store/applicationStore";
import useAPIResponse from "../../hooks/apiResponse";
import { useAutoAnimate } from "@formkit/auto-animate/react";
const states = {
  loggingIn: "logging in",
  loggedIn: "logged in",
  logInFail: "login fail",
  switchInToOrg: "switchin to org",
};
function TempAuth() {
  const [state, setState] = useState(states.logInFail);
  const [stateBoxRef] = useAutoAnimate();
  const { tokenPair, updateTokenPair, switchIntoOrganisation, refreshCache } =
    useApplication();
  const [search] = useSearchParams();
  const { handleSuccess, handleError } = useAPIResponse();
  async function loginWithCode() {
    try {
      setState(states.loggingIn);
      let loginResponse = await token(search.get("code"));
      await updateTokenPair({
        accessToken: loginResponse?.data?.accessToken,
        refreshToken: loginResponse?.data?.refreshToken,
      });
      handleSuccess(loginResponse);
    } catch (err) {
      setState(states.logInFail);
      handleError(err);
    }
  }
  useEffect(() => {
    loginWithCode();
  }, [search]);
  useEffect(() => {
    (async function () {
      try {
        setState(states.switchInToOrg);
        if (tokenPair) {
          await refreshCache();
          await switchIntoOrganisation(search.get("organizationId"));
          setState(states.loggedIn);
        }
      } catch (err) {
        setState(states.logInFail);
      }
    })();
  }, [tokenPair]);
  return (
    <Container className={"py-5"}>
      <Row>
        <Col innerRef={stateBoxRef} md="4" className={"mx-auto"}>
          <img
            style={{ height: 30 }}
            className="img-fluid mx-auto d-block"
            src={logo}
            alt="logo"
          />
          {state !== states.loggingIn && (
            <p className="text-center mt-3">
              Please wait. We are authenticating...
            </p>
          )}
          {state !== states.switchInToOrg && (
            <p className="text-center mt-3">Switching in to organisation...</p>
          )}
          {state === states.loggedIn && <Navigate to="/" />}
        </Col>
      </Row>
    </Container>
  );
}
export default TempAuth;
