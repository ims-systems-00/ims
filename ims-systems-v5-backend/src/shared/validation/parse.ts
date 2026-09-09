import { ZodError, type ZodType } from "zod";
import { ValidationAppError } from "../errors/app-error";

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationAppError("Validation failed", formatZodError(result.error));
  }
  return result.data;
}

export function formatZodError(error: ZodError): Array<{
  path: string;
  message: string;
}> {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}
