import { useRef, useState } from "react";
import { useCategory } from "../../stores/categoryStore";
import * as yup from "yup";
import CC_CONSTANTS from "../../../../constants";
import * as ccCalculationService from "../../../../services/ccCalculationService";
import useAPIResponse from "../../../../hooks/apiResponse";
export const categroyCalculationFormValidaionSchema = yup.object({
  reportingYear: yup.number().required().label("Reporting Year"),
  reportingMonth: yup.string().required().label("Reporting Month"),
  calculationMethod: yup.string().required().label("Calculation Method"),
  activity: yup.string().when("calculationMethod", {
    is: (calculationMethod) => {
      return (
        calculationMethod &&
        [
          CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
          CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
          CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
        ].includes(calculationMethod.value)
      );
    },
    then: () => yup.string().optional().nullable().label("Activity"),
    otherwise: () => yup.string().required().label("Activity"),
  }),
  unit: yup.string().when("calculationMethod", {
    is: (calculationMethod) => {
      return (
        calculationMethod &&
        [
          CC_CONSTANTS.CC_CALCULATION_METHODS.CUSTOM,
          CC_CONSTANTS.CC_CALCULATION_METHODS.SUPPLIER_SPECIFIC_METHOD,
          CC_CONSTANTS.CC_CALCULATION_METHODS.MARKET_BASED_METHOD,
        ].includes(calculationMethod.value)
      );
    },
    then: () => yup.string().optional().nullable().label("Unit"),
    otherwise: () => yup.string().required().label("Unit"),
  }),
  // customFactorId: yup.string().optional().nullable().label("customFactorId"),
  amount: yup.number().min(1).required().label("Amount"),
  customReference: yup.string().optional().label("Reference"),
  supplierName: yup.string().optional().label("Supplier Name"),
  meterNumber: yup.string().optional().label("Meter Number"),
  invoiceNumber: yup.string().optional().label("Invoice Number"),
  activityDataGrade: yup
    .string()
    .oneOf(Object.values(CC_CONSTANTS.CC_DATA_QUALITY_GRADES))
    .label("activityDataGrade"),
});
const defaultRowData = {
  customReference: "",
  reportingYear: new Date().getFullYear() - 1,
  reportingMonth: "Annual",
  calculationMethod: "",
  activity: "",
  unit: "",
  amount: 0,
  activityDataGrade: CC_CONSTANTS.CC_DATA_QUALITY_GRADES.VERY_GOOD,
  supplierName: "",
  meterNumber: "",
  invoiceNumber: "",
  isValid: false,
  isImported: false,
  errorMessage: "Please Enter Data",
};
export default function useStore({}) {
  const { handleError, handleSuccess } = useAPIResponse();
  const { category, scope, scopeName } = useCategory();
  const [data, setData] = useState(() =>
    Array(10)
      .fill(null)
      .map(() => defaultRowData)
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
  const [importInProgress, setInportInprogress] = useState(false);
  const [isDuplicatorDragging, setIsDuplicatorDragging] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [endCell, setEndCell] = useState(null);

  const trackDuplicateWhileDragging = (rowIndex, columnId) => {
    setIsDuplicatorDragging(true);
    setStartCell({ rowIndex, columnId });
    setEndCell({ rowIndex, columnId });
  };

  const handleCellSelection = (rowIndex, columnId) => {
    setIsDragging(true);
    setStartCell({ rowIndex, columnId });
    setEndCell({ rowIndex, columnId });
  };
  const trackEndCellWhileDragging = (rowIndex, columnId) => {
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
          let updates = {
            ...row,
            [startCol]: startValue, // Duplicate the value
          };
          updates = _validateUpdates(startCol, updates);
          return updates;
        }
        return row;
      });

      setData(newData);
    }
    setIsDuplicatorDragging(false);
    setStartCell(null);
    setEndCell(null);
  };

  const _validateUpdates = (columnId, updates) => {
    if (columnId === "calculationMethod")
      updates = { ...updates, activity: "", unit: "" };
    try {
      categroyCalculationFormValidaionSchema.validateSync(updates);
      updates = { ...updates, isValid: true, errorMessage: "" };
    } catch (err) {
      updates = { ...updates, isValid: false, errorMessage: err.message };
    }
    return updates;
  };

  const updateData = (rowIndex, columnId, value) => {
    setData((old) => {
      const newData = old.map((row, i) => {
        if (i === rowIndex) {
          let updates = { ...row, [columnId]: value };
          // if calculation method is being changed we reset activity and unit
          updates = _validateUpdates(columnId, updates);
          return updates;
        }
        return row;
      });
      saveHistory(newData);
      return newData;
    });
  };
  const insertRow = (rowIndex, newrow = defaultRowData) => {
    setData((prevItems) => [
      ...prevItems.slice(0, rowIndex),
      newrow,
      ...prevItems.slice(rowIndex),
    ]);
  };
  const deleteRow = (rowIndex) => {
    setData((old) => old.filter((item, i) => i !== rowIndex));
  };
  const areAllDataValid = () => {
    let validRows = [];
    data.forEach((d) => {
      if (d.isValid) validRows.push(d);
    });
    return validRows.length === data.length;
  };
  const importDataSync = async () => {
    setInportInprogress(true);
    for (let index = 0; index < data.length; index++) {
      let d = data[index];
      try {
        const response = await ccCalculationService.createCalculation({
          category,
          scope,
          scopeName,
          location: null,
          customFactorId: null,
          customReference: d.customReference,
          reportingYear: Number(d.reportingYear),
          reportingMonth: d.reportingMonth,
          calculationMethod: d.calculationMethod,
          activity: d.activity,
          unit: d.unit,
          supplierName: d.supplierName,
          invoiceNumber: d.invoiceNumber,
          meterNumber: d.meterNumber,
          amount: Number(d.amount),
          activityDataGrade: d.activityDataGrade,
        });
        handleSuccess(response);
        updateData(index, "isImported", true);
      } catch (err) {
        handleError(err);
      }
    }
    setInportInprogress(false);
    setData([]);
  };
  const insertEmptyRows = (count = 1) => {
    for (let i = 0; i < count; i++) {
      insertRow(0);
    }
  };
  return {
    data,
    importInProgress,
    defaultRowData,
    isDuplicatorDragging,
    isDragging,
    startCell,
    endCell,
    history,
    redoStack,
    saveHistory,
    undo,
    redo,
    updateData,
    insertRow,
    insertEmptyRows,
    deleteRow,
    importDataSync,
    areAllDataValid,
    duplicateCells,
    trackEndCellWhileDragging,
    trackDuplicateWhileDragging,
  };
}
