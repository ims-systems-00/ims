import { z } from "zod";

export const registerPublicInterestFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(20, "Max 20 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(50, "Max 50 characters"),
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(30, "Max 30 characters"),
  product: z.string().trim().min(1, "Select a product"),
});
