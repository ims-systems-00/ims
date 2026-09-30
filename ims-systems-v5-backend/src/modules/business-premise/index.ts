/**
 * Public surface for the Business Premise module.
 * Other modules may import only from this entry.
 *
 * V4 historical: IAM Group Premises (`iamGroupPremises` / `grouppremises`).
 */

export {
  createBusinessPremiseRouter,
  createBusinessPremiseModule,
} from "./routes/business-premise.routes";
export type { BusinessPremiseRouterDeps } from "./routes/business-premise.routes";
export { createBusinessPremiseService } from "./services/business-premise.service";
export type { BusinessPremiseService } from "./services/business-premise.service";
export { createBusinessPremiseRepository } from "./repositories/business-premise.repository";
export { createBusinessPremiseFunctionalUnitAdapter } from "./adapters/functional-unit.adapter";
export type {
  BusinessPremise,
  CreateBusinessPremiseInput,
  UpdateBusinessPremiseInput,
  AttachFunctionalUnitInput,
  ListBusinessPremisesQuery,
  PaginatedBusinessPremises,
} from "./types";
export {
  BUSINESS_PREMISES_RESOURCE,
  PREMISE_LINKABLE_ACCESS_TYPE,
} from "./types";
export { DevAcceptFunctionalUnitAdapter } from "./ports";
export type {
  BusinessPremiseFunctionalUnitPort,
  FunctionalUnitRef,
} from "./ports";
