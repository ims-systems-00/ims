/**
 * Licence Request service — record + auto-approve (V4 parity).
 *
 * Flow (mirrors V4 LicenseRequestedService.createRequest):
 * 1. Save the request as Pending with an LR- reference.
 * 2. Auto-approve: allocate licences (+ Stripe upgrade) via Organisation.
 *    On success mark Granted; on failure the record stays Pending and
 *    the error propagates (staff can follow up manually).
 * 3. Emails (best-effort): support/accounts alert, received confirmation
 *    and processed notice to the organisation's Super Admins.
 */

import type { Logger } from "../../../infrastructure/logging/logger";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from "../../../shared";
import type { OrganisationProfile } from "../../organisation/types";
import type {
  LicenceAllocationPort,
  LicenceRequestRecipientsPort,
} from "../ports";
import type { LicenceRequestRepository } from "../repositories/licence-request.repository";
import type {
  CreateLicenceRequestInput,
  LicenceRequest,
  ListLicenceRequestsQuery,
  PaginatedLicenceRequests,
} from "../types";

export type LicenceRequestService = ReturnType<
  typeof createLicenceRequestService
>;

export type LicenceRequestServiceDeps = {
  repository: LicenceRequestRepository;
  allocation: LicenceAllocationPort;
  email?: EmailSystem;
  supportEmails?: string[];
  recipients?: LicenceRequestRecipientsPort;
  logger?: Logger;
};

function licenceSummary(input: CreateLicenceRequestInput): string {
  const parts: string[] = [];
  if (input.superUser) parts.push(`${input.superUser} Super Admin seat(s)`);
  if (input.users) parts.push(`${input.users} user seat(s)`);
  if (input.groups) parts.push(`${input.groups} business unit(s)`);
  for (const tool of input.complianceTools ?? []) {
    parts.push(`toolkit: ${tool}`);
  }
  for (const mod of input.additionalModules ?? []) {
    parts.push(`module: ${mod}`);
  }
  return parts.join(", ") || "—";
}

export function createLicenceRequestService(
  deps: LicenceRequestServiceDeps
) {
  const { repository, allocation, email, logger } = deps;
  const supportEmails = (deps.supportEmails ?? [])
    .map((row) => row.trim())
    .filter(Boolean);

  function requireOrgIdentity(
    identity: SecurityIdentity | null | undefined
  ): { identity: SecurityIdentity; organizationId: string; subjectId: string } {
    if (!identity?.subjectId) {
      throw new ForbiddenError("Authentication required");
    }
    if (!identity.organizationId) {
      throw new ForbiddenError("Organisation context is required");
    }
    return {
      identity,
      organizationId: identity.organizationId,
      subjectId: identity.subjectId,
    };
  }

  async function sendSafe(input: {
    to: string | string[];
    subject: string;
    html: string;
    category: "system" | "transactional";
    organizationId: string;
    label: string;
  }): Promise<void> {
    if (!email) return;
    const recipients = Array.isArray(input.to) ? input.to : [input.to];
    if (recipients.length === 0) return;
    try {
      await email.sendTransactional({
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.subject,
        category: input.category,
        organizationId: input.organizationId,
      });
    } catch (error) {
      logger?.warn(
        {
          organizationId: input.organizationId,
          label: input.label,
          err: error instanceof Error ? error.message : String(error),
        },
        "Licence request email failed"
      );
    }
  }

  async function emailContext(
    request: LicenceRequest,
    input: CreateLicenceRequestInput
  ): Promise<{ orgName: string; detailRows: string }> {
    const orgName =
      (await deps.recipients
        ?.getOrganisationName(request.organizationId)
        .catch(() => null)) ?? request.organizationId;
    const detailRows = `
      <ul>
        <li>Reference: ${request.reference}</li>
        <li>Organisation: ${orgName}</li>
        <li>Requested: ${licenceSummary(input)}</li>
        ${input.message ? `<li>Message: ${input.message}</li>` : ""}
      </ul>`.trim();
    return { orgName, detailRows };
  }

  async function superAdminEmails(organizationId: string): Promise<string[]> {
    return (
      (await deps.recipients
        ?.listSuperAdminEmails(organizationId)
        .catch(() => [])) ?? []
    );
  }

  /** Sent on submission (V4 order): support alert + received confirmation. */
  async function sendReceivedEmails(
    request: LicenceRequest,
    input: CreateLicenceRequestInput
  ): Promise<void> {
    if (!email) return;
    const { orgName, detailRows } = await emailContext(request, input);

    await sendSafe({
      to: supportEmails,
      subject: `[iMS] New licence request ${request.reference} — ${orgName}`,
      html: `<p>A new licence request was submitted.</p>${detailRows}`,
      category: "system",
      organizationId: request.organizationId,
      label: "support-alert",
    });

    await sendSafe({
      to: await superAdminEmails(request.organizationId),
      subject: `Licence request ${request.reference} received`,
      html: `<p>We received your licence request for ${orgName}.</p>${detailRows}`,
      category: "transactional",
      organizationId: request.organizationId,
      label: "received-confirmation",
    });
  }

  /** Sent after the auto-approve succeeds (V4 licence-request-processed). */
  async function sendProcessedEmail(
    request: LicenceRequest,
    input: CreateLicenceRequestInput
  ): Promise<void> {
    if (!email) return;
    const { orgName, detailRows } = await emailContext(request, input);

    await sendSafe({
      to: await superAdminEmails(request.organizationId),
      subject: `Licence request ${request.reference} granted`,
      html: `<p>Your licence request for ${orgName} has been granted and the licences are now active.</p>${detailRows}`,
      category: "transactional",
      organizationId: request.organizationId,
      label: "processed-notice",
    });
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateLicenceRequestInput
    ): Promise<{ request: LicenceRequest; organisation: OrganisationProfile }> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);

      const hasSeats =
        (input.superUser ?? 0) > 0 ||
        (input.users ?? 0) > 0 ||
        (input.groups ?? 0) > 0;
      const hasTools = (input.complianceTools?.length ?? 0) > 0;
      const hasModules = (input.additionalModules?.length ?? 0) > 0;
      if (!hasSeats && !hasTools && !hasModules) {
        throw new ValidationAppError(
          "Request at least one licence seat, toolkit, or module"
        );
      }

      const pending = await repository.createPending({
        organizationId,
        requestedBy: subjectId,
        data: input,
      });

      await sendReceivedEmails(pending, input);

      // Auto-approve (V4). If this throws, the record stays Pending.
      const organisation = await allocation.allocateLicences(actor, input);

      const granted =
        (await repository.markGranted(pending.id, subjectId)) ?? pending;

      await sendProcessedEmail(granted, input);

      return { request: granted, organisation };
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListLicenceRequestsQuery
    ): Promise<PaginatedLicenceRequests> {
      const { organizationId } = requireOrgIdentity(identity);
      return repository.listByOrganization(organizationId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<LicenceRequest> {
      const { organizationId } = requireOrgIdentity(identity);
      const request = await repository.findByIdForOrganization(
        organizationId,
        id
      );
      if (!request) {
        throw new NotFoundError("Licence request not found");
      }
      return request;
    },
  };
}
