import { Col } from "@ims-systems-00/ims-ui-kit";
import React from "react";

function LeftContainer({ children }) {
  return (
    <Col md="8" className="h-100 ">
      {children}
    </Col>
  );
}

export default LeftContainer;

