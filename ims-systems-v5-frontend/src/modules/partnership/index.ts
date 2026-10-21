export { PartnerApplyPage } from "./pages/partner-apply-page";
export { PartnerDashboardPage } from "./pages/partner-dashboard-page";
export {
  useApplyPartnershipMutation,
  useMyPartnershipsQuery,
  usePartnerDashboardQuery,
  usePartnershipByCodeQuery,
} from "./hooks/use-partnerships";
export type {
  ApplyPartnershipInput,
  Partnership,
  PartnershipDashboard,
  PartnershipStatus,
} from "./types";
