import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  useCustomerOverviewQuery,
  useRemoveCustomerAttachmentMutation,
  useUpdateCustomerMutation,
} from "../hooks/use-customers";
import { attachmentFormSchema } from "../schemas";
import type { Customer, CustomerAttachment } from "../types";
import {
  CustomerStageBadge,
  CustomerStatusBadge,
} from "./customer-badges";
import { CustomerRelatedIncidents } from "./customer-related-incidents";
import { CustomerRelatedTasks } from "./customer-related-tasks";

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="ims-detail-label">{label}</dt>
      <dd className="ims-detail-value break-words">{value ?? "—"}</dd>
    </>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function UserLabel({
  userId,
  onOpen,
}: {
  userId?: string | null;
  onOpen: (id: string) => void;
}) {
  const query = useUserQuery(userId ?? undefined, Boolean(userId));
  if (!userId) return <>—</>;
  const name = query.data?.user.name ?? userId;
  const canOpen = /^[a-fA-F0-9]{24}$/.test(userId);
  if (!canOpen) return <span>{name}</span>;
  return (
    <button
      type="button"
      className="text-left font-medium text-foreground underline-offset-2 hover:underline"
      onClick={() => onOpen(userId)}
    >
      {name}
    </button>
  );
}

function BusinessUnitLabel({ id }: { id?: string }) {
  const query = useFunctionalUnitQuery(id);
  if (!id) return <>—</>;
  return <>{query.data?.name ?? id}</>;
}

export function CustomerDetailsLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="h-20 rounded bg-surface-muted" />
      <div className="h-20 rounded bg-surface-muted" />
    </div>
  );
}

