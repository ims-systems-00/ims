import { z } from "zod";

export const applyPartnershipBodySchema = z.object({
  serviceProvision: z.string().trim().min(1).max(2_000),
  customerReach: z.coerce.number().int().min(0).max(1_000_000_000),
  website: z.string().trim().min(1).max(500),
  standards: z.string().trim().min(1).max(2_000),
  description: z.string().trim().min(1).max(5_000),
});

export const partnershipIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
