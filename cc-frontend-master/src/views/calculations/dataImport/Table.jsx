import {
  Button,
  Card,
  CardBody,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  PopoverBody,
  PopoverHeader,
  UncontrolledDropdown,
  UncontrolledPopover,
} from "@ims-systems-00/ims-ui-kit";
import { FaRedo, FaRegTrashAlt, FaUndo } from "react-icons/fa";
import { MdOutlineAdd } from "react-icons/md";
import { MdMoreHoriz } from "react-icons/md";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import React, { useMemo } from "react";
import { FaInfo } from "react-icons/fa";
import { HiDotsHorizontal } from "react-icons/hi";
import CC_CONSTANTS from "../../../constants";
import { useParameters } from "../../../store/parametersStore";
import {
  MONTH_FULL_NAMES,
  getCalculationMethodDropdown,
  getCombinedActivityReferenceDropdown,
  getUnitDropdown,
} from "../category/dto/categoryCalculation.dto";
import { useCategory } from "../stores/categoryStore";
import { usePaste } from "./hooks/usePaste";
import { useDataImport } from "./store";
import TourStep from "../../../components/TourStep";

const columnHelper = createColumnHelper();
const CellAmount = ({ getValue, row: { index }, column: { id } }) => {
  const { handlePaste } = usePaste();
  const { updateData } = useDataImport();
  return (
    <input
      value={getValue()}
      type="number"
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      onPaste={(e) => handlePaste(e, { id, index }, { numbersOnly: true })}
      style={{ width: "100%" }}
    />
  );
};
const CellCustomReference = ({ getValue, row: { index }, column: { id } }) => {
  const { handlePaste } = usePaste();
  const { updateData } = useDataImport();
  return (
    <input
      value={getValue()}
      type="text"
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      onPaste={(e) => handlePaste(e, { id, index })}
      style={{ width: "100%" }}
    />
  );
};

