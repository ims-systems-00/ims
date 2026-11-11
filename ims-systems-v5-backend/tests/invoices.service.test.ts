import { describe, expect, it, vi } from "vitest";
import { computeInvoice } from "../src/modules/invoices/services/calculations";
import { createInvoiceService } from "../src/modules/invoices/services/invoice.service";
import { buildInvoicePdf } from "../src/modules/invoices/services/invoice-pdf";
import type { Invoice } from "../src/modules/invoices/types";
import type { SecurityIdentity } from "../src/security";

describe("computeInvoice (spec §9)", () => {
  it("computes line VAT, subtotals, total VAT and discount", () => {
    const { entries, calculations } = computeInvoice(
      [
        { item: "Audit", unitPrice: 100, units: 2, vatRate: 20 },
        { item: "Docs", unitPrice: 50, units: 1, vatRate: 0 },
      ],
      10,
    );
    expect(entries[0]).toMatchObject({ vatFigure: 40, subtotal: 240 });
    expect(entries[1]).toMatchObject({ vatFigure: 0, subtotal: 50 });
    expect(calculations).toEqual({ total: 261, vatFigure: 40, discount: 10 });
  });
});

const identity = {
  subjectId: "user1",
  organizationId: "org1",
} as SecurityIdentity;

function makeService() {
  const store = new Map<string, Invoice>();
  let seq = 0;
  const repository = {
    async nextNumber() {
      return ++seq;
    },
    async create(data: Omit<Invoice, "id" | "createdAt" | "updatedAt">) {
      const inv = { ...data, id: `inv${seq}`, createdAt: new Date(), updatedAt: new Date() };
      store.set(inv.id, inv);
      return inv;
    },
    async findById(_org: string, id: string) {
      return store.get(id) ?? null;
    },
    async list() {
      return { items: [...store.values()], page: 1, pageSize: 10, total: store.size };
    },
    async update(_org: string, id: string, patch: Partial<Invoice>) {
      const cur = store.get(id)!;
      const next = { ...cur, ...patch };
      store.set(id, next);
      return next;
    },
    async remove(_org: string, id: string) {
      return store.delete(id);
    },
  };
  const mailer = { sendInvoice: vi.fn().mockResolvedValue(undefined) };
  const service = createInvoiceService({
    repository: repository as never,
    authorizer: { allow: async () => true } as never,
    customers: {
      getCustomer: async () => ({
        id: "cust1",
        name: "Acme Care",
        businessUnitId: "bu1",
        accountManagerId: "mgr1",
        primaryContact: "Pat",
        primaryEmail: "pat@acme.test",
        secondaryContact: null,
        secondaryEmail: null,
      }),
      getCustomerNamesByIds: async () => new Map([["cust1", "Acme Care"]]),
    },
    mailer,
    notifications: { notifyAccountManager: vi.fn().mockResolvedValue(undefined) },
    issuerName: async () => "IMS Org",
  });
  return { service, mailer };
}

