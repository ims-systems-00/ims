import { Router } from "express";
import type { EmailBranding } from "../../../infrastructure/email/templates";
import type { EmailSystem } from "../../../infrastructure/queue";
import type { Authorizer } from "../../../security";
import { createInvoiceCustomerAdapter } from "../adapters/customer.adapter";
import { createInvoiceMailerAdapter } from "../adapters/mailer.adapter";
import { createInvoiceController } from "../controllers/invoice.controller";
import { NoOpInvoiceNotificationAdapter, type InvoiceNotificationPort } from "../ports";
import { createInvoiceRepository } from "../repositories/invoice.repository";
import { createInvoiceService, type InvoiceService } from "../services/invoice.service";

export type InvoiceRouterDeps = {
  authorizer: Authorizer;
  email?: EmailSystem;
  notifications?: InvoiceNotificationPort;
  issuerName?: (organizationId: string) => Promise<string>;
  resolveEmailBranding?: (organizationId: string) => Promise<EmailBranding>;
};

/**
 * Compose the Invoices module.
 * Mounted at /api/v1/invoices
 */
export function createInvoiceModule(deps: InvoiceRouterDeps): {
  service: InvoiceService;
  repository: ReturnType<typeof createInvoiceRepository>;
  router: Router;
} {
  const repository = createInvoiceRepository();
  const service = createInvoiceService({
    repository,
    authorizer: deps.authorizer,
    customers: createInvoiceCustomerAdapter(),
    mailer: createInvoiceMailerAdapter(deps.email, deps.resolveEmailBranding),
    notifications: deps.notifications ?? new NoOpInvoiceNotificationAdapter(),
    issuerName: deps.issuerName,
  });
  const controller = createInvoiceController(service);
  const router = Router();

  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.remove);
  router.post("/:id/send", controller.send);
  router.post("/:id/mark-paid", controller.markPaid);
  router.get("/:id/download", controller.download);

  return { service, repository, router };
}
