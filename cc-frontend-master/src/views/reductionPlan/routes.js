import InitiativeLayout from "./InitiativeLayout";
import ReductionPlans from "./ReductionPlans";

import Initiatives, { INITIATIVE_STATUS } from "./initiative/Index";
const routes = [
  {
    path: "reduction-plan",
    element: <ReductionPlans />,
  },
  {
    path: "initiatives",
    element: <InitiativeLayout />,
    children: [
      {
        path: "complete",
        element: <Initiatives status={INITIATIVE_STATUS.COMPLETE} />,
      },
      {
        path: "planned",
        element: <Initiatives status={INITIATIVE_STATUS.PLANNED} />,
      },
    ],
  },
];
export default routes;