describe("Invoice service lifecycle", () => {
  it("creates Draft with INV reference, sends, marks paid; guards invalid transitions", async () => {
    const { service, mailer } = makeService();
    const created = await service.create(identity, {
      customerId: "cust1",
      dueDate: "2026-11-01",
      entries: [{ item: "Service", unitPrice: 100, units: 1, vatRate: 20 }],
    });
    expect(created.reference).toBe("INV-1");
    expect(created.status).toBe("Draft");
    expect(created.calculations.total).toBe(120);

    await expect(service.markPaid(identity, created.id)).rejects.toThrow(/Only Sent/);

    const sent = await service.send(identity, created.id);
    expect(sent.status).toBe("Sent");
    expect(sent.emails).toEqual([{ name: "Pat", email: "pat@acme.test" }]);
    expect(mailer.sendInvoice).toHaveBeenCalledOnce();

    await expect(
      service.update(identity, created.id, { discount: 5 }),
    ).rejects.toThrow(/Only Draft/);

    const paid = await service.markPaid(identity, created.id);
    expect(paid.status).toBe("Paid");
    await expect(service.send(identity, created.id)).rejects.toThrow(/Paid invoices/);
  });

  it("generates a real PDF", async () => {
    const { service } = makeService();
    const created = await service.create(identity, {
      customerId: "cust1",
      dueDate: "2026-11-01",
      entries: [{ item: "Service", unitPrice: 10, units: 1, vatRate: 0 }],
    });
    const pdf = await buildInvoicePdf(created, "IMS Org");
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    const dl = await service.downloadPdf(identity, created.id);
    expect(dl.filename).toContain("Invoice#001");
  });

  it("resolves ObjectId customerName snapshots from the customer record", async () => {
    const store = new Map<string, Invoice>();
    const customerId = "66d96987f58c40b0133d139a";
    store.set("inv1", {
      id: "inv1",
      number: 1,
      reference: "INV-1",
      organizationId: "org1",
      customerId,
      customerName: customerId,
      groupId: null,
      accountManagerId: null,
      status: "Sent",
      dueDate: new Date("2026-11-01"),
      entries: [{ item: "Service", unitPrice: 10, units: 1, vatRate: 0, vatFigure: 0, subtotal: 10 }],
      calculations: { total: 10, vatFigure: 0, discount: 0 },
      emails: [],
      createdBy: "user1",
      createdOn: new Date(),
      updatedBy: null,
      updatedOn: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const repository = {
      async nextNumber() {
        return 1;
      },
      async create() {
        throw new Error("unused");
      },
      async findById(_org: string, id: string) {
        return store.get(id) ?? null;
      },
      async list() {
        return { items: [...store.values()], page: 1, pageSize: 10, total: store.size };
      },
      async update(_org: string, id: string, patch: Partial<Invoice>) {
        const cur = store.get(id)!;
        const next = { ...cur, ...patch };
        store.set(id, next);
        return next;
      },
      async remove() {
        return false;
      },
    };
    const service = createInvoiceService({
      repository: repository as never,
      authorizer: { allow: async () => true } as never,
      customers: {
        getCustomer: async () => null,
        getCustomerNamesByIds: async () =>
          new Map([[customerId, "Green Energy Solutions Ltd"]]),
      },
      mailer: { sendInvoice: async () => undefined },
      notifications: { notifyAccountManager: async () => undefined },
    });

    const listed = await service.list(identity, { page: 1, pageSize: 10 });
    expect(listed.items[0]?.customerName).toBe("Green Energy Solutions Ltd");
    const fetched = await service.getById(identity, "inv1");
    expect(fetched.customerName).toBe("Green Energy Solutions Ltd");
  });

  it("falls back to Unknown customer when the customer record is missing", async () => {
    const customerId = "631dbbd73b4f48217b194d8d";
    const store = new Map<string, Invoice>([
      [
        "inv2",
        {
          id: "inv2",
          number: 2,
          reference: "INV-2",
          organizationId: "org1",
          customerId,
          customerName: customerId,
          groupId: null,
          accountManagerId: null,
          status: "Sent",
          dueDate: new Date("2026-11-01"),
          entries: [
            {
              item: "Service",
              unitPrice: 10,
              units: 1,
              vatRate: 0,
              vatFigure: 0,
              subtotal: 10,
            },
          ],
          calculations: { total: 10, vatFigure: 0, discount: 0 },
          emails: [],
          createdBy: "user1",
          createdOn: new Date(),
          updatedBy: null,
          updatedOn: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    const service = createInvoiceService({
      repository: {
        async nextNumber() {
          return 1;
        },
        async create() {
          throw new Error("unused");
        },
        async findById(_org: string, id: string) {
          return store.get(id) ?? null;
        },
        async list() {
          return {
            items: [...store.values()],
            page: 1,
            pageSize: 10,
            total: store.size,
          };
        },
        async update(_org: string, id: string, patch: Partial<Invoice>) {
          const cur = store.get(id)!;
          const next = { ...cur, ...patch };
          store.set(id, next);
          return next;
        },
        async remove() {
          return false;
        },
      } as never,
      authorizer: { allow: async () => true } as never,
      customers: {
        getCustomer: async () => null,
        getCustomerNamesByIds: async () => new Map(),
      },
      mailer: { sendInvoice: async () => undefined },
      notifications: { notifyAccountManager: async () => undefined },
    });

    const listed = await service.list(identity, { page: 1, pageSize: 10 });
    expect(listed.items[0]?.customerName).toBe("Unknown customer");
  });
});
