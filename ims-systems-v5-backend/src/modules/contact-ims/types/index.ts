export const CONTACT_IMS_ISO_STANDARDS = [
  "iso27001",
  "iso27002",
  "iso20000",
  "iso45001",
  "iso9001",
  "iso14001",
  "iso22301",
] as const;

export type ContactImsIsoStandard = (typeof CONTACT_IMS_ISO_STANDARDS)[number];

export type ContactImsContactInput = {
  name: string;
  email: string;
  jobTitle: string;
  phone: string;
  organisationName: string;
};

export type BookDateInput = ContactImsContactInput & {
  additionalInformation?: string;
  bookedDate: string;
};

export type GetStartedInput = ContactImsContactInput & {
  service: string;
} & Record<ContactImsIsoStandard, boolean>;

export type ContactImsSubmitResult = {
  accepted: true;
  message: string;
  /** Whether outbound mail was attempted (false when EMAIL_ENABLED=false). */
  emailed: boolean;
};

/** Public booked-dates payload — always empty (no persistence). */
export type BookedDates = string[];
