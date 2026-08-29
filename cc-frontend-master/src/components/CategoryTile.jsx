import {
  Badge,
  Button,
  Card,
  CardBody,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Modal,
  ModalBody,
  UncontrolledDropdown,
} from "@ims-systems-00/ims-ui-kit";
import React, { useState } from "react";
import { LuChevronRight } from "react-icons/lu";
import { PiCarSimple, PiDotsThreeOutlineVertical } from "react-icons/pi";
import { CgClose } from "react-icons/cg";

import { Link } from "react-router-dom";
import CC_CONSTANTS from "../constants";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import CategoryIcon from "./CategoryIcon";
import TourStep from "./TourStep";

function Relevance({ relevance }) {
  return (
    <React.Fragment>
      {relevance === CC_CONSTANTS.CC_RELEVANCE.RELEVANT_CALCULATED && (
        <React.Fragment>
          <Badge fade="primary">Relevant</Badge>
          <Badge fade="success">Calculated</Badge>
        </React.Fragment>
      )}
      {relevance === CC_CONSTANTS.CC_RELEVANCE.RELEVANT_NOT_CALCULATED && (
        <React.Fragment>
          <Badge fade="primary">Relevant</Badge>
          <Badge fade="danger">Not calculated</Badge>
        </React.Fragment>
      )}
      {relevance === CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT && (
        <React.Fragment>
          <Badge fade="secondary">Not relevant</Badge>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

function RelevanceDropdown({ onSelect = () => {}, ...rest }) {
  return (
    <UncontrolledDropdown {...rest}>
      <DropdownToggle size="sm" outline className="border-0">
        <PiDotsThreeOutlineVertical />
      </DropdownToggle>
      <DropdownMenu>
        {Object.values(CC_CONSTANTS.CC_RELEVANCE).map((relevance) => (
          <DropdownItem
            key={relevance}
            onClick={() => {
              onSelect(relevance);
            }}
          >
            {relevance}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </UncontrolledDropdown>
  );
}

function LinkByRelevance({ relevance, children, ...linkProps }) {
  return (
    <React.Fragment>
      {relevance === CC_CONSTANTS.CC_RELEVANCE.RELEVANT_CALCULATED && (
        <Link {...linkProps}>
          <b>
            <p className="text-dark">{children}</p>
          </b>
        </Link>
      )}
      {relevance === CC_CONSTANTS.CC_RELEVANCE.RELEVANT_NOT_CALCULATED && (
        <Link {...linkProps}>
          <b>
            <p className="text-dark">{children}</p>
          </b>
        </Link>
      )}
      {relevance === CC_CONSTANTS.CC_RELEVANCE.NOT_RELEVANT && (
        <b>
          <p className="text-muted">{children}</p>
        </b>
      )}
    </React.Fragment>
  );
}

function CategoryTile({
  relevance = CC_CONSTANTS.CC_RELEVANCE.RELEVANT_CALCULATED,
  name = "Not specified",
  description = "Not specified",
  example = "Not specified",
  explanation = "Not specified",
  onSelectRelevance = () => {},
}) {
  let [isOpen, setIsOpen] = useState(false);
  const [relevanceRef] = useAutoAnimate();
  return (
    <Card className={"category-tile rounded-3 border-0"}>
      <CardBody>
        <div className="d-flex">
          <div className="md-icon-container">
            <CategoryIcon category={name} />
          </div>

          <div className="ms-3 flex-1">
            <TourStep stepId={"tile-category-opener"}>
              <LinkByRelevance
                className="category-link mb-2"
                to={"/categories?category=" + name}
                relevance={relevance}
              >
                {name}
              </LinkByRelevance>
            </TourStep>
            <Relevance relevance={relevance} />
          </div>
          <RelevanceDropdown
            onSelect={onSelectRelevance}
            className="ms-auto"
            direction="start"
          />
        </div>
        <div className="category-description mt-3 rounded-3 bg-secondary-extra-light p-3">
          <p className="mb-3">{description}</p>
          <Link to={"#"} onClick={() => setIsOpen(true)}>
            <span className="text-dark font-bold">
              {" "}
              Read more <LuChevronRight />
            </span>
          </Link>
        </div>
        <Modal
          className={"category-tile"}
          isOpen={isOpen}
          toggle={() => setIsOpen((isOpen) => !isOpen)}
        >
          <ModalBody>
            <div className="d-flex">
              <div className="md-icon-container">
                <PiCarSimple />
              </div>
              <div className="ms-3 flex-fill" ref={relevanceRef}>
                <LinkByRelevance
                  className="category-link mb-2"
                  to={"/categories?category=" + name}
                  relevance={relevance}
                >
                  {name}
                </LinkByRelevance>
                {/* <p className="">{description}</p> */}
                <Relevance relevance={relevance} />
              </div>
              <Button
                size="sm"
                color={"danger"}
                className={"align-self-start border-0 pull-right"}
                outline
                onClick={() => setIsOpen(false)}
              >
                <CgClose />
              </Button>{" "}
            </div>
            <div className="mt-2 p-3">
              <RelevanceDropdown
                onSelect={onSelectRelevance}
                className="pull-right"
                direction="start"
              />
              <p className="">{description}</p>
            </div>
            <div className="p-3">
              <h5 className=" mb-2">Example </h5>
              <p className="">{example}</p>
            </div>
            <div className="p-3">
              <h5 className=" mb-2">Explanation</h5>
              <p className="">{explanation}</p>
            </div>
          </ModalBody>
        </Modal>
      </CardBody>
    </Card>
  );
}

export default CategoryTile;
