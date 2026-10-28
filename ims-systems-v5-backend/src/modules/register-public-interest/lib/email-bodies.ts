import { renderEmail } from "../../../infrastructure/email/templates";

/** Carbon Calculator early-access confirmation (static copy per spec). */
export function buildCarbonCalculatorInterestEmail() {
  return renderEmail("register-interest-confirmation", {});
}
