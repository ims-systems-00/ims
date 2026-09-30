import toast from "react-hot-toast";
import { isApiClientError } from "@/shared/lib/http/errors";

/**
 * Shared toast helpers for mutation feedback (create / update / delete).
 * Prefer these over inline page banners for operational messages.
 */
export const notify = {
  success(message: string) {
    toast.success(message, { id: message });
  },
  error(message: string) {
    toast.error(message, { id: message });
  },
  /**
   * Shows an error toast from an unknown caught value.
   * Returns the resolved message for callers that still need it.
   */
  fromError(error: unknown, fallback: string): string {
    const message = isApiClientError(error) ? error.message : fallback;
    toast.error(message, { id: message });
    return message;
  },
};
