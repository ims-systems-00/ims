import { useMutation, useQuery } from "@tanstack/react-query";
import { bookDate, getBookedDates, getStarted } from "../api/contact-ims";
import type { BookDateInput, GetStartedInput } from "../types";

export const contactImsKeys = {
  bookedDates: ["contact-ims", "booked-dates"] as const,
};

export function useBookedDatesQuery() {
  return useQuery({
    queryKey: contactImsKeys.bookedDates,
    queryFn: getBookedDates,
  });
}

export function useBookDateMutation() {
  return useMutation({
    mutationFn: (body: BookDateInput) => bookDate(body),
  });
}

export function useGetStartedMutation() {
  return useMutation({
    mutationFn: (body: GetStartedInput) => getStarted(body),
  });
}
