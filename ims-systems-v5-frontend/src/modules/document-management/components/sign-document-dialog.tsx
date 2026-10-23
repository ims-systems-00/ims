import { useEffect, useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import type { SignDocumentInput } from "../types";

type SignDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  defaultName?: string;
  submitting?: boolean;
  onSign: (input: SignDocumentInput) => Promise<void>;
};

const SIGNATURE_FONTS = [
  "Dancing Script",
  "Great Vibes",
  "Times Italic",
  "Helvetica",
];

/**
 * Sign form shared by internal signing and the public external-signing
 * page. The backend stamps the typed signature onto the PDF at the
 * locations chosen when the request was created.
 */
export function SignDocumentDialog({
  open,
  onOpenChange,
  documentName,
  defaultName = "",
  submitting = false,
  onSign,
}: SignDocumentDialogProps) {
  const [name, setName] = useState(defaultName);
  const [font, setFont] = useState(SIGNATURE_FONTS[0]);
  const [jobTitle, setJobTitle] = useState("");
  const [organisation, setOrganisation] = useState("");

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  async function handleSign() {
    if (!name.trim()) {
      notify.error("Type your full name to sign");
      return;
    }
    await onSign({
      name: name.trim(),
      font,
      jobTitle: jobTitle.trim() || undefined,
      organisation: organisation.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign document</DialogTitle>
          <DialogDescription>
            Sign{" "}
            <span className="font-medium text-foreground">{documentName}</span>
            . Your signature will be stamped onto a signed copy of the PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Full name" htmlFor="sign-name">
            <Input
              id="sign-name"
              placeholder="Your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>

          <FormField label="Signature style" htmlFor="sign-font">
            <select
              id="sign-font"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={font}
              onChange={(event) => setFont(event.target.value)}
            >
              {SIGNATURE_FONTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>

          {name.trim() ? (
            <div className="space-y-1.5">
              <p className="text-[0.6875rem] uppercase tracking-wide text-muted-foreground">
                Signature preview
              </p>
              {/* Mirrors the stamped signature block on the signed PDF. */}
              <div className="relative overflow-hidden rounded border border-slate-300 bg-white py-2.5 pl-4 pr-3 shadow-sm">
                <span className="absolute inset-y-0 left-0 w-[3px] bg-[#1c3a7a]" />
                <p
                  className={
                    font === "Helvetica"
                      ? "text-lg font-medium text-[#0d2966]"
                      : "font-serif text-[1.35rem] italic leading-tight text-[#0d2966]"
                  }
                >
                  {name.trim()}
                </p>
                <div className="mt-1 border-t border-[#596b94]" />
                <p className="mt-1.5 truncate text-[0.7rem] font-semibold text-slate-700">
                  {name.trim()}
                  {jobTitle || organisation
                    ? ` · ${[jobTitle, organisation].filter(Boolean).join(", ")}`
                    : ""}
                </p>
                <p className="text-[0.65rem] text-slate-500">
                  Electronically signed · iMS Systems
                </p>
              </div>
            </div>
          ) : null}

          <FormField label="Job title (optional)" htmlFor="sign-title">
            <Input
              id="sign-title"
              placeholder="e.g. Operations Manager"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
            />
          </FormField>

          <FormField label="Organisation (optional)" htmlFor="sign-org">
            <Input
              id="sign-org"
              placeholder="e.g. Acme Ltd"
              value={organisation}
              onChange={(event) => setOrganisation(event.target.value)}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleSign()}
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <PenLine className="size-3.5" />
            )}
            Sign document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
