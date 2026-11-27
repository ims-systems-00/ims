import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { useCreateTenderQuestionnaireMutation } from "../hooks/use-tender";

type TenderCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
};

const EMPTY = {
  buyer: "",
  title: "",
  reference: "",
  due: "",
  owner: "",
  submissionEmail: "",
  buyerContact: "",
  portalUrl: "",
};

type TenderForm = typeof EMPTY;

/**
 * Creates an empty tender bid workspace from its details. Pack documents
 * (specs, questionnaires, pricing schedules) are added afterwards in the
 * bid sheet's Pack tab.
 */
export function TenderCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: TenderCreateDialogProps) {
  const createMutation = useCreateTenderQuestionnaireMutation();
  const [form, setForm] = useState<TenderForm>(EMPTY);
  const pending = createMutation.isPending;

  function set<K extends keyof TenderForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function close(next: boolean) {
    if (!next) setForm(EMPTY);
    onOpenChange(next);
  }

  async function handleCreate() {
    if (!form.buyer.trim() || !form.title.trim()) {
      notify.error("Buyer and title are required");
      return;
    }
    const opt = (v: string) => v.trim() || undefined;
    try {
      const created = await createMutation.mutateAsync({
        meta: {
          kind: "tender",
          source: "manual",
          allowEmpty: true,
          buyer: form.buyer.trim(),
          title: form.title.trim(),
          reference: opt(form.reference),
          due: form.due || null,
          owner: opt(form.owner),
          submissionEmail: opt(form.submissionEmail),
          buyerContact: opt(form.buyerContact),
          portalUrl: opt(form.portalUrl),
        },
        draft: false,
      });
      notify.success("Tender created — add pack documents next");
      close(false);
      onCreated(created.id);
    } catch (error) {
      notify.fromError(error, "Unable to create tender");
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New tender</DialogTitle>
          <DialogDescription>
            Enter the tender details. You can upload the tender pack
            (specification, questionnaire, pricing schedule) next.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Buyer *">
              <Input
                value={form.buyer}
                disabled={pending}
                autoFocus
                placeholder="e.g. City Council"
                onChange={(e) => set("buyer", e.target.value)}
              />
            </FormField>
            <FormField label="Title *">
              <Input
                value={form.title}
                disabled={pending}
                placeholder="e.g. Facilities management framework"
                onChange={(e) => set("title", e.target.value)}
              />
            </FormField>
            <FormField label="Reference">
              <Input
                value={form.reference}
                disabled={pending}
                onChange={(e) => set("reference", e.target.value)}
              />
            </FormField>
            <FormField label="Due date">
              <Input
                type="date"
                value={form.due}
                disabled={pending}
                onChange={(e) => set("due", e.target.value)}
              />
            </FormField>
            <FormField label="Owner">
              <Input
                value={form.owner}
                disabled={pending}
                placeholder="Defaults to you"
                onChange={(e) => set("owner", e.target.value)}
              />
            </FormField>
            <FormField label="Buyer contact">
              <Input
                value={form.buyerContact}
                disabled={pending}
                onChange={(e) => set("buyerContact", e.target.value)}
              />
            </FormField>
            <FormField label="Submission email">
              <Input
                type="email"
                value={form.submissionEmail}
                disabled={pending}
                onChange={(e) => set("submissionEmail", e.target.value)}
              />
            </FormField>
            <FormField label="Portal URL">
              <Input
                type="url"
                value={form.portalUrl}
                disabled={pending}
                placeholder="https://"
                onChange={(e) => set("portalUrl", e.target.value)}
              />
            </FormField>
          </div>
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void handleCreate()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Create tender
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