const CellActivityDataGrade = ({
  getValue,
  row: { index },
  column: { id },
}) => {
  const { updateData } = useDataImport();
  const options = Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES).map(
    (i) => ({
      value: i,
      label: i,
    })
  );
  return (
    <select
      value={getValue()}
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      style={{ width: "100%" }}
    >
      {options.map((option, i) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
const CellUnit = ({ getValue, row: { index, original }, column: { id } }) => {
  const { category } = useCategory();
  const { updateData } = useDataImport();
  const options = getUnitDropdown(
    category,
    original.calculationMethod,
    original.activity
  ).map((i) => ({
    value: i,
    label: i,
  }));
  return (
    <select
      value={getValue()}
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      style={{ width: "100%" }}
    >
      <option value={""}>Select</option>
      {options.map((option, i) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

const CellActivity = ({
  getValue,
  row: { index, original },
  column: { id },
}) => {
  const { category } = useCategory();
  const { updateData } = useDataImport();
  const options = getCombinedActivityReferenceDropdown(
    category,
    original.calculationMethod
  ).map((i) => ({
    value: i,
    label: i,
  }));
  return (
    <select
      value={getValue()}
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      style={{ width: "100%" }}
    >
      <option value={""}>Select</option>
      {options.map((option, i) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
const CellCalculationMethod = ({
  getValue,
  row: { index },
  column: { id },
}) => {
  const { category } = useCategory();
  const { updateData } = useDataImport();
  const options = getCalculationMethodDropdown(category).map((i) => ({
    value: i,
    label: i,
  }));
  return (
    <select
      value={getValue()}
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      style={{ width: "100%" }}
    >
      <option value={""}>Select</option>
      {options.map((option, i) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
const CellReportingYear = ({ getValue, row: { index }, column: { id } }) => {
  const { reportingPeriods } = useParameters();
  const { updateData } = useDataImport();
  const options = reportingPeriods.map((i) => ({
    value: i.year,
    label: `${i.year} (${i.startDate} - ${i.endDate})`,
  }));

  return (
    <select
      value={getValue()}
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      style={{ width: "100%" }}
    >
      {options.map((option, i) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
const CellReportingMonth = ({ getValue, row: { index }, column: { id } }) => {
  const { parameter } = useParameters();
  const { updateData } = useDataImport();
  const options = [
    {
      value: "Annual",
      label: "Annual ",
    },
    ...(parameter?.reportingMonths
      ? parameter?.reportingMonths?.map((i) => ({
          value: i,
          label: MONTH_FULL_NAMES[i],
        }))
      : []),
  ];

  return (
    <select
      value={getValue()}
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      style={{ width: "100%" }}
    >
      {options.map((option, i) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
const columns = [
  columnHelper.accessor("customReference", {
    header: "Reference",
    cell: CellCustomReference,
  }),
  columnHelper.accessor("reportingYear", {
    header: "Reporting Year",
    cell: CellReportingYear,
  }),
  columnHelper.accessor("reportingMonth", {
    header: "Reporting Month",
    cell: CellReportingMonth,
  }),
  columnHelper.accessor("calculationMethod", {
    header: "Calculation Method",
    cell: CellCalculationMethod,
  }),
  columnHelper.accessor("activity", {
    header: "Activity",
    cell: CellActivity,
  }),
  columnHelper.accessor("unit", {
    header: "Unit of Measurement",
    cell: CellUnit,
  }),
  columnHelper.accessor("amount", {
    header: "Amount",
    cell: CellAmount,
  }),
  columnHelper.accessor("activityDataGrade", {
    header: "Activity Data Grade",
    cell: CellActivityDataGrade,
  }),
];
const EditableTable = () => {
  const {
    data,
    history,
    redoStack,
    insertRow,
    deleteRow,
    areAllDataValid,
    duplicateCells,
    importInProgress,
    insertEmptyRows,
    redo,
    undo,
    isDuplicatorDragging,
    importDataSync,
    startCell,
    endCell,
    trackDuplicateWhileDragging,
    trackEndCellWhileDragging,
  } = useDataImport();
  const memoisedData = useMemo(() => data ?? [], [data]);
  const memoisedColumn = useMemo(() => columns ?? [], []);
  const table = useReactTable({
    data: memoisedData,
    columns: memoisedColumn,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="rounded-3">
      <CardBody>
        <div className="mb-2">
          <div className="d-flex justify-content-between items-center">
            <div>
              <Button
                className="rounded-pill"
                size="sm"
                onClick={undo}
                disabled={history.current.length === 0}
                color="primary"
              >
                <FaUndo /> Undo
              </Button>
              <Button
                className="rounded-pill"
                size="sm"
                onClick={redo}
                disabled={redoStack.current.length === 0}
                color="primary"
              >
                <FaRedo /> Redo
              </Button>
              <Button
                className="rounded-pill"
                size="sm"
                onClick={() => insertRow(0)}
                color="primary"
              >
                <MdOutlineAdd /> Add Row
              </Button>
              <UncontrolledDropdown className="d-inline m-2">
                <DropdownToggle
                  className="rounded-pill"
                  size="sm"
                  color="primary"
                >
                  <MdMoreHoriz />
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem onClick={() => insertEmptyRows(5)}>
                    Add 5 Rows
                  </DropdownItem>
                  <DropdownItem onClick={() => insertEmptyRows(10)}>
                    Add 10 Rows
                  </DropdownItem>
                  <DropdownItem onClick={() => insertEmptyRows(20)}>
                    Add 20 Rows
                  </DropdownItem>
                  <DropdownItem onClick={() => insertEmptyRows(30)}>
                    Add 30 Rows
                  </DropdownItem>
                  <DropdownItem onClick={() => insertEmptyRows(50)}>
                    Add 50 Rows
                  </DropdownItem>
                </DropdownMenu>
              </UncontrolledDropdown>
            </div>
            <TourStep stepId={"import-data-submit-button"}>
              <Button
                className="rounded-pill"
                size="sm"
                color="primary"
                disabled={!areAllDataValid() || importInProgress}
                onClick={importDataSync}
              >
                {importInProgress
                  ? "Importing Data..."
                  : "Validate and Import Data"}
              </Button>
            </TourStep>
          </div>
        </div>
        <TourStep stepId={"import-data-table"}>
          <div className="spreadsheet">
            <table onMouseUp={duplicateCells}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    <th></th>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, rowIndex) => (
                  <tr
                    className={classNames({
                      "invalid-row": !row.original.isValid,
                      "imported-row": row.original.isImported,
                    })}
                    key={row.id}
                  >
                    <td>
                      {rowIndex + 1}
                      <div
                        className="spreadsheet-plus-row-indicator"
                        onClick={() => insertRow(rowIndex + 1)}
                      >
                        <MdOutlineAdd size={14} />
                      </div>
                    </td>
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const cellKey = `${rowIndex}-${cell.column.id}`;
                      const isSelected =
                        isDuplicatorDragging &&
                        rowIndex >=
                          Math.min(startCell?.rowIndex, endCell?.rowIndex) &&
                        rowIndex <=
                          Math.max(startCell?.rowIndex, endCell?.rowIndex) &&
                        cell.column.id === startCell?.columnId;
                      const rowSelector =
                        "import-row-error-" + rowIndex + "-" + cell.column.id;
                      return (
                        <td
                          key={cell.id + cellKey}
                          onMouseEnter={() =>
                            trackEndCellWhileDragging(rowIndex, cell.column.id)
                          }
                          className={classNames({
                            "spreadsheet-cell-selected": isSelected,
                          })}
                        >
                          {cellIndex === 0 && (
                            <React.Fragment>
                              <div
                                id={rowSelector}
                                className="spreadsheet-error-indicator"
                              >
                                <FaInfo size={12} />
                              </div>
                              <UncontrolledPopover
                                placement="bottom"
                                target={rowSelector}
                                popperClassName="border border-1"
                              >
                                <PopoverHeader>Validation Error</PopoverHeader>
                                <PopoverBody>
                                  {row.original.errorMessage}
                                </PopoverBody>
                              </UncontrolledPopover>
                            </React.Fragment>
                          )}
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                          <div
                            className="spreadsheet-duplicate-indicator"
                            onMouseDown={() =>
                              trackDuplicateWhileDragging(
                                rowIndex,
                                cell.column.id
                              )
                            }
                          ></div>
                        </td>
                      );
                    })}
                    <td className="px-2">
                      <div className="d-flex">
                        <Button
                          size="sm"
                          className="border-0"
                          color="danger"
                          outline
                          onClick={() => deleteRow(rowIndex)}
                        >
                          <FaRegTrashAlt />
                        </Button>
                        <UncontrolledDropdown>
                          <DropdownToggle
                            size="sm"
                            outline
                            className="border-0"
                          >
                            <HiDotsHorizontal />
                          </DropdownToggle>
                          <DropdownMenu>
                            <DropdownItem onClick={() => insertRow(rowIndex)}>
                              Insert Row Before
                            </DropdownItem>
                            <DropdownItem
                              onClick={() => insertRow(rowIndex + 1)}
                            >
                              {" "}
                              Insert Row After
                            </DropdownItem>
                            <DropdownItem
                              onClick={() => insertRow(rowIndex, row.original)}
                            >
                              Duplicate
                            </DropdownItem>
                          </DropdownMenu>
                        </UncontrolledDropdown>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TourStep>
      </CardBody>
    </Card>
  );
};

export default EditableTable;
