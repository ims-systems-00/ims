export const CONTACT_IMS_ISO_STANDARDS = [
  { key: "iso27001", label: "ISO 27001" },
  { key: "iso27002", label: "ISO 27002" },
  { key: "iso20000", label: "ISO 20000" },
  { key: "iso45001", label: "ISO 45001" },
  { key: "iso9001", label: "ISO 9001" },
  { key: "iso14001", label: "ISO 14001" },
  { key: "iso22301", label: "ISO 22301" },
] as const;

export type ContactImsIsoKey =
  (typeof CONTACT_IMS_ISO_STANDARDS)[number]["key"];

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
} & Record<ContactImsIsoKey, boolean>;

export type ContactImsSubmitResult = {
  accepted: true;
  message: string;
  emailed: boolean;
};

export type BookedDates = string[];
