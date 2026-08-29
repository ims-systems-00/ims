import { useCallback, useEffect, useState } from "react";
const states = {
  default: "Default",
  blinking: "Blinking",
  saveSuccess: "Save success",
  saveFail: "Save fail",
};
export default function useTableCell({
  defaultValue = null,
  onSave = async function () {},
}) {
  const [value, setValue] = useState(defaultValue);
  const [autoSaved, setautoSaved] = useState(states.default);
  let _controlSaveState = useCallback(function (status) {
    setautoSaved(status);
  }, []);
  let _resetSaveState = useCallback(function () {
    // wait for a seceond as indicator animations are a sec long.
    setTimeout(() => setautoSaved(states.default), 1010);
  }, []);
  let handleSave = useCallback(async function (value) {
    _controlSaveState(states.blinking);
    try {
      await onSave(value);
      _controlSaveState(states.saveSuccess);
    } catch (err) {
      _controlSaveState(states.saveFail);
    } finally {
      _resetSaveState();
    }
  }, []);
  let handleChange = useCallback((value) => {
    setValue(value);
  }, []);
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return {
    states,
    autoSaved,
    value,
    handleSave,
    handleChange,
  };
}
