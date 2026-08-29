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
function SelectCustomFactorInput({
  label = "",
  error = "",
  category = "",
  mandatorySymbol = false,
  ...props
}) {
  const { customFactors, loading, setSearch } =
    useCustomFactorAutoComplete(category);
  return (
    <FormGroup>
      {label && (
        <Label>
          {label} {mandatorySymbol && <span className="text-danger">•</span>}{" "}
        </Label>
      )}
      <InputGroup>
        {loading && <InputGroupText>{<Spinner size="sm" />}</InputGroupText>}
        <Select
          {...props}
          variant="filled"
          onInputChange={setSearch}
          options={customFactors.map((customFactor) => {
            return {
              value: customFactor._id,
              label: `${customFactor.reference}:- ${customFactor.combinedActivityReference}. Factor:- ${customFactor.ghgConversionFactor} KG CO2e/${customFactor.uom}`,
            };
          })}
        />
      </InputGroup>
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}

export default SelectCustomFactorInput;
