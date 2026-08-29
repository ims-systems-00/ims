import React from "react";
import { useCategory } from "../stores/categoryStore/index.js";
import { DataImportContextProvider } from "./store/index.js";
import EditableTable from "./Table.jsx";
export default function DataImport() {
  const { category } = useCategory();
  if (!category) return null;
  return (
    <DataImportContextProvider>
      <EditableTable />
    </DataImportContextProvider>
  );
}
