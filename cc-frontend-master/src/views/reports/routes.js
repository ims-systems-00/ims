import Reports from "./Index.jsx";
import BaseYearCompareReport from "./baseYearCompareReport/Index.jsx";
import SingleYearReport from "./singleYearReport/Index.jsx";
import HistoricTrendsReport from "./historicalTrendsReport/Index.jsx";
import GHGStateMent from "./ghgStatement/Index.jsx";
import Iso14064FullReport from "./iso14064FullReport/Index.jsx";
import SecrReport from "./secrReport/Index.jsx";

const routes = [
  {
    path: "reports",
    element: <Reports />,
  },
  {
    path: "single-year-report",
    element: <SingleYearReport />,
  },
  {
    path: "base-year-compare-report",
    element: <BaseYearCompareReport />,
  },
  {
    path: "historic-trends-report",
    element: <HistoricTrendsReport />,
  },
  {
    path: "ghg-statement",
    element: <GHGStateMent />,
  },
  {
    path: "secr-report",
    element: <SecrReport />,
  },
  {
    path: "iso-14064-full-report",
    element: <Iso14064FullReport />,
  },
];
export default routes;
