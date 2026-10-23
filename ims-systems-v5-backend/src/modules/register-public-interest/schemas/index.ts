import { z } from "zod";

export const registerPublicInterestBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(20),
  email: z
    .string()
    .trim()
    .email("Valid email is required")
    .max(50)
    .transform((value) => value.toLowerCase()),
  companyName: z.string().trim().min(1, "Company name is required").max(30),
  product: z.string().trim().min(1, "Product is required"),
});
