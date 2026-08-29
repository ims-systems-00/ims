import React from "react";
import startImage from "../../../assets/image/start.jpg";
import { Button, Col, Row } from "@ims-systems-00/ims-ui-kit";
import { GoGear } from "react-icons/go";
import { MdArrowRightAlt } from "react-icons/md";
import { useGetStarted } from "./store";

function GetStarted() {
  const { isCreating, createParameter } = useGetStarted();
  return (
    <Row className="d-flex justify-content-center p-4">
      <Col md="3">
        <img className="img-fluid" src={startImage} />
        <div className="p-3 bg-primary-light rounded-3 my-3">
          <p className="text-dark">
            <GoGear /> Parameters help us to automate your carbon calculation
            process and your reportings. Click on the button to get started.
          </p>
        </div>
        <Button
          disabled={isCreating}
          block
          className={"border-0"}
          color={"primary"}
          onClick={createParameter}
        >
          {isCreating ? "Creating..." : "Configure parameters "}
          <MdArrowRightAlt className="float-right" />
        </Button>
      </Col>
    </Row>
  );
}

export default GetStarted;
