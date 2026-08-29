import {
  FormGroup,
  Label,
  Select,
  InputGroup,
  InputGroupText,
  Spinner,
} from "@ims-systems-00/ims-ui-kit";
import React, { useEffect, useState } from "react";
import useDebounce from "../../../hooks/useDebounce";
import InputError from "../../../components/InputError";
import * as ccCustomFactorService from "../../../services/ccCustomFactorService";
import { useBuildQueryString } from "@ims-systems-00/ims-react-hooks";
import useAPIResponse from "../../../hooks/apiResponse";
function useCustomFactorAutoComplete(category) {
  let [customFactors, setCustomFactors] = useState([]);
  let { debouncedValue, setDebounced } = useDebounce(300);
  let [loading, setloading] = useState(false);
  const { handleError } = useAPIResponse();
  const { query, getQueryString, handleFilter, handleSearch } =
    useBuildQueryString({
      fillter: {
        value: { category },
      },
      pagination: { page: 1, size: 30 },
    });
  useEffect(() => {
    handleFilter({ value: { category } });
  }, [category]);
  useEffect(() => {
    handleSearch({ value: { clientSearch: debouncedValue } });
  }, [debouncedValue]);
  useEffect(() => {
    async function listCustomFactors(query) {
      setloading(true);
      try {
        const response = await ccCustomFactorService.listCustomFactors({
          query: query,
        });
        setCustomFactors(response?.data?.ccCustomFactors);
      } catch (err) {
        handleError(err);
      }
      setloading(false);
    }
    listCustomFactors(getQueryString());
  }, [query]);
  return {
    customFactors,
    setSearch: setDebounced,
    loading,
  };
}
/**
 * this fields indicated what data property for a custom factor should be in the dropdown.
 * specified field should be according to the custom factor data object
 */
export const customFactorSelectableFields = {
  activity: "combinedActivityReference",
  uom: "uom",
};
function SelectCustomFactorBasedFieldInput({
  label = "",
  error = "",
  category = "",
  field = customFactorSelectableFields.activity,
  ...props
}) {
  const { customFactors, loading, setSearch } =
    useCustomFactorAutoComplete(category);
  return (
    <FormGroup>
      {label && <Label>{label}</Label>}
      <InputGroup>
        {loading && <InputGroupText>{<Spinner size="sm" />}</InputGroupText>}
        <Select
          {...props}
          variant="filled"
          onInputChange={setSearch}
          options={customFactors.map((customFactor) => {
            return {
              value: customFactor[field],
              label: customFactor[field],
            };
          })}
        />
      </InputGroup>
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}

export default SelectCustomFactorBasedFieldInput;
