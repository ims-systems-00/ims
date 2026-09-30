import { apiRequest } from "@/shared/lib/http";
import type {
  AccountManagerOverview,
  CreateCustomerInput,
  Customer,
  CustomerOverview,
  ListCustomersParams,
  PaginatedCustomers,
  UpdateCustomerInput,
} from "../types";

function toQuery(params: ListCustomersParams = {}): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search) search.set("search", params.search);
  if (params.stages?.length) search.set("stages", params.stages.join(","));
  if (params.statuses?.length) {
    search.set("statuses", params.statuses.join(","));
  }
  if (params.businessUnitIds?.length) {
    search.set("businessUnitIds", params.businessUnitIds.join(","));
  }
  if (params.accountManagerIds?.length) {
    search.set("accountManagerIds", params.accountManagerIds.join(","));
  }
  if (params.categoryIds?.length) {
    search.set("categoryIds", params.categoryIds.join(","));
  }
  if (params.myCustomers !== undefined) {
    search.set("myCustomers", String(params.myCustomers));
  }
  if (params.sort) search.set("sort", params.sort);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listCustomers(
  params?: ListCustomersParams
): Promise<PaginatedCustomers> {
  return apiRequest<PaginatedCustomers>(`/customers${toQuery(params)}`);
}

export function getCustomer(id: string): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${id}`);
}

export function createCustomer(body: CreateCustomerInput): Promise<Customer> {
  return apiRequest<Customer>("/customers", { method: "POST", body });
}

export function updateCustomer(
  id: string,
  body: UpdateCustomerInput
): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${id}`, { method: "PATCH", body });
}

export function deleteCustomer(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/customers/${id}`, {
    method: "DELETE",
  });
}

export function removeCustomerAttachment(
  id: string,
  attachmentId: string
): Promise<Customer> {
  return apiRequest<Customer>(
    `/customers/${id}/attachments/${attachmentId}`,
    { method: "DELETE" }
  );
}

export function getCustomerOverview(id: string): Promise<CustomerOverview> {
  return apiRequest<CustomerOverview>(`/customers/${id}/overviews`);
}

export function getAccountManagerOverview(
  managerId: string
): Promise<AccountManagerOverview> {
  return apiRequest<AccountManagerOverview>(
    `/customers/analytics/manager-overview/${encodeURIComponent(managerId)}`
  );
}
