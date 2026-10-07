import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../src/shared";
import type { ActivityRepository } from "../src/modules/activities/repositories/activity.repository";
import { createActivitiesService } from "../src/modules/activities/services/activities.service";
import type {
  ActivityListScopePort,
  ActivityOfiFollowUpPort,
} from "../src/modules/activities/ports";
import type {
  Activity,
  CreateActivityInput,
} from "../src/modules/activities/types";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  const now = new Date();
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: DEV_STUB_IDENTITY.organizationId!,
    moduleType: "incidents",
    moduleId: "bbbbbbbbbbbbbbbbbbbbbbbb",
    value: "Initial comment",
    isAutomated: false,
    iconSrc: null,
    extraLogs: [],
    metaInfo: {},
    groupId: null,
    assignedTo: null,
    assignedOn: null,
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: now,
    updatedBy: null,
    updatedOn: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const createInput: CreateActivityInput = {
  moduleType: "incidents",
  moduleId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  value: "Initial comment",
};

describe("ActivitiesService", () => {
  let repository: ActivityRepository;
  let authorizer: Authorizer;
  let ofiFollowUp: ActivityOfiFollowUpPort;
  let listScope: ActivityListScopePort;
  let service: ReturnType<typeof createActivitiesService>;

  beforeEach(() => {
    authorizer = { allow: vi.fn().mockResolvedValue(true) };
    ofiFollowUp = {
      onCipActivityCreated: vi.fn().mockResolvedValue(undefined),
    };
    listScope = {
      resolveScope: vi.fn().mockResolvedValue({ mode: "all" }),
    };
    repository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      hardDelete: vi.fn(),
    } as unknown as ActivityRepository;
    service = createActivitiesService({
      repository,
      authorizer,
      ofiFollowUp,
      listScope,
    });
  });

  it("rejects unauthenticated create", async () => {
    await expect(service.create(null, createInput)).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("rejects empty comment text", async () => {
    await expect(
      service.create(DEV_STUB_IDENTITY, { ...createInput, value: "  " })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("creates manual activity with assignee null", async () => {
    const created = makeActivity();
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.create(DEV_STUB_IDENTITY, createInput);
    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        isAutomated: false,
        assignedTo: null,
        createdBy: DEV_STUB_IDENTITY.subjectId,
        value: "Initial comment",
      })
    );
  });

  it("invokes OFI follow-up for cips creates", async () => {
    const created = makeActivity({
      moduleType: "cips",
      moduleId: "cccccccccccccccccccccccc",
    });
    vi.mocked(repository.create).mockResolvedValue(created);

    await service.create(DEV_STUB_IDENTITY, {
      moduleType: "cips",
      moduleId: "cccccccccccccccccccccccc",
      value: "Working on this OFI",
    });

    expect(ofiFollowUp.onCipActivityCreated).toHaveBeenCalledWith({
      organizationId: DEV_STUB_IDENTITY.organizationId,
      ofiId: "cccccccccccccccccccccccc",
      actorId: DEV_STUB_IDENTITY.subjectId,
    });
  });

  it("blocks update of automated or foreign comments", async () => {
    vi.mocked(repository.findById).mockResolvedValue(
      makeActivity({ isAutomated: true })
    );
    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        value: "nope",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);

    vi.mocked(repository.findById).mockResolvedValue(
      makeActivity({ createdBy: "other-user", isAutomated: false })
    );
    await expect(
      service.update(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa", {
        value: "nope",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates own manual comment value", async () => {
    const existing = makeActivity();
    const updated = makeActivity({ value: "Revised" });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(updated);

    const result = await service.update(
      DEV_STUB_IDENTITY,
      existing.id,
      { value: "Revised" }
    );
    expect(result.value).toBe("Revised");
  });

  it("recordAutomated creates isAutomated true entries", async () => {
    const created = makeActivity({
      isAutomated: true,
      value: "Ada raised this incident.",
    });
    vi.mocked(repository.create).mockResolvedValue(created);

    const result = await service.recordAutomatedForOrganization(
      DEV_STUB_IDENTITY.organizationId!,
      {
        moduleType: "incidents",
        moduleId: "bbbbbbbbbbbbbbbbbbbbbbbb",
        value: "Ada raised this incident.",
        createdBy: "ada",
        iconSrc: "https://cdn.example/system.png",
        extraLogs: [{ title: "Details", description: "Escalated to P1" }],
      }
    );

    expect(result.isAutomated).toBe(true);
    expect(repository.create).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.organizationId,
      expect.objectContaining({
        isAutomated: true,
        createdBy: "ada",
        iconSrc: "https://cdn.example/system.png",
      })
    );
  });

  it("remove returns not found when missing", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);
    await expect(
      service.remove(DEV_STUB_IDENTITY, "aaaaaaaaaaaaaaaaaaaaaaaa")
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
