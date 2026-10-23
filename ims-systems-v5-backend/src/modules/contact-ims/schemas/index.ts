import { z } from "zod";

const contactFields = {
  name: z.string().trim().min(1, "Name is required").max(20),
  email: z.string().trim().email("Valid email is required").max(50),
  jobTitle: z.string().trim().min(1, "Job title is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  organisationName: z.string().trim().min(1, "Organisation name is required"),
};

export const bookDateBodySchema = z.object({
  ...contactFields,
  additionalInformation: z.string().trim().optional(),
  bookedDate: z.string().trim().min(1, "Booked date is required"),
});

export const getStartedBodySchema = z.object({
  ...contactFields,
  service: z.string().trim().min(1, "Service is required"),
  iso27001: z.boolean(),
  iso27002: z.boolean(),
  iso20000: z.boolean(),
  iso45001: z.boolean(),
  iso9001: z.boolean(),
  iso14001: z.boolean(),
  iso22301: z.boolean(),
});
