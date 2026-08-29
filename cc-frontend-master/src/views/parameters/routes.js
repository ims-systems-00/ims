import Layout from "./Layout";
import AdvancedTracking from "./advancedTracking/Index.jsx";
import Boundaries from "./bundaries/Index.jsx";
import ReportingOverview from "./reportingOverview/Index.jsx";
import GetStarted from "./getStarted/Index.jsx";
import Overviewdocument from "./guidelines/Overviewdocument.jsx";
import Guidelines from "./guidelines/Index.jsx";
import Locations from "./locations/Index.jsx";
import ReportingPeriods from "./reportingPeriods/Index.jsx";
const routes = [
  {
    path: "parameters",
    element: <Layout />,
    children: [
      {
        path: "guidelines",
        element: <Guidelines />,
      },
      {
        path: "overview-document",
        element: <Overviewdocument />,
      },
      {
        path: "reporting-overview",
        element: <ReportingOverview />,
      },
      {
        path: "reporting-periods",
        element: <ReportingPeriods />,
      },
      {
        path: "locations",
        element: <Locations />,
      },
      {
        path: "boundaries",
        element: <Boundaries />,
      },
      {
        path: "advanced-tracking",
        element: <AdvancedTracking />,
      },
      {
        path: "get-started",
        element: <GetStarted />,
      },
    ],
  },
];
export default routes;
