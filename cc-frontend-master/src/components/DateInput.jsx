import {
  Button,
  FormGroup,
  FormText,
  InputDate,
  Label,
} from "@ims-systems-00/ims-ui-kit";
import React from "react";
import InputError from "./InputError";
import { GoInfo } from "react-icons/go";
function DateInput({
  label = "",
  error = "",
  value = { date: undefined, label: undefined },
  dateFormat = "DD/MM/YYYY",
  onChange = function () {},
  helperText = "",
  informationTarget = null,
  mandatorySymbol = false,
  ...props
}) {
  return (
    <FormGroup>
      {label && (
        <Label>
          {label} {mandatorySymbol && <span className="text-danger">•</span>}{" "}
          {informationTarget && (
            <Button
              id={informationTarget}
              size="sm"
              outline
              className="border border-0"
            >
              <GoInfo className="mb-1"  size={18}  />
            </Button>
          )}
        </Label>
      )}
      <InputDate
        variant="filled"
        inputProps={{
          placeholder: "Select a date",
          ...(value?.label && { value: value?.label }),
        }}
        {...(value?.date && {
          value: value?.date,
        })}
        closeOnSelect
        onChange={function (e) {
          let label = typeof e.format === "function" ? e.format(dateFormat) : e;
          onChange({ date: e, label });
        }}
        {...{ dateFormat }}
        {...props}
      />
      {helperText && <FormText color="secondary">{helperText}</FormText>}
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}

export default DateInput;
