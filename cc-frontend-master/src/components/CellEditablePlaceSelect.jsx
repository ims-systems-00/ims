import classNames from "classnames";
import { Select } from "@ims-systems-00/ims-ui-kit";
import { useCallback, useEffect, useState } from "react";
import usePlacesAutocomplete from "use-places-autocomplete";

const states = {
  default: "Default",
  blinking: "Blinking",
  saveSuccess: "Save success",
  saveFail: "Save fail",
};
export default function CellEditableSelectPlace({
  onSave = async function () {},
  defaultValue = { label: "Select", value: null },
}) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
  } = usePlacesAutocomplete();
  const [autoSaved, setautoSaved] = useState(states.default);
  let _controlSaveState = useCallback(function (status) {
    setautoSaved(status);
  }, []);
  let _resetSaveState = useCallback(function () {
    // wait for a seceond as indicator animations are a sec long.
    setTimeout(() => setautoSaved(states.default), 1010);
  }, []);
  let handleSave = useCallback(async function (changes) {
    _controlSaveState(states.blinking);
    try {
      await onSave(changes);
      _controlSaveState(states.saveSuccess);
    } catch (err) {
      _controlSaveState(states.saveFail);
    } finally {
      _resetSaveState();
    }
  }, []);
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);
  return (
    <Select
      defaultValue={defaultValue}
      className={classNames("react-select", {
        "table-column-save-success": autoSaved === states.saveSuccess,
        "table-column-save-failed": autoSaved === states.saveFail,
        "blink-element": autoSaved === states.blinking,
      })}
      onChange={(e) => {
        setValue(e);
        handleSave(e);
      }}
      onInputChange={setValue}
      options={
        status === "OK"
          ? data.map((place) => ({
              value: place.description,
              label: place.description,
            }))
          : []
      }
    />
  );
}
