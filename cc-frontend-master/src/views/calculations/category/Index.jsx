import React from "react";
import { CategoryCalculationContextProvider } from "./store/index.js";
import CategoryCalculation from "./CategoryCalculation.jsx";
import { useCategory } from "../stores/categoryStore/index.js";

export default function Category() {
  const { category } = useCategory();
  if (!category) return null;
  return (
    <CategoryCalculationContextProvider category={category}>
      <CategoryCalculation />
    </CategoryCalculationContextProvider>
  );
}
