import { Col, Row } from "@ims-systems-00/ims-ui-kit";
import React from "react";
import { LuActivity, LuBoxes, LuPencilRuler } from "react-icons/lu";
import { TbSettings } from "react-icons/tb";
import SelectEditableLi from "../../../../components/SelectEditableLi";
import TextEditableLi from "../../../../components/TextEditableLi";
import AttachmentsSection from "../../../sharedSections/attachments/Index";
import { useCategoryCalculation } from "../store";
import DataCard from "../../../../components/DataCard";
import Location from "./Location";
import useApplicableCalculationField, {
  CALCULATION_FIELD_NAMES,
} from "../../../../hooks/useApplicableCalculationField";
import If from "../../../../components/If";
import { MONTH_FULL_NAMES } from "../dto/categoryCalculation.dto";

export default function InputSettings({}) {
  const { viewingCategoryCalculation } = useCategoryCalculation();
  if (!viewingCategoryCalculation) return null;
  const { isApplicableFieldForCategory } = useApplicableCalculationField();

  return (
    <React.Fragment>
      <h6>Overview</h6>
      <TextEditableLi
        label="Reference"
        disabled
        value={viewingCategoryCalculation.customReference || ""}
      />
      <If
        expression={isApplicableFieldForCategory(
          viewingCategoryCalculation.category,
          CALCULATION_FIELD_NAMES.SUPPLIER_NAME
        )}
      >
        <TextEditableLi
          label="Maker Name"
          disabled
          value={viewingCategoryCalculation.supplierName}
        />
      </If>
      <If
        expression={isApplicableFieldForCategory(
          viewingCategoryCalculation.category,
          CALCULATION_FIELD_NAMES.METER_NUMBER
        )}
      >
        <TextEditableLi
          label="Meter Number"
          disabled
          value={viewingCategoryCalculation.meterNumber}
        />
      </If>
      <If
        expression={isApplicableFieldForCategory(
          viewingCategoryCalculation.category,
          CALCULATION_FIELD_NAMES.INVOICE_NUMBER
        )}
      >
        <TextEditableLi
          label="Invoice Number"
          disabled
          value={viewingCategoryCalculation.invoiceNumber}
        />
      </If>
      <SelectEditableLi
        label="Reporting Year"
        isDisabled
        value={{
          label: viewingCategoryCalculation.reportingYear,
          value: viewingCategoryCalculation.reportingYear,
        }}
      />
      <SelectEditableLi
        label="Reporting Month"
        isDisabled
        value={{
          label: MONTH_FULL_NAMES[viewingCategoryCalculation.reportingMonth],
          value: viewingCategoryCalculation.reportingMonth,
        }}
      />
      {/** link iniitatives */}
      <h6 className="mb-2">Location</h6>
      <Row>
        <Col md="12">
          <Location />
        </Col>
      </Row>
      <h6 className="mb-2">Attachments</h6>
      <Row>
        <Col md="12">
          <AttachmentsSection
            module={viewingCategoryCalculation._id}
            moduleType={"cccalculations"}
          />
        </Col>
      </Row>
      <h6 className="mb-2">Activity Data</h6>
      <Row>
        <Col md="6">
          <DataCard
            icon={<TbSettings size={25} className="text-dark" />}
            heading="Calculation Method"
            subHeading={viewingCategoryCalculation.calculationMethod}
          />
        </Col>
        <Col md="6">
          <DataCard
            icon={<LuActivity size={25} className="text-dark" />}
            heading="Activity"
            subHeading={viewingCategoryCalculation.activity}
          />
        </Col>
        <Col md="6">
          <DataCard
            icon={<LuPencilRuler size={25} className="text-dark" />}
            heading="Unit"
            subHeading={viewingCategoryCalculation.unit}
          />
        </Col>
        <Col md="6">
          <DataCard
            icon={<LuBoxes size={25} className="text-dark" />}
            heading="Amount"
            subHeading={viewingCategoryCalculation.amount}
          />
        </Col>
      </Row>
    </React.Fragment>
  );
}
