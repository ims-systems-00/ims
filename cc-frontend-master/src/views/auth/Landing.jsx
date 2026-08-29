import { useAutoAnimate } from "@formkit/auto-animate/react";
import logo from "images/logo.png";
import { Badge, Button, Col, Container, Row } from "@ims-systems-00/ims-ui-kit";
import useAuthFlow from "./hooks/useAuthFlow";
import { LuCalculator } from "react-icons/lu";
import { GrDocumentText } from "react-icons/gr";
import { FiPieChart } from "react-icons/fi";
import { VscChecklist } from "react-icons/vsc";
import { CgArrowLongRight } from "react-icons/cg";
import { RxRocket } from "react-icons/rx";
import brandConfig from "config.js";
import { useNavigate } from "react-router-dom";
const passcode = "pass-321";
function Auth() {
  const { attemptLogin } = useAuthFlow();
  const [stateBoxRef] = useAutoAnimate();
  const navigate = useNavigate();
  return (
    <div className="login-wrapper d-flex justify-content-center align-items-center">
      <ul class="circles">
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
      <Container className={"py-5"}>
        <Row>
          <Col innerRef={stateBoxRef} md="8" className={"mx-auto"}>
            <h2 className="mb-3">
              <img
                style={{ height: 30 }}
                className="img-fluid mx-auto me-2"
                src={logo}
                alt="logo"
              />{" "}
              {brandConfig.brandName}
            </h2>
            <h4 className="text-secondary">{brandConfig.tagline}</h4>
            <hr style={{ height: 4 }} />
            <div>
              <Badge className="badge-fade-primary">
                <LuCalculator /> Carbon calculator
              </Badge>
              <Badge className="badge-fade-primary">
                <GrDocumentText /> Carbon reporting
              </Badge>
              <Badge className="badge-fade-primary">
                <FiPieChart /> Carbon insights
              </Badge>
              <Badge className="badge-fade-primary">
                <VscChecklist /> Carbon planning
              </Badge>
            </div>
            <Button
              color="primary"
              outline
              className="mt-4 me-2 mx-auto"
              onClick={() =>
                window.location.replace(
                  process.env.REACT_APP_IMS_CLIENT_URL + "/auth/register"
                )
              }
            >
              Sign up <RxRocket />
            </Button>
            <Button
              color="primary"
              className="mt-4 mx-auto"
              onClick={() => navigate("/login")}
            >
              Login <CgArrowLongRight />
            </Button>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
export default Auth;
