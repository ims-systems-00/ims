import CalculationsLayout from "./CalculationsLayout.jsx";
import CategoryLayout from "./CategoryLayout.jsx";
import CategoryRedirect from "./CategoryRedirect.jsx";
import Boundaries from "./bundaries/Index.jsx";
import Category from "./category/Index.jsx";
import CustomFactor from "./customFactor/Index.jsx";
import DataImport from "./dataImport/Index.jsx";

const routes = [
  {
    path: "calculations",
    element: <CalculationsLayout />,
    children: [
      {
        path: "categories",
        element: <Boundaries />,
      },
    ],
  },
  {
    path: "categories",
    element: <CategoryLayout />,
    children: [
      {
        path: "",
        element: <Category />,
      },
      {
        path: "custom-factors",
        element: <CustomFactor />,
      },
      {
        path: "data-import",
        element: <DataImport />,
      },
      {
        path: "redirect",
        element: <CategoryRedirect />,
      },
    ],
  },
];
export default routes;
