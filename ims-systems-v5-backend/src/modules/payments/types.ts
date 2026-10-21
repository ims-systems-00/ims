/** Licence quantities used to build Checkout / subscription upgrades. */

export type StripeCheckoutLicences = {
  groups: number;
  users: number;
  superUser: number;
  complianceTools: string[];
  additionalModules: string[];
  /** When true, include compliance + add-module line items (Trial path). */
  includeToolkitsAndModules: boolean;
};

export type StripeLicenceDelta = {
  groups: number;
  users: number;
  superUser: number;
  complianceTools: string[];
  additionalModules: string[];
};

export type CheckoutSessionResult = {
  url: string;
  id: string;
};
