import { InputGroup, InputGroupText, Input } from "@ims-systems-00/ims-ui-kit";
import React, { useEffect, useState } from "react";
import useDebounce from "../hooks/useDebounce";

function Input_({ onSearch = function () {}, ...inputProps }) {
  let { debouncedValue, setDebounced } = useDebounce(500);
  useEffect(
    function () {
      onSearch(debouncedValue);
    },
    [debouncedValue]
  );
  return (
    <Input
      variant={"filled"}
      type={"text"}
      onChange={(e) => setDebounced(e.currentTarget.value.toString())}
      {...inputProps}
    />
  );
}

function SearchItem({ onSearch = function () {}, children, ...inputProps }) {
  if (children)
    return (
      <InputGroup>
        <InputGroupText>{children}</InputGroupText>
        <Input_ onSearch={onSearch} {...inputProps} />
      </InputGroup>
    );
  return <Input_ onSearch={onSearch} {...inputProps} />;
}

export default SearchItem;
