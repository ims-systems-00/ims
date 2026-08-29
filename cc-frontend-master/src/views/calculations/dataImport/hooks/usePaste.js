import { useDataImport } from "../store";

export const usePaste = () => {
  const { updateData, data } = useDataImport();
  const handlePaste = (e, cell, options) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const values = pastedData.split(/\r\n|\n/);
    values.forEach((val, i) => {
      const rowIndex = cell.index + i;
      if (rowIndex < data.length) {
        if (options?.numbersOnly) {
          val = parseFloat(val.replace(/,/g, ""));
        }
        updateData(rowIndex, cell.id, val);
      }
    });
  };
  return { handlePaste };
};
