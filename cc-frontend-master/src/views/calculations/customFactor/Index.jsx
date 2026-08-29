import React from "react";
import { CustomFactorContextProvider } from "./store";
import CustomFactor from "./CustomFactor.jsx";
import { useCategory } from "../stores/categoryStore/index.js";

export default function () {
  const { category } = useCategory();
  if (!category) return null;
  return (
    <CustomFactorContextProvider>
      <CustomFactor />
    </CustomFactorContextProvider>
  );
}
