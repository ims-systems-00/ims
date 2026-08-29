import { Button } from "@ims-systems-00/ims-ui-kit";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classNames from "classnames";
import React, { useRef, useState } from "react";
import { useParameters } from "../../store/parametersStore";
import {
  MONTH_FULL_NAMES,
  getCalculationMethodDropdown,
  getCombinedActivityReferenceDropdown,
  getUnitDropdown,
} from "../calculations/category/dto/categoryCalculation.dto";
import CC_CONSTANTS from "../../constants";
const TableContext = React.createContext();
const columnHelper = createColumnHelper();
const useTableContext = () => React.useContext(TableContext);
const usePaste = () => {
  const { updateData, data } = useTableContext();
  const handlePaste = (e, cell) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const values = pastedData.split("\n");
    values.forEach((val, i) => {
      const rowIndex = cell.index + i;
      if (rowIndex < data.length) {
        updateData(rowIndex, cell.id, val);
      }
    });
  };
  return { handlePaste };
};
const CellAmount = ({ getValue, row: { index }, column: { id } }) => {
  const { handlePaste } = usePaste();
  const { updateData } = useTableContext();
  return (
    <input
      value={getValue()}
      type="number"
      onChange={(e) => {
        updateData(index, id, e.target.value);
      }}
      onPaste={(e) => handlePaste(e, { id, index })}
      style={{ width: "100%" }}
    />
  );
};
const CellCustomReference = ({ getValue, row: { index }, column: { id } }) => {
  const { handlePaste } = usePaste();
  const { updateData } = useTableContext();
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
  const { updateData } = useTableContext();
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
const CellUnit = ({ getValue, row: { index }, column: { id } }) => {
  const { updateData } = useTableContext();
  const options = getUnitDropdown(
    "Company Premises",
    "Fuel-Based",
    "Gaseous fuels, Natural gas"
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
      {options.map((option, i) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
const CellActivity = ({ getValue, row: { index }, column: { id } }) => {
  const { updateData } = useTableContext();
  const options = getCombinedActivityReferenceDropdown(
    "Company Premises",
    "Fuel-Based"
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
  const { updateData } = useTableContext();
  const options = getCalculationMethodDropdown("Company Premises").map((i) => ({
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
  const { updateData } = useTableContext();
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
  const { updateData } = useTableContext();
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
  const [data, setData] = useState(() =>
    Array(50)
      .fill(null)
      .map(() => ({
        customReference: "",
        reportingYear: new Date().getFullYear(),
        reportingMonth: "",
        calculationMethod: "",
        activity: "",
        unit: "",
        amount: 0,
        activityDataGrade: "",
      }))
  );
  const history = useRef([]);
  const redoStack = useRef([]);
  const saveHistory = (newData) => {
    history.current.push(data);
    redoStack.current = [];
    setData(newData);
  };

  const undo = () => {
    if (history.current.length > 0) {
      redoStack.current.push(data);
      setData(history.current.pop());
    }
  };

  const redo = () => {
    if (redoStack.current.length > 0) {
      history.current.push(data);
      setData(redoStack.current.pop());
    }
  };
  // Dragging state
  const [isDuplicatorDragging, setIsDuplicatorDragging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [endCell, setEndCell] = useState(null);

  // Handle mouse down (start dragging)
  const handleDuplicate = (rowIndex, columnId) => {
    setIsDuplicatorDragging(true);
    setStartCell({ rowIndex, columnId });
    setEndCell({ rowIndex, columnId });
  };

  const handleCellSelection = (rowIndex, columnId) => {
    isDragging(true);
    setStartCell({ rowIndex, columnId });
    setEndCell({ rowIndex, columnId });
  };

  // Handle mouse enter (while dragging)
  const handleMouseEnter = (rowIndex, columnId) => {
    setEndCell({ rowIndex, columnId });
  };

  const duplicateCells = () => {
    if (isDuplicatorDragging && startCell && endCell) {
      const { rowIndex: startRow, columnId: startCol } = startCell;
      const { rowIndex: endRow, columnId: endCol } = endCell;

      const startValue = data[startRow][startCol];

      // Update the cells in the selected range
      const newData = data.map((row, rowIndex) => {
        if (
          rowIndex >= Math.min(startRow, endRow) &&
          rowIndex <= Math.max(startRow, endRow)
        ) {
          return {
            ...row,
            [startCol]: startValue, // Duplicate the value
          };
        }
        return row;
      });

      setData(newData);
    }
    setIsDuplicatorDragging(false);
    setStartCell(null);
    setEndCell(null);
  };

  // Handle mouse up (end dragging)
  const handleMouseUp = () => {
    duplicateCells();
  };

  // Update data function
  const updateData = (rowIndex, columnId, value) => {
    setData((old) => {
      const newData = old.map((row, i) => {
        if (i === rowIndex) {
          return {
            ...row,
            [columnId]: value,
          };
        }
        return row;
      });
      saveHistory(newData);
      return newData;
    });
  };

  // Initialize the table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <TableContext.Provider
      value={{
        data,
        updateData,
      }}
    >
      <div className="mb-2">
        <Button
          className="rounded-pill"
          size="sm"
          onClick={undo}
          disabled={history.current.length === 0}
          color="primary"
        >
          Undo
        </Button>
        <Button
          className="rounded-pill"
          size="sm"
          onClick={redo}
          disabled={redoStack.current.length === 0}
          color="primary"
        >
          Redo
        </Button>
      </div>
      <div className="spreadsheet">
        <table onMouseUp={handleMouseUp}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const cellKey = `${rowIndex}-${cell.column.id}`;
                  const isSelected =
                    isDuplicatorDragging &&
                    rowIndex >=
                      Math.min(startCell?.rowIndex, endCell?.rowIndex) &&
                    rowIndex <=
                      Math.max(startCell?.rowIndex, endCell?.rowIndex) &&
                    cell.column.id === startCell?.columnId;
                  return (
                    <td
                      key={cell.id + cellKey}
                      onMouseEnter={() =>
                        handleMouseEnter(rowIndex, cell.column.id)
                      }
                      className={classNames({
                        "spreadsheet-cell-selected": isSelected,
                      })}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                      <div
                        className="spreadsheet-duplicate-indicator"
                        onMouseDown={() =>
                          handleDuplicate(rowIndex, cell.column.id)
                        }
                      ></div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableContext.Provider>
  );
};

export default EditableTable;
