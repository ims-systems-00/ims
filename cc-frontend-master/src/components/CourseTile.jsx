import { Card, CardBody, Badge, Button } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { LuChevronRight } from "react-icons/lu";
import { Link } from "react-router-dom";

function CourseTile({
  contentCounts = 0,
  contentType = "Not specified",
  name = "Not specified",
  description = "Not specified",
  ctaText = "Learn",
  onStart = () => {},
}) {
  return (
    <Card className={"rounded-3 border-0"}>
      <CardBody>
        <div className="">
          <h5 className="d-inline">{name}</h5>
          <span className="pull-right">
            <Badge fade="primary">
              {contentCounts} {contentType}
            </Badge>
          </span>
        </div>
        <div className="mt-3 rounded-3 bg-secondary-extra-light p-3">
          <p className="mb-3">{description}</p>
          <Button
            outline
            color="primary"
            size="sm"
            onClick={() => {
              onStart();
            }}
          >
            {ctaText} <LuChevronRight />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default CourseTile;
