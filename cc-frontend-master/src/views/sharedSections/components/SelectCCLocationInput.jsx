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
import * as ccLocationService from "../../../services/ccLocationService";
import { HiOutlineLocationMarker } from "react-icons/hi";

function useCCLocationAutoComplete() {
  let [locations, setLocations] = useState([]);
  let { debouncedValue, setDebounced } = useDebounce(300);
  let [loading, setloading] = useState(false);
  useEffect(() => {
    async function listLocations(search) {
      try {
        setloading(true);
        let locationResponse = await ccLocationService.listLocations({
          query: "clientSearch=" + search || "",
        });
        setLocations(locationResponse.data.ccLocations);
      } catch (err) {
        console.log(err);
      }
      setloading(false);
    }
    listLocations(debouncedValue);
  }, [debouncedValue]);
  return {
    locations,
    setSearch: setDebounced,
    loading,
  };
}

function SelectCCLocationInput({
  label = "",
  error = "",
  onSelect = function () {},
  ...props
}) {
  const { locations, loading, setSearch } = useCCLocationAutoComplete();
  return (
    <FormGroup>
      {label && <Label>{label}</Label>}
      <InputGroup>
        <InputGroupText>
          {!loading ? <HiOutlineLocationMarker /> : <Spinner size="sm" />}
        </InputGroupText>
        <Select
          {...props}
          variant="filled"
          onChange={onSelect}
          onInputChange={setSearch}
          options={locations.map((loc) => ({
            value: loc._id,
            label: loc.locationRef,
          }))}
        />
      </InputGroup>
      {error && <InputError>{error}</InputError>}
    </FormGroup>
  );
}

export default SelectCCLocationInput;
