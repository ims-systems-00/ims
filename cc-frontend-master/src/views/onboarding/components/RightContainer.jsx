import { Col } from "@ims-systems-00/ims-ui-kit";
import React from "react";

function RightContainer({ children }) {
  return (
    <Col
      md="4"
      className="h-100 bg-primary pt-5 mt-5"
    >
      {children}
    </Col>
  );
}

export default RightContainer;
