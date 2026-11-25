import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/form-field";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { uploadViaPublicAslToken } from "../api/asl-supplier";
import {
  useAslUploadContextQuery,
  usePublicAslUploadMutation,
} from "../hooks/use-asl-supplier";
import { publicUploadFormSchema } from "../schemas";
import { ASL_DOC_TYPES } from "../types";
import { formatReqLabel } from "../lib/asl-display";

/**
 * Public supplier document upload portal (token-gated, no login).
 */
export function PublicAslUploadPage() {
  const { token } = useParams<{ token: string }>();
  const contextQuery = useAslUploadContextQuery(token);
  const uploadMutation = usePublicAslUploadMutation(token ?? "");
  const [type, setType] = useState("Insurance (PL/EL)");
  const [exp, setExp] = useState("");
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const context = contextQuery.data;

  function pickFile(next: File | null) {
    setFile(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    const parsed = publicUploadFormSchema.safeParse({ type, exp, ref });
    if (!parsed.success) {
      notify.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    if (!file) {
      notify.error("Choose a file to upload");
      return;
    }
    setSubmitting(true);
    try {
      const storageInfo = await uploadViaPublicAslToken(token, file);
      await uploadMutation.mutateAsync({
        type: parsed.data.type,
        exp: parsed.data.exp,
        ref: parsed.data.ref || "",
        storageInfo,
      });
      setDone(true);
      notify.success("Document received");
      await contextQuery.refetch();
    } catch (error) {
      notify.fromError(error, "Unable to upload document");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-lg space-y-4 rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Upload supplier documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your customer asked you to provide insurance certificates or other
            compliance documents for their approved supplier list. No account is
            required — upload below and the file is saved against your supplier
            record.
          </p>
        </div>

        {!token || contextQuery.isError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
            This upload link is invalid or has expired. Ask your contact to
            resend the upload link.
          </p>
        ) : contextQuery.isLoading || !context ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="space-y-2 rounded-md border border-border-subtle px-3 py-3 text-sm">
              <p>
                Supplier: <strong>{context.supplier.name}</strong>
              </p>
              <p className="text-muted-foreground">
                Organisation: {context.orgName}
              </p>
              {context.supplier.missing.length ? (
                <p className="text-muted-foreground">
                  Still needed:{" "}
                  {context.supplier.missing
                    .map((m) => formatReqLabel(m))
                    .join("; ")}
                </p>
              ) : null}
              {context.supplier.expired.length || context.supplier.soon.length ? (
                <p className="text-muted-foreground">
                  Expiring / expired:{" "}
                  {[
                    ...context.supplier.expired,
                    ...context.supplier.soon,
                  ]
                    .map((d) => d.type)
                    .join(", ")}
                </p>
              ) : null}
            </div>

            {done ? (
              <div className="flex items-start gap-2 rounded-md border border-border-subtle px-3 py-3 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                <span>
                  Thank you — your document was saved to the supplier record. You
                  can upload another file below if needed.
                </span>
              </div>
            ) : null}

            <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
              <FormField label="Document type" required>
                <select
                  className="ims-select ims-field"
                  value={type}
                  disabled={submitting}
                  onChange={(e) => setType(e.target.value)}
                >
                  {ASL_DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Expiry date" required>
                <input
                  className="ims-field"
                  type="date"
                  value={exp}
                  disabled={submitting}
                  onChange={(e) => setExp(e.target.value)}
                />
              </FormField>
              <FormField label="Reference">
                <input
                  className="ims-field"
                  value={ref}
                  disabled={submitting}
                  onChange={(e) => setRef(e.target.value)}
                />
              </FormField>
              <FormField label="File" required>
                <div
                  role="button"
                  tabIndex={0}
                  aria-disabled={submitting}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-primary/50 bg-primary/[0.04] px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/[0.07]",
                    dragging && "border-primary bg-primary/10",
                    submitting && "cursor-not-allowed opacity-60"
                  )}
                  onClick={() => {
                    if (!submitting) fileInputRef.current?.click();
                  }}
                  onKeyDown={(event) => {
                    if (
                      (event.key === "Enter" || event.key === " ") &&
                      !submitting
                    ) {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(event: DragEvent) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event: DragEvent) => {
                    event.preventDefault();
                    setDragging(false);
                    if (submitting) return;
                    pickFile(event.dataTransfer.files?.[0] ?? null);
                  }}
                >
                  <Upload className="size-7 text-primary" />
                  <p className="text-sm font-medium">
                    {file
                      ? file.name
                      : "Drag & drop, or click to select a file"}
                  </p>
                  <span className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    Choose file
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    disabled={submitting}
                    onChange={(e) => {
                      pickFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </div>
              </FormField>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Upload document
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
