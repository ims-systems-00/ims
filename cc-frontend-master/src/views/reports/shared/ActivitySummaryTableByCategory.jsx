import React, { useState } from "react";
import useActivitySummaryByCategory from "../../sharedHooks/useActivitySummaryByCategory";
import CC_CONSTANTS from "../../../constants";
import PaginationNumbered from "../../../components/PaginationNumbered";
import {
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Table,
  UncontrolledDropdown,
} from "@ims-systems-00/ims-ui-kit";

import CategoryIcon from "../../../components/CategoryIcon";
const defaultCategory =
  CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES.COMPANY_PREMISES;
import { PiCaretUpDownBold } from "react-icons/pi";
import classNames from "classnames";
import { useParameters } from "../../../store/parametersStore";
import { GasInChemicalFormat } from "../../../components/GasInChemicalFormat";
export default function ActivitySummaryTableByCategory({
  reportingYear = null,
  onReportingYearChange = function () {},
}) {
  let { reportingPeriods } = useParameters();
  const {
    report,
    selectedCategory,
    selectedReportingYear,
    handlePagination,
    pagination,
    selectReportingYear,
    selectCategory,
  } = useActivitySummaryByCategory({
    category: defaultCategory,
    reportingYear,
  });
  return (
    <React.Fragment>
      <div className="mb-3">
        <UncontrolledDropdown className="d-inline">
          <DropdownToggle className="border-0 text-dark">
            {selectedCategory} <PiCaretUpDownBold />
          </DropdownToggle>
          <DropdownMenu className={"mb-3"}>
            {Object.values(CC_CONSTANTS.CC_EMISSION_CATEGORY_NAMES).map(
              (cat) => {
                return (
                  <DropdownItem
                    className={classNames("", {
                      "text-primary": selectedCategory === cat,
                    })}
                    key={cat}
                    onClick={() => {
                      selectCategory(cat);
                    }}
                  >
                    <CategoryIcon category={cat} /> {cat}
                  </DropdownItem>
                );
              }
            )}
          </DropdownMenu>
        </UncontrolledDropdown>
        {/* <UncontrolledDropdown className="d-inline mx-2">
          <DropdownToggle className="border-0 text-dark">
            {selectedReportingYear} <PiCaretUpDownBold />
          </DropdownToggle>
          <DropdownMenu className={"mb-3"}>
            {reportingPeriods?.map((rp) => (
              <DropdownItem
                className={classNames("", {
                  "text-primary": selectedReportingYear === rp.year,
                })}
                key={rp.year}
                onClick={() => {
                  selectReportingYear(rp.year);
                  onReportingYearChange(rp.year);
                }}
              >
                {rp.year} ({rp.startDate} - {rp.endDate})
              </DropdownItem>
            ))}
          </DropdownMenu>
        </UncontrolledDropdown> */}
        <PaginationNumbered
          containerClassName="pull-right "
          totalResults={pagination.totalResults}
          currentPage={pagination.currentPage}
          size={pagination.size}
          onPageChange={function (page) {
            handlePagination(page);
          }}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <td>Activity</td>
            <td>Unit</td>
            <td>Amount</td>
            <td>
              t<GasInChemicalFormat gas={CC_CONSTANTS.CC_GHG_GASSES.CO2E} />{" "}
              Emissions
            </td>
            {/* <td>Emission Factor</td>
            <td>Emission Factor Source</td>
            <td>Emission Factor Notes</td> */}
          </tr>
        </thead>
        <tbody>
          {report.map((summary) => {
            return (
              <tr>
                <td>{summary._id.activity}</td>
                <td>{summary._id.unit}</td>
                <td>{summary.amount}</td>
                <td>{summary.totalCO2eEmissions}</td>
                {/* <td>{summary.totalEmmisionFactorKgCo2ePerUnit}</td>
                <td>{summary.emissionFactorSource}</td>
                <td>{summary.emmisionFactorNote}</td> */}
              </tr>
            );
          })}
        </tbody>
      </Table>
    </React.Fragment>
  );
}
