import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/toast";
import { UserDetailsSheet } from "@/modules/users";
import { useUserQuery } from "@/modules/users/hooks/use-users";
import { useFunctionalUnitQuery } from "@/modules/functional-units/hooks/use-functional-units";
import {
  useAddSupplierContractFilesMutation,
  useAddSupplierOnboardingFilesMutation,
  useAddSupplierSlaFilesMutation,
  useRemoveSupplierContractFileMutation,
  useRemoveSupplierOnboardingFileMutation,
  useRemoveSupplierSlaFileMutation,
} from "../hooks/use-suppliers";
import { attachmentFormSchema } from "../schemas";
import type { Supplier, SupplierAttachment } from "../types";
import { SupplierComplianceBadge } from "./supplier-badges";

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

type AttachmentSectionProps = {
  title: string;
  description?: string;
  files: SupplierAttachment[];
  onAdd: (fileName: string, url?: string) => Promise<void>;
  onRemove: (fileId: string) => Promise<void>;
  pending?: boolean;
  removingId?: string | null;
};

function AttachmentSection({
  title,
  description,
  files,
  onAdd,
  onRemove,
  pending,
  removingId,
}: AttachmentSectionProps) {
  const [fileName, setFileName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const parsed = attachmentFormSchema.safeParse({
      fileName,
      url: url || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid attachment");
      return;
    }
    setError(undefined);
    try {
      await onAdd(parsed.data.fileName, parsed.data.url || undefined);
      setFileName("");
      setUrl("");
      notify.success(`${title} added`);
    } catch (err) {
      notify.fromError(err, `Unable to add ${title.toLowerCase()}`);
    }
  }

  return (
    <section className="space-y-3">
      <h3 className="ims-text-section border-b border-border-subtle pb-2">
        {title}
      </h3>
      {description ? <p className="ims-text-meta">{description}</p> : null}

      {files.length === 0 ? (
        <p className="ims-text-meta">No files.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                {file.url ? (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {file.fileName}
                  </a>
                ) : (
                  <span className="font-medium">{file.fileName}</span>
                )}
                <p className="ims-text-meta">
                  Added {formatDate(file.uploadedAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removingId === file.id}
                onClick={() => void onRemove(file.id)}
              >
                {removingId === file.id ? "Removing…" : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="space-y-3 rounded-sm border border-border-subtle p-3"
        onSubmit={(e) => void handleAdd(e)}
      >
        <FormField label="File name" required error={error}>
          <input
            className="ims-field"
            value={fileName}
            disabled={pending}
            onChange={(event) => setFileName(event.target.value)}
          />
        </FormField>
        <FormField label="URL" description="Optional link to the file">
          <input
            className="ims-field"
            value={url}
            disabled={pending}
            placeholder="https://…"
            onChange={(event) => setUrl(event.target.value)}
          />
        </FormField>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
          >
            {pending ? "Adding…" : `Add ${title.toLowerCase()}`}
          </Button>
        </div>
      </form>
    </section>
  );
}

type SupplierDetailsProps = {
  supplier: Supplier;
};

export function SupplierDetails({ supplier }: SupplierDetailsProps) {
  const [userSheetId, setUserSheetId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const addSla = useAddSupplierSlaFilesMutation(supplier.id);
  const removeSla = useRemoveSupplierSlaFileMutation(supplier.id);
  const addContract = useAddSupplierContractFilesMutation(supplier.id);
  const removeContract = useRemoveSupplierContractFileMutation(supplier.id);
  const addOnboarding = useAddSupplierOnboardingFilesMutation(supplier.id);
  const removeOnboarding = useRemoveSupplierOnboardingFileMutation(supplier.id);

  async function handleRemove(
    removeFn: (fileId: string) => Promise<unknown>,
    fileId: string,
    label: string
  ) {
    setRemovingId(fileId);
    try {
      await removeFn(fileId);
      notify.success(`${label} removed`);
    } catch (error) {
      notify.fromError(error, `Unable to remove ${label.toLowerCase()}`);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SupplierComplianceBadge isCompliant={supplier.isCompliant} />
          <span className="ims-text-meta font-mono">{supplier.reference}</span>
        </div>
        <h3 className="text-base font-semibold tracking-tight">
          {supplier.name}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {supplier.serviceProvision}
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="ims-text-section border-b border-border-subtle pb-2">
          Overview
        </h3>
        <dl className="ims-detail-grid">
          <Item
            label="Business unit"
            value={<BusinessUnitLabel id={supplier.businessUnitId} />}
          />
          <Item
            label="Buyer"
            value={
              <UserLabel
                userId={supplier.buyerId}
                onOpen={(id) => setUserSheetId(id)}
              />
            }
          />
          <Item label="Account manager" value={supplier.accountManager} />
          <Item label="Account number" value={supplier.accountNumber} />
          <Item label="Email" value={supplier.email} />
          <Item
            label="Contract value"
            value={formatCurrency(supplier.contractValue)}
          />
          <Item
            label="Contract start"
            value={formatDate(supplier.contractStartDate)}
          />
          <Item
            label="Contract end"
            value={formatDate(supplier.contractEndDate)}
          />
          <Item label="Review date" value={formatDate(supplier.reviewDate)} />
          <Item
            label="Registered by"
            value={
              <UserLabel
                userId={supplier.createdBy}
                onOpen={(id) => setUserSheetId(id)}
              />
            }
          />
          <Item label="Registered" value={formatDate(supplier.createdOn)} />
          <Item label="Updated" value={formatDate(supplier.updatedOn)} />
        </dl>
      </section>

      <AttachmentSection
        title="SLA files"
        description="Presence of SLA or contract files sets the compliance flag."
        files={supplier.slaFiles}
        pending={addSla.isPending}
        removingId={removingId}
        onAdd={async (fileName, url) => {
          await addSla.mutateAsync([{ fileName, url }]);
        }}
        onRemove={(fileId) =>
          handleRemove(
            (id) => removeSla.mutateAsync(id),
            fileId,
            "SLA file"
          )
        }
      />

      <AttachmentSection
        title="Contract files"
        description="Presence of SLA or contract files sets the compliance flag."
        files={supplier.contractFiles}
        pending={addContract.isPending}
        removingId={removingId}
        onAdd={async (fileName, url) => {
          await addContract.mutateAsync([{ fileName, url }]);
        }}
        onRemove={(fileId) =>
          handleRemove(
            (id) => removeContract.mutateAsync(id),
            fileId,
            "Contract file"
          )
        }
      />

      <AttachmentSection
        title="Onboarding files"
        description="Onboarding documents do not affect the compliance flag."
        files={supplier.onboardingFiles}
        pending={addOnboarding.isPending}
        removingId={removingId}
        onAdd={async (fileName, url) => {
          await addOnboarding.mutateAsync([{ fileName, url }]);
        }}
        onRemove={(fileId) =>
          handleRemove(
            (id) => removeOnboarding.mutateAsync(id),
            fileId,
            "Onboarding file"
          )
        }
      />

      <UserDetailsSheet
        userId={userSheetId}
        open={Boolean(userSheetId)}
        onOpenChange={(open) => {
          if (!open) setUserSheetId(null);
        }}
      />
    </div>
  );
}

export function SupplierDetailsLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="h-6 w-2/3 rounded bg-surface-muted" />
      <div className="h-20 rounded bg-surface-muted" />
    </div>
  );
}