export function CustomerDetails({ customer }: { customer: Customer }) {
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [url, setUrl] = useState("");
  const [attachError, setAttachError] = useState<string | undefined>();

  const isLive = customer.stage === "Live";
  const overviewQuery = useCustomerOverviewQuery(customer.id, isLive);
  const updateMutation = useUpdateCustomerMutation(customer.id);
  const removeAttachment = useRemoveCustomerAttachmentMutation(customer.id);

  async function handleAddAttachment(event: FormEvent) {
    event.preventDefault();
    const parsed = attachmentFormSchema.safeParse({
      fileName,
      url: url || undefined,
    });
    if (!parsed.success) {
      setAttachError(parsed.error.issues[0]?.message ?? "Invalid attachment");
      return;
    }
    setAttachError(undefined);
    try {
      await updateMutation.mutateAsync({
        attachments: [
          {
            fileName: parsed.data.fileName,
            url: parsed.data.url || undefined,
          },
        ],
      });
      setFileName("");
      setUrl("");
      notify.success("Attachment added");
    } catch (error) {
      notify.fromError(error, "Unable to add attachment");
    }
  }

  async function handleRemoveAttachment(attachment: CustomerAttachment) {
    try {
      await removeAttachment.mutateAsync(attachment.id);
      notify.success("Attachment removed");
    } catch (error) {
      notify.fromError(error, "Unable to remove attachment");
    }
  }

  const openIncidents =
    overviewQuery.data?.totalIncidents.find((b) => !b.resolved)?.count ?? 0;
  const resolvedIncidents =
    overviewQuery.data?.totalIncidents.find((b) => b.resolved)?.count ?? 0;

  return (
    <div className="space-y-6">
      {customer.status === "Lost" && customer.reasonForLoss ? (
        <p className="ims-alert ims-alert-error" role="status">
          Lost — {customer.reasonForLoss}
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Overview
        </h3>
        <dl className="ims-detail-grid">
          <Item label="Reference" value={customer.reference} />
          <Item
            label="Organisation profile"
            value={<CustomerStageBadge stage={customer.stage} />}
          />
          <Item
            label="Status"
            value={
              customer.stage === "Live" ? (
                "—"
              ) : (
                <CustomerStatusBadge status={customer.status} />
              )
            }
          />
          <Item
            label="Business unit"
            value={<BusinessUnitLabel id={customer.businessUnitId} />}
          />
          <Item
            label="Account manager"
            value={
              <UserLabel
                userId={customer.accountManager}
                onOpen={setUserSheetId}
              />
            }
          />
          <Item
            label="Contract value"
            value={formatCurrency(customer.contractValue)}
          />
          {customer.stage !== "Live" ? (
            <Item label="Probability" value={`${customer.probability}%`} />
          ) : null}
        </dl>
      </section>

      {isLive ? (
        <section className="space-y-3">
          <h3 className="ims-text-section border-b border-border-subtle pb-2">
            Live overview
          </h3>
          {overviewQuery.isLoading ? (
            <p className="ims-text-meta">Loading overview…</p>
          ) : null}
          {overviewQuery.isError ? (
            <p className="ims-text-meta" role="alert">
              Unable to load customer overview.
            </p>
          ) : null}
          {overviewQuery.isSuccess ? (
            <dl className="ims-detail-grid">
              <Item
                label="Invoices"
                value={overviewQuery.data.totalInvoices}
              />
              <Item label="Open incidents" value={openIncidents} />
              <Item label="Resolved incidents" value={resolvedIncidents} />
              <Item
                label="Invoice amounts"
                value={
                  overviewQuery.data.totalInvoiceAmount.length === 0
                    ? "No invoice analytics available"
                    : overviewQuery.data.totalInvoiceAmount
                        .map(
                          (row) =>
                            `${row.status}: ${formatCurrency(row.amount)} (${row.count})`
                        )
                        .join(" · ")
                }
              />
            </dl>
          ) : null}
          <dl className="ims-detail-grid">
            <Item label="Account number" value={customer.accountNumber || "—"} />
            <Item
              label="Contract start"
              value={formatDate(customer.contractStartDate)}
            />
            <Item
              label="Contract end"
              value={formatDate(customer.contractEndDate)}
            />
            <Item label="Review date" value={formatDate(customer.reviewDate)} />
          </dl>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Contact & address
        </h3>
        <dl className="ims-detail-grid">
          <Item label="Primary contact" value={customer.primaryContact} />
          <Item label="Primary email" value={customer.primaryEmail} />
          <Item label="Secondary contact" value={customer.secondaryContact} />
          <Item label="Secondary email" value={customer.secondaryEmail} />
          <Item label="Phone" value={customer.phoneNumber} />
          <Item label="Source" value={customer.source} />
          <Item
            label="Address"
            value={[
              customer.buildingName,
              customer.streetName,
              customer.town,
              customer.postCode,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          />
          <Item
            label="Registration number"
            value={customer.companyNumber}
          />
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Service & notes
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Service provision"
            value={customer.serviceProvision || "—"}
          />
          <Item label="Notes" value={customer.notes || "—"} />
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Attachments
        </h3>
        {customer.attachments.length === 0 ? (
          <p className="ims-text-meta">No attachments.</p>
        ) : (
          <ul className="space-y-2">
            {customer.attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{file.fileName}</p>
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ims-text-meta underline-offset-2 hover:underline"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={removeAttachment.isPending}
                  onClick={() => void handleRemoveAttachment(file)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form className="space-y-2" onSubmit={(e) => void handleAddAttachment(e)}>
          <FormField label="File name" required error={attachError}>
            <input
              className="ims-field"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
            />
          </FormField>
          <FormField label="URL">
            <input
              className="ims-field"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
            />
          </FormField>
          <Button
            type="submit"
            size="sm"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Adding…" : "Add attachment"}
          </Button>
        </form>
      </section>

      <CustomerRelatedTasks
        customerId={customer.id}
        businessUnitId={customer.businessUnitId}
      />

      {isLive ? (
        <CustomerRelatedIncidents
          customerId={customer.id}
          businessUnitId={customer.businessUnitId}
        />
      ) : null}

      <UserDetailsSheet
        open={Boolean(userSheetId)}
        userId={userSheetId}
        onOpenChange={(open) => {
          if (!open) setUserSheetId(null);
        }}
      />
    </div>
  );
}
