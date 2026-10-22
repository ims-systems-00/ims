import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  ValidationAppError,
} from "../../../shared";
import type { InvoiceRepository } from "../repositories/invoice.repository";
import type {
  InvoiceCustomerPort,
  InvoiceMailerPort,
  InvoiceNotificationPort,
} from "../ports";
import { INVOICES_RESOURCE, type CreateInvoiceInput, type Invoice, type ListInvoicesQuery, type UpdateInvoiceInput } from "../types";
import { computeInvoice } from "./calculations";
import { buildInvoicePdf } from "./invoice-pdf";

export type InvoiceServiceDeps = {
  repository: InvoiceRepository;
  authorizer: Authorizer;
  customers: InvoiceCustomerPort;
  mailer: InvoiceMailerPort;
  notifications: InvoiceNotificationPort;
  /** Issuer display name for PDFs; resolves org name when available. */
  issuerName?: (organizationId: string) => Promise<string>;
};

export type InvoiceService = ReturnType<typeof createInvoiceService>;

export function createInvoiceService(deps: InvoiceServiceDeps) {
  const { repository, authorizer, customers, mailer, notifications } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string,
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: INVOICES_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError("User does not have permission to access invoices");
    }
  }

  function requireOrgIdentity(identity: SecurityIdentity | null | undefined) {
    if (!identity?.organizationId) {
      throw new ForbiddenError("Organisation context is required");
    }
    return { identity, organizationId: identity.organizationId };
  }

  async function requireInvoice(organizationId: string, id: string): Promise<Invoice> {
    const invoice = await repository.findById(organizationId, id);
    if (!invoice) throw new NotFoundError("This invoice has been deleted or removed");
    return invoice;
  }

  async function notify(
    invoice: Invoice,
    actorId: string,
    event: "created" | "sent" | "paid",
  ): Promise<void> {
    if (!invoice.accountManagerId) return;
    try {
      await notifications.notifyAccountManager({
        organizationId: invoice.organizationId,
        actorId,
        accountManagerId: invoice.accountManagerId,
        invoiceId: invoice.id,
        reference: invoice.reference,
        event,
      });
    } catch {
      // Notifications must not fail invoice operations.
    }
  }

  const service = {
    async create(identity: SecurityIdentity | null | undefined, input: CreateInvoiceInput) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      if (!input.entries?.length) {
        throw new ValidationAppError("At least one line item is required");
      }
      const customer = await customers.getCustomer(actor.organizationId, input.customerId);
      if (!customer) throw new NotFoundError("Customer not found");

      const number = await repository.nextNumber(actor.organizationId);
      const { entries, calculations } = computeInvoice(input.entries, input.discount ?? 0);
      const now = new Date();
      const invoice = await repository.create({
        number,
        reference: `INV-${number}`,
        organizationId: actor.organizationId,
        customerId: customer.id,
        customerName: customer.name,
        groupId: customer.businessUnitId,
        accountManagerId: customer.accountManagerId,
        status: "Draft",
        dueDate: new Date(input.dueDate),
        entries,
        calculations,
        emails: [],
        createdBy: actor.identity.subjectId,
        createdOn: now,
        updatedBy: null,
        updatedOn: null,
        deletedAt: null,
      });
      await notify(invoice, actor.identity.subjectId, "created");
      if (input.send) return service.send(actor.identity, invoice.id);
      return invoice;
    },

    async list(identity: SecurityIdentity | null | undefined, query: ListInvoicesQuery) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return repository.list(actor.organizationId, query);
    },

    async getById(identity: SecurityIdentity | null | undefined, id: string) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireInvoice(actor.organizationId, id);
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateInvoiceInput,
    ) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const existing = await requireInvoice(actor.organizationId, id);
      // Stricter than legacy: only Draft invoices may be edited.
      if (existing.status !== "Draft") {
        throw new ValidationAppError("Only Draft invoices can be updated");
      }
      const recompute = computeInvoice(
        input.entries ?? existing.entries,
        input.discount ?? existing.calculations.discount,
      );
      const updated = await repository.update(actor.organizationId, id, {
        dueDate: input.dueDate ? new Date(input.dueDate) : existing.dueDate,
        entries: recompute.entries,
        calculations: recompute.calculations,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      return updated!;
    },

    async remove(identity: SecurityIdentity | null | undefined, id: string) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const existing = await requireInvoice(actor.organizationId, id);
      if (existing.status !== "Draft") {
        throw new ValidationAppError("Only Draft invoices can be deleted");
      }
      await repository.remove(actor.organizationId, id);
      return { id };
    },

    async send(identity: SecurityIdentity | null | undefined, id: string) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id); // spec: send maps to CRM Delete
      const invoice = await requireInvoice(actor.organizationId, id);
      if (invoice.status === "Paid") {
        throw new ValidationAppError("Paid invoices cannot be sent");
      }
      const customer = await customers.getCustomer(actor.organizationId, invoice.customerId);
      const recipients = [
        customer?.primaryEmail
          ? { name: customer.primaryContact ?? customer.name, email: customer.primaryEmail }
          : null,
        customer?.secondaryEmail
          ? { name: customer.secondaryContact ?? customer.name, email: customer.secondaryEmail }
          : null,
      ].filter((r): r is { name: string; email: string } => r != null);
      if (recipients.length === 0) {
        throw new ValidationAppError("Customer has no contact email to send the invoice to");
      }
      const issuer = deps.issuerName
        ? await deps.issuerName(actor.organizationId)
        : "iMS Systems";
      const pdf = await buildInvoicePdf(invoice, issuer);
      await mailer.sendInvoice({
        invoice,
        recipients,
        pdfBase64: Buffer.from(pdf).toString("base64"),
      });
      const updated = await repository.update(actor.organizationId, id, {
        status: "Sent",
        emails: recipients,
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      await notify(updated!, actor.identity.subjectId, "sent");
      return updated!;
    },

    async markPaid(identity: SecurityIdentity | null | undefined, id: string) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const invoice = await requireInvoice(actor.organizationId, id);
      if (invoice.status !== "Sent") {
        throw new ValidationAppError("Only Sent invoices can be marked as paid");
      }
      const updated = await repository.update(actor.organizationId, id, {
        status: "Paid",
        updatedBy: actor.identity.subjectId,
        updatedOn: new Date(),
      });
      await notify(updated!, actor.identity.subjectId, "paid");
      return updated!;
    },

    async downloadPdf(identity: SecurityIdentity | null | undefined, id: string) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);
      const invoice = await requireInvoice(actor.organizationId, id);
      const issuer = deps.issuerName
        ? await deps.issuerName(actor.organizationId)
        : "iMS Systems";
      const pdf = await buildInvoicePdf(invoice, issuer);
      return {
        filename: `Invoice#00${invoice.number}-${new Date().toISOString().slice(0, 10)}.pdf`,
        contentBase64: Buffer.from(pdf).toString("base64"),
      };
    },
  };

  return service;
}
