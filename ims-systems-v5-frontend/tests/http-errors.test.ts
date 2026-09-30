import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  mapStatusToCode,
  isApiClientError,
} from "@/shared/lib/http";

describe("API error helpers", () => {
  it("maps HTTP statuses to stable codes", () => {
    expect(mapStatusToCode(400)).toBe("VALIDATION_ERROR");
    expect(mapStatusToCode(401)).toBe("UNAUTHORIZED");
    expect(mapStatusToCode(403)).toBe("FORBIDDEN");
    expect(mapStatusToCode(404)).toBe("NOT_FOUND");
    expect(mapStatusToCode(409)).toBe("CONFLICT");
    expect(mapStatusToCode(500)).toBe("INTERNAL_ERROR");
  });

  it("identifies ApiClientError instances", () => {
    const error = new ApiClientError({
      message: "Nope",
      status: 404,
      code: "NOT_FOUND",
    });
    expect(isApiClientError(error)).toBe(true);
    expect(isApiClientError(new Error("x"))).toBe(false);
  });
});
