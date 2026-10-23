import type { SecurityIdentity } from "../../../security";
import { ValidationAppError } from "../../../shared";
import { buildCarbonCalculatorInterestEmail } from "../lib/email-bodies";
import type { RegisterPublicInterestEmailPort } from "../ports";
import type { RegisterPublicInterestRepository } from "../repositories/register-public-interest.repository";
import {
  CARBON_CALCULATOR_PRODUCT,
  type RegisterPublicInterestInput,
  type RegisterPublicInterestResult,
} from "../types";

/** Public (anonymous) registrations have no organisation context. */
export const REGISTER_INTEREST_PUBLIC_ORG_ID = "public";

export const REGISTER_INTEREST_SUCCESS_MESSAGE =
  "Interest registered successfully";
export const REGISTER_INTEREST_DUPLICATE_MESSAGE =
  "An email is already registered.";

export type RegisterPublicInterestService = {
  register: (
    identity: SecurityIdentity | null | undefined,
    input: RegisterPublicInterestInput
  ) => Promise<RegisterPublicInterestResult>;
};

export type RegisterPublicInterestServiceDeps = {
  repository: Pick<RegisterPublicInterestRepository, "findByEmail" | "create">;
  email: RegisterPublicInterestEmailPort;
};

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

export function createRegisterPublicInterestService(
  deps: RegisterPublicInterestServiceDeps
): RegisterPublicInterestService {
  const { repository, email } = deps;

  return {
    async register(_identity, input) {
      const normalizedEmail = input.email.trim().toLowerCase();

      if (await repository.findByEmail(normalizedEmail)) {
        throw new ValidationAppError(REGISTER_INTEREST_DUPLICATE_MESSAGE);
      }

      let saved;
      try {
        saved = await repository.create({
          name: input.name,
          email: normalizedEmail,
          companyName: input.companyName,
          product: input.product,
        });
      } catch (error) {
        // Concurrent submission raced past findByEmail.
        if (isDuplicateKeyError(error)) {
          throw new ValidationAppError(REGISTER_INTEREST_DUPLICATE_MESSAGE);
        }
        throw error;
      }

      if (saved.product === CARBON_CALCULATOR_PRODUCT) {
        const confirmation = buildCarbonCalculatorInterestEmail();
        try {
          await email.sendTransactional({
            to: saved.email,
            subject: confirmation.subject,
            html: confirmation.html,
            text: confirmation.text,
            category: "transactional",
            organizationId: REGISTER_INTEREST_PUBLIC_ORG_ID,
            correlationId: `register-interest-${Date.now()}`,
          });
        } catch {
          // The registration is already persisted — do not fail the request
          // if the confirmation email is undeliverable.
        }
      }

      return {
        message: REGISTER_INTEREST_SUCCESS_MESSAGE,
        registerPublicInterest: saved,
      };
    },
  };
}
