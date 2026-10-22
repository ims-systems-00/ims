import type { RequestHandler } from "express";
import { parseWithSchema, sendSuccess } from "../../../shared";
import {
  createInvoiceBodySchema,
  invoiceIdParamSchema,
  listInvoicesQuerySchema,
  updateInvoiceBodySchema,
} from "../schemas";
import type { InvoiceService } from "../services/invoice.service";

export type InvoiceController = {
  create: RequestHandler;
  list: RequestHandler;
  getById: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
  send: RequestHandler;
  markPaid: RequestHandler;
  download: RequestHandler;
};

export function createInvoiceController(service: InvoiceService): InvoiceController {
  const wrap =
    (fn: (req: Parameters<RequestHandler>[0]) => Promise<unknown>, status = 200): RequestHandler =>
    async (req, res, next) => {
      try {
        const data = await fn(req);
        sendSuccess(res, data, status, req.correlationId);
      } catch (error) {
        next(error);
      }
    };

  return {
    create: wrap((req) =>
      service.create(req.identity, parseWithSchema(createInvoiceBodySchema, req.body)),
    ),
    list: wrap((req) =>
      service.list(req.identity, parseWithSchema(listInvoicesQuerySchema, req.query)),
    ),
    getById: wrap((req) =>
      service.getById(req.identity, parseWithSchema(invoiceIdParamSchema, req.params).id),
    ),
    update: wrap((req) =>
      service.update(
        req.identity,
        parseWithSchema(invoiceIdParamSchema, req.params).id,
        parseWithSchema(updateInvoiceBodySchema, req.body),
      ),
    ),
    remove: wrap((req) =>
      service.remove(req.identity, parseWithSchema(invoiceIdParamSchema, req.params).id),
    ),
    send: wrap((req) =>
      service.send(req.identity, parseWithSchema(invoiceIdParamSchema, req.params).id),
    ),
    markPaid: wrap((req) =>
      service.markPaid(req.identity, parseWithSchema(invoiceIdParamSchema, req.params).id),
    ),
    download: wrap((req) =>
      service.downloadPdf(req.identity, parseWithSchema(invoiceIdParamSchema, req.params).id),
    ),
  };
}
