import { z } from "zod";

const dateInput = z.coerce.date();

function refineRange(
  value: { start?: Date; end?: Date },
  ctx: z.RefinementCtx
) {
  if (value.start && value.end && value.end.getTime() < value.start.getTime()) {
    ctx.addIssue({
      code: "custom",
      path: ["end"],
      message: "End must be on or after start",
    });
  }
}

export const createCalendarEventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    start: dateInput,
    end: dateInput,
    description: z.string().trim().optional(),
  })
  .superRefine(refineRange);

export const updateCalendarEventFormSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    start: dateInput.optional(),
    end: dateInput.optional(),
    description: z.string().trim().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided"
  )
  .superRefine(refineRange);

export type CreateCalendarEventFormValues = z.infer<
  typeof createCalendarEventFormSchema
>;
export type UpdateCalendarEventFormValues = z.infer<
  typeof updateCalendarEventFormSchema
>;
