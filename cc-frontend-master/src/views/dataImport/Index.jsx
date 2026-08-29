import {
  Button,
  Card,
  CardBody,
  DrawerOpener,
  DrawerRight,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { FaChevronLeft } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import CC_CONSTANTS from "../../constants";
import { FiDownloadCloud } from "react-icons/fi";
import CategoryCalculationForm from "../calculations/category/CategoryCalculationForm";
import Table from "./Table";
function Welcome() {
  const navigate = useNavigate();
  return (
    <>
      <div className="d-flex justify-content-between mb-4">
        <h4>
          {" "}
          <Button
            outline
            className="border-0"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <FaChevronLeft />
          </Button>{" "}
          Welcome to Data Import Wizard
        </h4>
        <DrawerOpener drawerId="template-maker-from">
          <Button color="primary">
            Download a Template <FiDownloadCloud className="ms-2" />
          </Button>
        </DrawerOpener>
      </div>
      <Card className="rounded-3">
        <CardBody style={{ minHeight: 800 }}>
          <Table />
        </CardBody>
      </Card>
      <DrawerRight drawerId="template-maker-from">
        <CategoryCalculationForm
          category={
            CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES
              .UPSTREAM_TRANSPORTATION_AND_DISTRIBUTION
          }
        />
      </DrawerRight>
    </>
  );
}

export default Welcome;
