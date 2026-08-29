import classNames from "classnames";
import { Input } from "@ims-systems-00/ims-ui-kit";
import useTableCell from "./hooks/useTableCell";

export default function CellEditableText({
  onSave = async function () {},
  defaultValue = "",
  type = "text",
}) {
  const { autoSaved, states, value, handleSave, handleChange } = useTableCell({
    onSave,
    defaultValue,
  });
  return (
    <Input
      type={type}
      className={classNames("", {
        "table-column-save-success": autoSaved === states.saveSuccess,
        "table-column-save-failed": autoSaved === states.saveFail,
        "blink-element": autoSaved === states.blinking,
      })}
      value={value}
      onChange={(e) => {
        handleChange(e.currentTarget.value);
      }}
      onBlur={() => handleSave(value)}
    />
  );
}
