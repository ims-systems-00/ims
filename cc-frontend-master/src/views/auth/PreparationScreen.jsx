import { Col, Container, Row, Spinner } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { usePreparationScreen } from "./hooks/usePreparationScreen.js";

export default function PreparationScreen() {
  const {} = usePreparationScreen();
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <Container>
        <Row>
          <Col md="6" className="mx-auto text-center">
            <Spinner color="primary" size="sm" className="mb-3" />
            <h5 className="text-dark mb-3">
              Preparing Your Carbon Calculator
            </h5>
            <p className="">
              Please wait while we set up your carbon calculator...
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
