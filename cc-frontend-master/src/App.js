import React from "react";
import { Navigate, useRoutes } from "react-router-dom";
import "scss/app.scss";
import "@ims-systems-00/ims-ui-kit/src/assets/css/nucleo-icons.css";
import "react-perfect-scrollbar/dist/css/styles.css";
import MainLayout from "./layouts/main/Index";
import OnboardingLayout from "./layouts/onboarding/Index";
import {
  mainRoutes,
  publicRoutes,
  onboardingRoutes,
  dataImportroutes,
} from "./routes";
import { Toaster } from "react-hot-toast";
import { Tour } from "./components/Tour";
import DataImportLayout from "./layouts/dataImport/Index";

function App() {
  const element = useRoutes([
    {
      element: <MainLayout />,
      children: [
        ...mainRoutes,
        {
          path: "*",
          element: <Navigate to="/dashboard" />,
        },
      ],
    },
    {
      element: <OnboardingLayout />,
      path: "onboard",
      children: [...onboardingRoutes],
    },
    {
      element: <DataImportLayout />,
      path: "data-import",
      children: [...dataImportroutes],
    },
    ...publicRoutes,
  ]);
  return (
    <div>
      <Toaster />
      <Tour>{element}</Tour>
    </div>
  );
}

export default App;
