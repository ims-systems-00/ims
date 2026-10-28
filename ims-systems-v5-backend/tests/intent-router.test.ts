import { describe, expect, it } from "vitest";
import { routeChatIntent } from "../src/modules/ai/lib/intent-router";

describe("routeChatIntent", () => {
  it("routes high priority tasks ASAP to tasks list (not risks)", () => {
    const intent = routeChatIntent({
      message: "Show me high priority tasks that need attention ASAP",
      pageHint: "other",
      priorModule: "risks",
    });
    expect(intent.primaryModule).toBe("tasks");
    expect(intent.mode).toBe("list");
    expect(intent.filters.priorityHigh).toBe(true);
    expect(intent.filters.openOnly).toBe(true);
  });

  it("lets explicit task words beat page risk hint and prior risks", () => {
    const intent = routeChatIntent({
      message: "What high priority tasks are open?",
      pageHint: "risks",
      priorModule: "risks",
    });
    expect(intent.primaryModule).toBe("tasks");
    expect(intent.mode).toBe("list");
  });

  it("keeps risks when the user asks about risks", () => {
    const intent = routeChatIntent({
      message: "List open high risks",
      pageHint: "tasks",
    });
    expect(intent.primaryModule).toBe("risks");
    expect(intent.mode).toBe("list");
  });

  it("uses page hint only when message has no module words", () => {
    const intent = routeChatIntent({
      message: "What needs attention?",
      pageHint: "incidents",
    });
    expect(intent.primaryModule).toBe("incidents");
  });

  it("detects overdue task list intent", () => {
    const intent = routeChatIntent({
      message: "Which incomplete tasks are overdue?",
    });
    expect(intent.primaryModule).toBe("tasks");
    expect(intent.mode).toBe("list");
    expect(intent.filters.overdue).toBe(true);
  });

  it("detects detail mode for tell-me-about", () => {
    const intent = routeChatIntent({
      message: "Tell me more about this risk",
      pageHint: "risks",
    });
    expect(intent.primaryModule).toBe("risks");
    expect(intent.mode).toBe("detail");
  });
});
