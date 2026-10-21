import { z } from "zod";

export const createLicenceRequestBodySchema = z
  .object({
    superUser: z.coerce.number().int().min(0).max(10_000).optional().default(0),
    users: z.coerce.number().int().min(0).max(10_000).optional().default(0),
    groups: z.coerce.number().int().min(0).max(10_000).optional().default(0),
    complianceTools: z
      .array(z.string().trim().min(1).max(120))
      .max(50)
      .optional()
      .default([]),
    additionalModules: z
      .array(z.string().trim().min(1).max(120))
      .max(20)
      .optional()
      .default([]),
    message: z.string().trim().max(2000).optional().default(""),
  })
  .refine(
    (value) =>
      value.superUser > 0 ||
      value.users > 0 ||
      value.groups > 0 ||
      value.complianceTools.length > 0 ||
      value.additionalModules.length > 0,
    {
      message:
        "Request at least one licence seat, toolkit, or module",
    }
  );

export const listLicenceRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const licenceRequestIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
