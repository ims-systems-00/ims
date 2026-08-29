import { useDualStateController } from "@ims-systems-00/ims-react-hooks";
import {
  Col,
  Container,
  FormGroup,
  Input,
  Label,
  Row,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import FullReport from "./FullReport";
import PDF from "./PDF";

function Contents() {
  const { isOpen: isPDFOpen, toggle } = useDualStateController();
  return (
    <React.Fragment>
      <div className="content bg-light border-bottom">
        <FormGroup switch>
          <Input
            type="switch"
            role="switch"
            checked={isPDFOpen}
            onChange={(e) => toggle()}
          />
          <Label check>Preview and Download</Label>
        </FormGroup>
      </div>
      {isPDFOpen ? (
        <PDF />
      ) : (
        <Container className="py-5">
          <div className="py-5 ">
            <Row>
              <Col md="9" className="mx-auto">
                <FullReport />
              </Col>
            </Row>
          </div>
        </Container>
      )}
    </React.Fragment>
  );
}

export default Contents;
