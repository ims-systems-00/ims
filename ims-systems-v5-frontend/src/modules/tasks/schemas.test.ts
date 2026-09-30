import { describe, expect, it } from "vitest";
import { createTaskFormSchema, updateTaskFormSchema } from "./schemas";

describe("createTaskFormSchema", () => {
  it("requires name, description, due date, and assignees for individual tasks", () => {
    const result = createTaskFormSchema.safeParse({
      name: "",
      description: "",
      dueDate: "",
      priority: "Medium",
      teamPriority: false,
      assigneeIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid individual task payload", () => {
    const result = createTaskFormSchema.safeParse({
      name: "Review access logs",
      description: "Weekly review",
      dueDate: "2026-10-01",
      priority: "High",
      teamPriority: false,
      assigneeIds: ["bbbbbbbbbbbbbbbbbbbbbbbb"],
    });
    expect(result.success).toBe(true);
  });

  it("requires business unit for team tasks", () => {
    const result = createTaskFormSchema.safeParse({
      name: "Team review",
      description: "Unit work",
      dueDate: "2026-10-01",
      priority: "Medium",
      teamPriority: true,
      assigneeIds: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.path.includes("businessUnitId")
        )
      ).toBe(true);
    }
  });

  it("accepts a team task with business unit", () => {
    const result = createTaskFormSchema.safeParse({
      name: "Team review",
      description: "Unit work",
      dueDate: "2026-10-01",
      priority: "Low",
      teamPriority: true,
      businessUnitId: "cccccccccccccccccccccccc",
      assigneeIds: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTaskFormSchema", () => {
  it("rejects empty name", () => {
    const result = updateTaskFormSchema.safeParse({
      name: "  ",
      description: "Desc",
      dueDate: "2026-10-01",
      priority: "Medium",
      teamPriority: false,
      assigneeIds: ["bbbbbbbbbbbbbbbbbbbbbbbb"],
    });
    expect(result.success).toBe(false);
  });
});
