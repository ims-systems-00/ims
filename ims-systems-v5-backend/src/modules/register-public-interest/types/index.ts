/** Only this product value triggers a confirmation email. */
export const CARBON_CALCULATOR_PRODUCT = "carbon-calculator";

export type RegisterPublicInterest = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  product: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RegisterPublicInterestInput = {
  name: string;
  email: string;
  companyName: string;
  product: string;
};

export type RegisterPublicInterestResult = {
  message: string;
  registerPublicInterest: RegisterPublicInterest;
};
