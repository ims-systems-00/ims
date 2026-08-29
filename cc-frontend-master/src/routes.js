import dashboardRoutes from "./views/dashboard/routes";
import organisationRoutes from "./views/organisation/routes";
import parametersRoutes from "./views/parameters/routes";
import calculationsRoutes from "./views/calculations/routes";
import reportsRoutes from "./views/reports/routes";
import reductionPlanRoutes from "./views/reductionPlan/routes";
import authRoutes from "./views/auth/routes";
import logoutRoutes from "./views/logout/routes";
import supportRoutes from "./views/support/routes";
import userRoutes from "./views/user/routes";

export const mainRoutes = [
  ...dashboardRoutes,
  ...organisationRoutes,
  ...parametersRoutes,
  ...calculationsRoutes,
  ...reportsRoutes,
  ...reductionPlanRoutes,
  ...supportRoutes,
  ...userRoutes,
];
export { default as onboardingRoutes } from "./views/onboarding/routes";
export { default as dataImportroutes } from "./views/dataImport/routes";
export const publicRoutes = [...authRoutes, ...logoutRoutes];
