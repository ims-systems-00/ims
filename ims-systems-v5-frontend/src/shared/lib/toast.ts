import toast from "react-hot-toast";
import { isApiClientError } from "@/shared/lib/http/errors";

/**
 * Coerce toast content to a string. Passing a plain object into react-hot-toast
 * crashes React ("Objects are not valid as a React child").
 */
export function toToastMessage(message: unknown, fallback = "Unexpected error"): string {
  if (typeof message === "string" && message.trim()) return message;
  if (typeof message === "number" || typeof message === "boolean") {
    return String(message);
  }
  if (message && typeof message === "object") {
    const record = message as Record<string, unknown>;
    if (typeof record.errorDescription === "string" && record.errorDescription) {
      return record.errorDescription;
    }
    if (typeof record.message === "string" && record.message) {
      return record.message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Shared toast helpers for mutation feedback (create / update / delete).
 * Prefer these over inline page banners for operational messages.
 */
export const notify = {
  success(message: unknown) {
    const text = toToastMessage(message, "Done");
    toast.success(text, { id: text });
  },
  error(message: unknown) {
    const text = toToastMessage(message);
    toast.error(text, { id: text });
  },
  info(message: unknown) {
    const text = toToastMessage(message, "Notice");
    toast(text, { id: text });
  },
  /**
   * Shows an error toast from an unknown caught value.
   * Returns the resolved message for callers that still need it.
   */
  fromError(error: unknown, fallback: string): string {
    const message = isApiClientError(error)
      ? error.message
      : toToastMessage(error, fallback);
    toast.error(message, { id: message });
    return message;
  },
};
