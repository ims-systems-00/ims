import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDocumentReviewReminderService } from "../src/modules/document-management/services/document-review-reminder.service";

const ledgerCreate = vi.fn();

vi.mock(
  "../src/modules/document-management/repositories/document-review-reminder.model",
  () => ({
    getDocumentReviewReminderModel: () => ({
      create: (...args: unknown[]) => ledgerCreate(...args),
    }),
  })
);

describe("document review reminder service", () => {
  beforeEach(() => {
    ledgerCreate.mockReset();
    ledgerCreate.mockResolvedValue({});
  });

  it("sends on_day and advance reminders for docs, folders, and repos with email", async () => {
    const runDate = new Date(Date.UTC(2026, 0, 10));
    const notify = vi.fn().mockResolvedValue(undefined);
    const sendDocumentEmail = vi.fn().mockResolvedValue(undefined);
    const findIdentitySummariesByIds = vi.fn().mockResolvedValue([
      { id: "u1", name: "Owner", email: "owner@example.com" },
    ]);

    const trees = {
      listDocumentsDueForReviewOnDay: vi.fn(
        async (_orgId: string, start: Date) => {
          // on_day target = 10 Jan; 1_week target = 17 Jan
          if (start.toISOString().startsWith("2026-01-10")) {
            return [
              {
                id: "doc-1",
                organizationId: "org-1",
                repositoryId: "repo-1",
                name: "Policy.pdf",
                type: "document",
                createdBy: "u1",
                documentData: {
                  owners: ["u1"],
                  reviewDate: new Date(Date.UTC(2026, 0, 10)),
                },
                folderData: null,
              },
            ];
          }
          if (start.toISOString().startsWith("2026-01-17")) {
            return [
              {
                id: "doc-2",
                organizationId: "org-1",
                repositoryId: "repo-1",
                name: "Advance.pdf",
                type: "document",
                createdBy: "u1",
                documentData: {
                  owners: ["u1"],
                  reviewDate: new Date(Date.UTC(2026, 0, 17)),
                },
                folderData: null,
              },
            ];
          }
          return [];
        }
      ),
      listFoldersDueForReviewOnDay: vi.fn(
        async (_orgId: string, start: Date) => {
          if (start.toISOString().startsWith("2026-01-10")) {
            return [
              {
                id: "folder-1",
                organizationId: "org-1",
                repositoryId: "repo-1",
                name: "HR folder",
                type: "folder",
                createdBy: "u1",
                documentData: null,
                folderData: {
                  reviewDate: new Date(Date.UTC(2026, 0, 10)),
                },
              },
            ];
          }
          return [];
        }
      ),
    };

    const repositories = {
      listActiveForReviewReminders: vi.fn(async () => [
        {
          id: "repo-1",
          organizationId: "org-1",
          name: "Main library",
          owners: ["u1"],
          createdBy: "u1",
          createdOn: new Date(Date.UTC(2024, 0, 10)),
          reviewInterval: "Yearly",
        },
      ]),
    };

    const organisations = {
      listForReminders: vi.fn(async () => [
        {
          id: "org-1",
          name: "Acme",
          documentReviewReminderOffsets: ["1_week"],
        },
      ]),
    };

    const service = createDocumentReviewReminderService({
      trees: trees as never,
      repositories: repositories as never,
      organisations,
      notifications: { notify },
      email: { sendDocumentEmail },
      users: { findIdentitySummariesByIds },
      accessLinkBaseUrl: "https://app.example.com",
    });

    const sent = await service.processRun(runDate);

    // doc on_day + folder on_day + repo on_day + doc 1_week = 4 ledger claims
    expect(ledgerCreate).toHaveBeenCalled();
    expect(notify).toHaveBeenCalled();
    expect(sendDocumentEmail).toHaveBeenCalled();
    expect(sent).toBeGreaterThanOrEqual(4);

    const titles = notify.mock.calls.flatMap(
      (call) => call[0].recipients?.map((r: { title: string }) => r.title) ?? []
    );
    expect(titles).toEqual(
      expect.arrayContaining([
        "Document review reminder",
        "Folder review reminder",
        "Repository review reminder",
      ])
    );

    expect(sendDocumentEmail.mock.calls[0][0].to).toContain(
      "owner@example.com"
    );
    expect(sendDocumentEmail.mock.calls[0][0].subject).toMatch(/review/i);
  });

  it("skips duplicate ledger writes (already reminded)", async () => {
    ledgerCreate.mockRejectedValueOnce({ code: 11000 });

    const notify = vi.fn();
    const service = createDocumentReviewReminderService({
      trees: {
        listDocumentsDueForReviewOnDay: vi.fn(async () => [
          {
            id: "doc-1",
            organizationId: "org-1",
            repositoryId: "repo-1",
            name: "Policy.pdf",
            type: "document",
            createdBy: "u1",
            documentData: {
              owners: ["u1"],
              reviewDate: new Date(Date.UTC(2026, 0, 10)),
            },
            folderData: null,
          },
        ]),
        listFoldersDueForReviewOnDay: vi.fn(async () => []),
      } as never,
      repositories: {
        listActiveForReviewReminders: vi.fn(async () => []),
      } as never,
      organisations: {
        listForReminders: vi.fn(async () => [
          {
            id: "org-1",
            name: "Acme",
            documentReviewReminderOffsets: [],
          },
        ]),
      },
      notifications: { notify },
    });

    const sent = await service.processRun(new Date(Date.UTC(2026, 0, 10)));
    expect(sent).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
});
