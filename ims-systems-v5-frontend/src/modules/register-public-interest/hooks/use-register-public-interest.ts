import { useMutation } from "@tanstack/react-query";
import { registerPublicInterest } from "../api/register-public-interest";
import type { RegisterPublicInterestInput } from "../types";

export function useRegisterPublicInterestMutation() {
  return useMutation({
    mutationFn: (body: RegisterPublicInterestInput) =>
      registerPublicInterest(body),
  });
}
