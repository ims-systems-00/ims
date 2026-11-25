import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
import { readFileAsBase64 } from "../api/tender";
import {
  useCreateTenderQuestionnaireMutation,
  useParseTenderUploadMutation,
} from "../hooks/use-tender";
import type { ParseUploadResult } from "../types";

type TenderImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
};

export function TenderImportDialog({
  open,
  onOpenChange,
  onCreated,
}: TenderImportDialogProps) {
  const parseMutation = useParseTenderUploadMutation();
  const createMutation = useCreateTenderQuestionnaireMutation();

  const [mode, setMode] = useState<"paste" | "file">("file");
  const [text, setText] = useState("");
  const [buyer, setBuyer] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseUploadResult | null>(null);
  const [draft, setDraft] = useState(true);

  const pending = parseMutation.isPending || createMutation.isPending;

  function reset() {
    setMode("file");
    setText("");
    setBuyer("");
    setTitle("");
    setDue("");
    setFileName(null);
    setParsed(null);
    setDraft(true);
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setMode("file");
    try {
      const data = await readFileAsBase64(file);
      const result = await parseMutation.mutateAsync({
        name: file.name,
        data,
      });
      setParsed(result);
      const questionCount = Array.isArray(result.questions)
        ? result.questions.length
        : 0;
      notify.success(
        questionCount
          ? `Parsed ${questionCount} question(s)`
          : "File analysed"
      );
    } catch (error) {
      notify.fromError(error, "Unable to parse file");
      setParsed(null);
    }
  }

  async function handleCreate() {
    try {
      let body;
      if (mode === "paste") {
        if (!text.trim()) {
          notify.error("Paste questionnaire text first");
          return;
        }
        body = {
          text: text.trim(),
          meta: {
            buyer: buyer.trim() || undefined,
            title: title.trim() || undefined,
            due: due || null,
            source: "text",
            allowEmpty: false,
          },
          draft,
        };
      } else {
        if (!parsed) {
          notify.error("Upload and parse a file first");
          return;
        }
        const questions = Array.isArray(parsed.questions)
          ? (parsed.questions as unknown as Record<string, unknown>[])
          : [];
        body = {
          parsed: {
            questions,
            header:
              typeof parsed.header === "number" ? parsed.header : undefined,
            answerCol:
              typeof parsed.answerCol === "number"
                ? parsed.answerCol
                : undefined,
          },
          meta: {
            buyer: buyer.trim() || undefined,
            title: title.trim() || undefined,
            due: due || null,
            source: fileName?.endsWith(".csv")
              ? "csv"
              : fileName?.endsWith(".docx")
                ? "docx"
                : fileName?.endsWith(".xlsx") || fileName?.endsWith(".xls")
                  ? "xlsx"
                  : "text",
            fileName,
            allowEmpty: questions.length === 0,
          },
          draft,
        };
      }

      const created = await createMutation.mutateAsync(body);
      notify.success("Questionnaire created");
      reset();
      onOpenChange(false);
      onCreated(created.id);
    } catch (error) {
      notify.fromError(error, "Unable to create questionnaire");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import questionnaire</DialogTitle>
          <DialogDescription>
            Paste text or upload xlsx / docx / csv. Optionally draft answers
            after create.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "file" ? "default" : "outline"}
              onClick={() => setMode("file")}
            >
              Upload file
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "paste" ? "default" : "outline"}
              onClick={() => setMode("paste")}
            >
              Paste text
            </Button>
          </div>

          {mode === "file" ? (
            <FormField label="File">
              <input
                type="file"
                accept=".xlsx,.xls,.docx,.csv,.txt,.pdf"
                className="ims-field text-sm"
                disabled={pending}
                onChange={(e) =>
                  void handleFile(e.target.files?.[0] ?? null)
                }
              />
              {fileName ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {fileName}
                  {parsed
                    ? ` · ${Array.isArray(parsed.questions) ? parsed.questions.length : 0} questions`
                    : ""}
                </p>
              ) : null}
            </FormField>
          ) : (
            <FormField label="Questionnaire text">
              <textarea
                className="ims-field min-h-[160px] font-mono text-xs"
                value={text}
                disabled={pending}
                placeholder="Paste questions, one per line or from a portal export…"
                onChange={(e) => setText(e.target.value)}
              />
            </FormField>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Buyer">
              <Input
                value={buyer}
                disabled={pending}
                onChange={(e) => setBuyer(e.target.value)}
              />
            </FormField>
            <FormField label="Title">
              <Input
                value={title}
                disabled={pending}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Due date">
            <Input
              type="date"
              value={due}
              disabled={pending}
              onChange={(e) => setDue(e.target.value)}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft}
              disabled={pending}
              onChange={(e) => setDraft(e.target.checked)}
            />
            Draft answers after create
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
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
              <Upload className="size-4" />
            )}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
