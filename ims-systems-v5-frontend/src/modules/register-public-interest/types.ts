export const REGISTER_INTEREST_PRODUCTS = [
  { value: "carbon-calculator", label: "Carbon Calculator" },
] as const;

export type RegisterPublicInterestInput = {
  name: string;
  email: string;
  companyName: string;
  product: string;
};

export type RegisterPublicInterest = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  product: string;
  createdAt: string;
  updatedAt: string;
};

export type RegisterPublicInterestResult = {
  message: string;
  registerPublicInterest: RegisterPublicInterest;
};
