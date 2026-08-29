import classNames from "classnames";
import { Select } from "@ims-systems-00/ims-ui-kit";
import useTableCell from "./hooks/useTableCell";
const states = {
  default: "Default",
  blinking: "Blinking",
  saveSuccess: "Save success",
  saveFail: "Save fail",
};
export default function CellEditableSelect({
  onSave = async function () {},
  defaultValue = { label: "Select", value: null },
  options = [],
}) {
  const { autoSaved, states, value, handleSave, handleChange } = useTableCell({
    onSave,
    defaultValue,
  });
  return (
    <Select
      value={value}
      className={classNames("react-select", {
        "table-column-save-success": autoSaved === states.saveSuccess,
        "table-column-save-failed": autoSaved === states.saveFail,
        "blink-element": autoSaved === states.blinking,
      })}
      options={options}
      onChange={(e) => {
        handleChange(e);
        handleSave(e);
      }}
    />
  );
}
