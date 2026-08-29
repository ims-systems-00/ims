import { Card, CardBody } from "@ims-systems-00/ims-ui-kit";
import { createColumnHelper } from "@tanstack/react-table";
import React from "react";
import CellEditableText from "../../../components/CellEditableText";
import Table from "../../../components/Table";
import * as ccParameterService from "../../../services/ccParameterService";
import { useParameters } from "../../../store/parametersStore";
import NoParamsGuard from "../NoParamsGuard";
import TourStep from "../../../components/TourStep";
const columnHelper = createColumnHelper();

const columns = [
  columnHelper.accessor("year", {
    header: "Reporting Year",
    size: 135,
    cell: ({ row, getValue }) => (
      <span>
        <b>{getValue()}</b>
      </span>
    ),
  }),
  columnHelper.accessor("period", {
    header: "Reporting Period",
    cell: ({ row, getValue }) => (
      <span>
        <b>{getValue()}</b>
      </span>
    ),
  }),
  // columnHelper.accessor("startDate", {
  //   header: "Start date",
  // }),
  // columnHelper.accessor("endDate", {
  //   header: "End date",
  // }),
  columnHelper.accessor("emissionFactorDbYear", {
    header: "Emission Factor Database Year",
    cell: ({ row, getValue }) => (
      <span>
        <b>{getValue()}</b>
      </span>
    ),
  }),
  columnHelper.accessor("turnOver", {
    header: "Annual Turnover (£)",
    cell: ({ row, getValue }) => (
      <CellEditableText
        type="number"
        defaultValue={getValue()}
        onSave={(changes) =>
          ccParameterService.updateReportingYear(
            row.original.parameterId,
            row.original.yearId,
            {
              turnOver: Number(changes),
            }
          )
        }
      />
    ),
  }),
  columnHelper.accessor("employeeCount", {
    header: "Average Number of Employees",
    cell: ({ row, getValue }) => (
      <CellEditableText
        defaultValue={getValue()}
        onSave={(changes) =>
          ccParameterService.updateReportingYear(
            row.original.parameterId,
            row.original.yearId,
            {
              employeeCount: Number(changes),
            }
          )
        }
      />
    ),
  }),
  columnHelper.accessor("", {
    id: "actions",
    maxSize: 50, // has to be exactly 50
    header: ({ table }) => <div className="mt-row-actions"></div>,
    cell: ({ row }) => null,
  }),
];

function ReportingPeriods() {
  const { reportingPeriods } = useParameters();
  return (
    <NoParamsGuard>
      <Card className="rounded-3 border-0">
        <CardBody>
          <TourStep stepId={"reporting-periods-table"}>
            <Table
              data={reportingPeriods}
              columns={columns}
              disableMultiSelection
              size={150}
            />
          </TourStep>
        </CardBody>
      </Card>
    </NoParamsGuard>
  );
}

export default ReportingPeriods;
