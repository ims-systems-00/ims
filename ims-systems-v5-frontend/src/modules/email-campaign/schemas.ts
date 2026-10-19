import { z } from "zod";
import { CUSTOMER_STAGES } from "@/modules/customers/types";

const stageSchema = z.enum(CUSTOMER_STAGES);

const customAudienceSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  reference: z.string().min(1),
});

export const emailCampaignFormSchema = z
  .object({
    name: z.string().trim().min(1, "Campaign name is required"),
    businessUnitId: z.string().min(1, "Business unit is required"),
    target: z.array(stageSchema).default([]),
    customAudience: z.array(customAudienceSchema).default([]),
    subject: z.string().trim().min(1, "Subject is required"),
    message: z.string().trim().min(1, "Message is required"),
  })
  .superRefine((value, ctx) => {
    if (value.target.length === 0 && value.customAudience.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["target"],
        message: "Select at least one stage or additional customer",
      });
    }
  });

export type EmailCampaignFormValues = z.infer<typeof emailCampaignFormSchema>;
