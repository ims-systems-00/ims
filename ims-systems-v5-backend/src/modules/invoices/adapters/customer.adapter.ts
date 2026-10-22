/**
 * Invoice → Customers adapter: snapshot of the billing party copied
 * onto the invoice at creation (name, group, account manager, contacts).
 */

import { createCustomerRepository } from "../../customers/repositories/customer.repository";
import type { InvoiceCustomerPort } from "../ports";

export function createInvoiceCustomerAdapter(): InvoiceCustomerPort {
  const customers = createCustomerRepository();
  return {
    async getCustomer(organizationId, customerId) {
      const c = await customers.findById(organizationId, customerId);
      if (!c) return null;
      return {
        id: c.id,
        name: c.name,
        businessUnitId: c.businessUnitId ?? null,
        accountManagerId: c.accountManager ?? null,
        primaryContact: c.primaryContact ?? null,
        primaryEmail: c.primaryEmail ?? null,
        secondaryContact: c.secondaryContact ?? null,
        secondaryEmail: c.secondaryEmail ?? null,
      };
    },
  };
}
