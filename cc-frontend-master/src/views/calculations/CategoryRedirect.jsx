import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

function CategoryRedirect() {
  const [params] = useSearchParams();
  return (
    <Navigate to={"/categories?category=" + params.get("category") || null} />
  );
}

export default CategoryRedirect;
