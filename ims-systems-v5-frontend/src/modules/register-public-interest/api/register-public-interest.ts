import { apiRequest } from "@/shared/lib/http";
import type {
  RegisterPublicInterestInput,
  RegisterPublicInterestResult,
} from "../types";

/**
 * Public (no login) product-interest registration.
 * POST /register-public-interest
 */
export function registerPublicInterest(
  body: RegisterPublicInterestInput
): Promise<RegisterPublicInterestResult> {
  return apiRequest<RegisterPublicInterestResult>("/register-public-interest", {
    method: "POST",
    body,
  });
}
