import { apiRequest } from "@/shared/lib/http";
import type {
  BookDateInput,
  BookedDates,
  ContactImsSubmitResult,
  GetStartedInput,
} from "../types";

/**
 * Public (no login) Contact IMS endpoints.
 * GET /contact-ims/booked-dates
 */
export function getBookedDates(): Promise<BookedDates> {
  return apiRequest<BookedDates>("/contact-ims/booked-dates");
}

/** POST /contact-ims/book-date */
export function bookDate(body: BookDateInput): Promise<ContactImsSubmitResult> {
  return apiRequest<ContactImsSubmitResult>("/contact-ims/book-date", {
    method: "POST",
    body,
  });
}

/** POST /contact-ims/get-started */
export function getStarted(
  body: GetStartedInput
): Promise<ContactImsSubmitResult> {
  return apiRequest<ContactImsSubmitResult>("/contact-ims/get-started", {
    method: "POST",
    body,
  });
}
