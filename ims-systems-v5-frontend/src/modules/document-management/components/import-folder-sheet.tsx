import { useEffect, useMemo, useRef, useState } from "react";
import { FolderInput, Loader2, X } from "lucide-react";
import { AppSheet } from "@/shared/components/app-sheet";
import { FormField } from "@/shared/components/form-field";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { loadPublicEnv } from "@/shared/lib/env";
import { isApiClientError } from "@/shared/lib/http";
import { useSessionProfileUserId } from "@/security";
import { uploadFileViaHandler } from "@/modules/files";
import {
  COMPLIANCE_TOOLKIT_NAMES,
  isComplianceToolkitName,
  toolkitDisplayLabel,
} from "@/modules/compliance";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import { useUsersQuery } from "@/modules/users/hooks/use-users";
import { signalSetupEvent } from "@/modules/setup-guide";
import {
  createFileNodes,
  ensureFolderNode,
  getNodePath,
} from "../api/document-management";
import { useInvalidateDocumentQueries } from "../hooks/use-document-management";
import { fromDateInputValue } from "../lib/format";
import {
  buildImportSelection,
  formatBytes,
  IMPORT_FILE_BATCH_SIZE,
  removeImportEntry,
  supportsDirectoryPicker,
  validateImportSelection,
  type ImportFileEntry,
  type ImportSelectionStats,
} from "../lib/import-folder";
import { uploadDocumentFormSchema } from "../schemas";
import {
  COMPLIANCE_TOOLKIT_TO_DOCUMENT_TOOL,
  DOCUMENT_APPLICABLE_MODULE_LABELS,
  DOCUMENT_APPLICABLE_MODULES,
  DOCUMENT_COMPLIANCE_TOOL_LABELS,
  DOCUMENT_PURPOSE_LABELS,
  DOCUMENT_PURPOSES,
  type DocumentApplicableModule,
  type DocumentComplianceTool,
  type DocumentPurpose,
} from "../types";
import { FileTypeIcon } from "./file-type-icon";
import { OwnerMultiSelect } from "./owner-multi-select";

type ImportFolderSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryId: string;
  parentNodeId: string | null;
};

type ProgressState = {
  phase: "idle" | "folders" | "uploading" | "registering" | "done";
  detail: string;
  current: number;
  total: number;
};

type ImportSummary = {
  foldersCreated: number;
  foldersReused: number;
  filesCreated: number;
  filesSkipped: number;
  failures: string[];
};

const idleProgress: ProgressState = {
  phase: "idle",
  detail: "",
  current: 0,
  total: 0,
};

export function ImportFolderSheet({
  open,
  onOpenChange,
  repositoryId,
  parentNodeId,
}: ImportFolderSheetProps) {
  const defaultOwnerId = useSessionProfileUserId() ?? "";
  const invalidateDocuments = useInvalidateDocumentQueries(repositoryId);
  const usersQuery = useUsersQuery({ page: 1, pageSize: 100 });
  const isAuth0Mode =
    loadPublicEnv().VITE_SECURITY_PROVIDER === "auth0-openfga";
  const orgQuery = useCurrentOrganisationQuery(isAuth0Mode);
  const directorySupported = useMemo(() => supportsDirectoryPicker(), []);

  const [selection, setSelection] = useState<ImportSelectionStats | null>(
    null
  );
  const [purpose, setPurpose] = useState<DocumentPurpose>("Document");
  const [modules, setModules] = useState<DocumentApplicableModule[]>([]);
  const [complianceTools, setComplianceTools] = useState<
    DocumentComplianceTool[]
  >([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [reviewDate, setReviewDate] = useState("");
  const [requireAuthorisation, setRequireAuthorisation] = useState(false);
  const [authoriserId, setAuthoriserId] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(idleProgress);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  const complianceSelected = modules.includes("compliancecontrols");

  const complianceStandardOptions = useMemo(() => {
    const toolkitNames = isAuth0Mode
      ? (orgQuery.data?.licences.complianceTools ?? []).filter(
          (name): name is string => isComplianceToolkitName(name)
        )
      : [...COMPLIANCE_TOOLKIT_NAMES];

    const fromToolkits = toolkitNames
      .map((name) => COMPLIANCE_TOOLKIT_TO_DOCUMENT_TOOL[name])
      .filter((code): code is DocumentComplianceTool => Boolean(code));

    const merged = [...new Set([...fromToolkits, ...complianceTools])];
    return merged.length > 0
      ? merged
      : (Object.keys(DOCUMENT_COMPLIANCE_TOOL_LABELS) as DocumentComplianceTool[]);
  }, [
    isAuth0Mode,
    orgQuery.data?.licences.complianceTools,
    complianceTools,
  ]);

  const userOptions = useMemo(
    () =>
      (usersQuery.data?.items ?? []).map((row) => ({
        id: row.user.id,
        label: row.user.name?.trim() || row.user.email,
        email: row.user.email,
      })),
    [usersQuery.data]
  );

  useEffect(() => {
    if (!open || !defaultOwnerId) return;
    setOwners((current) =>
      current.length === 0 || (current.length === 1 && !current[0])
        ? [defaultOwnerId]
        : current
    );
  }, [open, defaultOwnerId]);

  function reset() {
    cancelledRef.current = true;
    setSelection(null);
    setPurpose("Document");
    setModules([]);
    setComplianceTools([]);
    setOwners(defaultOwnerId ? [defaultOwnerId] : []);
    setReviewDate("");
    setRequireAuthorisation(false);
    setAuthoriserId("");
    setFormError(undefined);
    setImporting(false);
    setProgress(idleProgress);
    setSummary(null);
    if (dirInputRef.current) dirInputRef.current.value = "";
  }

  function onDirectoryChosen(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next = buildImportSelection(list);
    setSelection(next);
    setSummary(null);
    setFormError(undefined);
  }

  function clearSelection() {
    setSelection(null);
    setSummary(null);
    setFormError(undefined);
    if (dirInputRef.current) dirInputRef.current.value = "";
  }

  function removeFile(relativePath: string) {
    setSelection((current) => {
      if (!current) return current;
      const next = removeImportEntry(current, relativePath);
      return next.fileCount === 0 ? null : next;
    });
    setSummary(null);
    setFormError(undefined);
  }

  function toggleModule(module: DocumentApplicableModule) {
    setModules((current) => {
      const next = current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module];
      if (!next.includes("compliancecontrols")) {
        setComplianceTools([]);
      }
      return next;
    });
  }

  function toggleComplianceTool(tool: DocumentComplianceTool) {
    setComplianceTools((current) =>
      current.includes(tool)
        ? current.filter((item) => item !== tool)
        : [...current, tool]
    );
  }

  async function handleSubmit() {
    if (!selection) {
      setFormError("Select a folder to import");
      return;
    }

    const parsed = uploadDocumentFormSchema.safeParse({
      purpose,
      applicableModules: modules,
      complianceTools: complianceSelected ? complianceTools : [],
      owners: owners.length > 0 ? owners : [defaultOwnerId],
      reviewDate: reviewDate.trim() ? reviewDate : null,
      requireAuthorisation,
      authoriserId,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message);
      return;
    }

    const reviewIso =
      parsed.data.reviewDate && parsed.data.reviewDate.trim()
        ? fromDateInputValue(parsed.data.reviewDate)
        : null;
    if (parsed.data.reviewDate?.trim() && !reviewIso) {
      setFormError("Select a valid review date");
      return;
    }

    let parentPathLength = 0;
    if (parentNodeId) {
      try {
        const path = await getNodePath(repositoryId, parentNodeId);
        parentPathLength = path.length;
      } catch {
        setFormError("Unable to resolve the current folder path");
        return;
      }
    }

    const issue = validateImportSelection(selection, parentPathLength);
    if (issue) {
      setFormError(issue.message);
      return;
    }

    cancelledRef.current = false;
    setImporting(true);
    setSummary(null);

    const foldersCreated = { count: 0 };
    const foldersReused = { count: 0 };
    const failures: string[] = [];
    let filesCreated = 0;
    let filesSkipped = 0;

    /** Map "Policies/HR" → folder node id */
    const pathToId = new Map<string, string>();

    try {
      setProgress({
        phase: "folders",
        detail: "Creating folders…",
        current: 0,
        total: selection.folderPaths.length,
      });

      for (let i = 0; i < selection.folderPaths.length; i += 1) {
        if (cancelledRef.current) break;
        const folderPath = selection.folderPaths[i]!;
        const segments = folderPath.split("/");
        const name = segments[segments.length - 1]!;
        const parentKey = segments.slice(0, -1).join("/");
        const ensureParentId =
          parentKey === ""
            ? parentNodeId
            : (pathToId.get(parentKey) ?? null);

        if (parentKey !== "" && !pathToId.has(parentKey)) {
          failures.push(`Skipped folder "${folderPath}" (parent missing)`);
          continue;
        }

        setProgress({
          phase: "folders",
          detail: `Ensuring folder ${i + 1}/${selection.folderPaths.length}…`,
          current: i + 1,
          total: selection.folderPaths.length,
        });

        try {
          const result = await ensureFolderNode(repositoryId, {
            name,
            parentNodeId: ensureParentId,
          });
          pathToId.set(folderPath, result.node.id);
          if (result.created) foldersCreated.count += 1;
          else foldersReused.count += 1;
        } catch (error) {
          const message = isApiClientError(error)
            ? error.message
            : `Unable to create folder "${folderPath}"`;
          failures.push(message);
          // Mark path as failed so descendants are skipped.
        }
      }

      // Drop entries whose folder path failed to resolve.
      const readyEntries: ImportFileEntry[] = [];
      for (const entry of selection.entries) {
        const folderKey = entry.folderSegments.join("/");
        if (folderKey === "") {
          // Unexpected for directory picker; place under current parent.
          readyEntries.push(entry);
          continue;
        }
        if (!pathToId.has(folderKey)) {
          failures.push(`Skipped file "${entry.relativePath}" (folder missing)`);
          continue;
        }
        readyEntries.push(entry);
      }

      // Deduplicate basenames within the same parent (first wins).
      const seenInParent = new Set<string>();
      const uniqueEntries: ImportFileEntry[] = [];
      for (const entry of readyEntries) {
        const folderKey = entry.folderSegments.join("/");
        const dedupeKey = `${folderKey}\0${entry.basename.toLowerCase()}`;
        if (seenInParent.has(dedupeKey)) {
          filesSkipped += 1;
          failures.push(
            `Skipped duplicate in selection: "${entry.relativePath}"`
          );
          continue;
        }
        seenInParent.add(dedupeKey);
        uniqueEntries.push(entry);
      }

      type Prepared = {
        parentId: string | null;
        storageInfo: Awaited<ReturnType<typeof uploadFileViaHandler>>;
        size: number;
        basename: string;
      };
      const prepared: Prepared[] = [];

      setProgress({
        phase: "uploading",
        detail: "Uploading files…",
        current: 0,
        total: uniqueEntries.length,
      });

      for (let i = 0; i < uniqueEntries.length; i += 1) {
        if (cancelledRef.current) break;
        const entry = uniqueEntries[i]!;
        const folderKey = entry.folderSegments.join("/");
        const parentId =
          folderKey === "" ? parentNodeId : (pathToId.get(folderKey) ?? null);

        setProgress({
          phase: "uploading",
          detail: `Uploading ${i + 1}/${uniqueEntries.length}…`,
          current: i + 1,
          total: uniqueEntries.length,
        });

        try {
          const storageInfo = await uploadFileViaHandler(
            entry.file,
            "general"
          );
          prepared.push({
            parentId,
            storageInfo: { ...storageInfo, Name: entry.basename },
            size: entry.file.size,
            basename: entry.basename,
          });
        } catch (error) {
          const message = isApiClientError(error)
            ? error.message
            : `Upload failed for "${entry.relativePath}"`;
          failures.push(message);
        }
      }

      // Group by parent for createFileNodes batches.
      const byParent = new Map<string, Prepared[]>();
      for (const item of prepared) {
        const key = item.parentId ?? "";
        const list = byParent.get(key) ?? [];
        list.push(item);
        byParent.set(key, list);
      }

      setProgress({
        phase: "registering",
        detail: "Registering documents…",
        current: 0,
        total: prepared.length,
      });

      let registered = 0;
      for (const [parentKey, items] of byParent) {
        if (cancelledRef.current) break;
        const parentId = parentKey === "" ? null : parentKey;
        for (let offset = 0; offset < items.length; offset += IMPORT_FILE_BATCH_SIZE) {
          if (cancelledRef.current) break;
          const chunk = items.slice(offset, offset + IMPORT_FILE_BATCH_SIZE);
          try {
            const result = await createFileNodes(repositoryId, {
              parentNodeId: parentId,
              data: chunk.map((item) => ({
                storageInfo: { ...item.storageInfo, Size: item.size },
                purpose: parsed.data.purpose,
                applicableModules: parsed.data.applicableModules,
                complianceTools: parsed.data.complianceTools,
                owners: parsed.data.owners,
                reviewDate: reviewIso,
                authorisation: parsed.data.requireAuthorisation
                  ? [parsed.data.authoriserId]
                  : [],
              })),
            });
            filesCreated += result.created.length;
            filesSkipped += result.skipped.length;
          } catch (error) {
            const message = isApiClientError(error)
              ? error.message
              : "Unable to register documents";
            failures.push(message);
          }
          registered += chunk.length;
          setProgress({
            phase: "registering",
            detail: `Registering documents ${Math.min(registered, prepared.length)}/${prepared.length}…`,
            current: Math.min(registered, prepared.length),
            total: prepared.length,
          });
        }
      }

      const finalSummary: ImportSummary = {
        foldersCreated: foldersCreated.count,
        foldersReused: foldersReused.count,
        filesCreated,
        filesSkipped,
        failures,
      };
      setSummary(finalSummary);
      setProgress({
        phase: "done",
        detail: cancelledRef.current ? "Import cancelled" : "Import complete",
        current: 1,
        total: 1,
      });

      await invalidateDocuments();

      if (filesCreated > 0) {
        signalSetupEvent("docs.document.created");
      }

      if (cancelledRef.current) {
        notify.error("Import stopped — partial results were kept");
      } else if (failures.length === 0 && filesSkipped === 0) {
        notify.success(
          `Imported ${filesCreated} file${filesCreated === 1 ? "" : "s"} (${foldersCreated.count} folder${foldersCreated.count === 1 ? "" : "s"} created)`
        );
      } else if (filesCreated > 0 || foldersCreated.count > 0) {
        notify.success(
          `Import finished with ${filesCreated} created, ${filesSkipped} skipped${failures.length ? `, ${failures.length} issue(s)` : ""}`
        );
      } else if (failures.length > 0) {
        notify.error("Import finished with errors — see summary");
      } else {
        notify.success("Nothing new to import (all names already existed)");
      }
    } catch (error) {
      notify.fromError(error, "Unable to import folder");
    } finally {
      setImporting(false);
    }
  }

  const pending = importing;

  return (
    <AppSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (importing) {
            cancelledRef.current = true;
          }
          reset();
        }
        onOpenChange(next);
      }}
      title="Import folder"
      description="Import a local folder tree into this location. Existing folder names are merged; duplicate file names are skipped."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (importing) cancelledRef.current = true;
              onOpenChange(false);
            }}
            disabled={false}
          >
            {importing ? "Stop & close" : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              pending ||
              !directorySupported ||
              !selection ||
              selection.fileCount === 0
            }
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FolderInput className="size-3.5" />
            )}
            Import
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!directorySupported ? (
          <p className="rounded-md border border-border-subtle bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Your browser does not support folder selection. Use Chrome, Edge, or
            Safari, or upload files individually instead.
          </p>
        ) : null}

        <FormField
          label="Folder"
          htmlFor="import-folder-input"
          required
          error={
            formError &&
            !formError.toLowerCase().includes("authoris") &&
            !formError.toLowerCase().includes("compliance standard")
              ? formError
              : undefined
          }
          description="Select a folder on your computer. Nested folders and files are preserved under this location."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={(el) => {
                dirInputRef.current = el;
                if (el) {
                  el.setAttribute("webkitdirectory", "");
                  el.setAttribute("directory", "");
                  el.setAttribute("multiple", "");
                }
              }}
              id="import-folder-input"
              type="file"
              disabled={pending || !directorySupported}
              className="max-w-full"
              multiple
              onChange={(event) => onDirectoryChosen(event.target.files)}
            />
            {selection ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={clearSelection}
              >
                <X className="size-3.5" />
                Clear
              </Button>
            ) : null}
          </div>
        </FormField>

        {selection ? (
          <div className="space-y-2 rounded-md border border-border-subtle bg-muted/20 px-3 py-2.5 text-[0.8125rem]">
            <p className="font-medium text-foreground">
              {selection.folderCount} folder
              {selection.folderCount === 1 ? "" : "s"}, {selection.fileCount}{" "}
              file{selection.fileCount === 1 ? "" : "s"} (
              {formatBytes(selection.totalBytes)})
            </p>
            {selection.skippedHidden > 0 ? (
              <p className="text-muted-foreground">
                Skipped {selection.skippedHidden} hidden file
                {selection.skippedHidden === 1 ? "" : "s"}.
              </p>
            ) : null}
            <ul className="max-h-52 space-y-1 overflow-y-auto text-muted-foreground">
              {selection.entries.map((entry) => (
                <li
                  key={entry.relativePath}
                  className="flex items-center gap-2 rounded-sm pr-0.5 hover:bg-muted/40"
                  title={entry.relativePath}
                >
                  <FileTypeIcon
                    type="document"
                    fileName={entry.basename}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {entry.relativePath}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label={`Remove ${entry.basename}`}
                    title="Remove"
                    disabled={pending}
                    onClick={() => removeFile(entry.relativePath)}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {progress.phase !== "idle" ? (
          <div className="space-y-1 rounded-md border border-border-subtle px-3 py-2.5 text-[0.8125rem]">
            <p className="font-medium text-foreground">{progress.detail}</p>
            {progress.total > 0 && progress.phase !== "done" ? (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((progress.current / progress.total) * 100)
                    )}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {summary ? (
          <div className="space-y-1 rounded-md border border-border-subtle px-3 py-2.5 text-[0.8125rem] text-muted-foreground">
            <p>
              Folders: {summary.foldersCreated} created,{" "}
              {summary.foldersReused} reused
            </p>
            <p>
              Files: {summary.filesCreated} created, {summary.filesSkipped}{" "}
              skipped
            </p>
            {summary.failures.length > 0 ? (
              <ul className="max-h-28 list-disc space-y-0.5 overflow-y-auto pl-4 text-destructive">
                {summary.failures.slice(0, 20).map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {summary.failures.length > 20 ? (
                  <li>and {summary.failures.length - 20} more…</li>
                ) : null}
              </ul>
            ) : null}
          </div>
        ) : null}

        <FormField label="Purpose" htmlFor="import-purpose" required>
          <select
            id="import-purpose"
            className="ims-select"
            value={purpose}
            disabled={pending}
            onChange={(event) =>
              setPurpose(event.target.value as DocumentPurpose)
            }
          >
            {DOCUMENT_PURPOSES.map((value) => (
              <option key={value} value={value}>
                {DOCUMENT_PURPOSE_LABELS[value]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Applicable modules"
          description="Applied to every imported document."
        >
          <div className="flex flex-wrap gap-1.5">
            {DOCUMENT_APPLICABLE_MODULES.map((module) => {
              const selected = modules.includes(module);
              return (
                <button
                  key={module}
                  type="button"
                  disabled={pending}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
                    selected
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border-subtle text-muted-foreground hover:bg-muted/40"
                  )}
                  onClick={() => {
                    toggleModule(module);
                    setFormError(undefined);
                  }}
                >
                  {DOCUMENT_APPLICABLE_MODULE_LABELS[module]}
                </button>
              );
            })}
          </div>
        </FormField>

        {complianceSelected ? (
          <FormField
            label="Compliance standard"
            description="Choose the standard(s) these documents apply to."
            required
            error={
              formError?.toLowerCase().includes("compliance standard")
                ? formError
                : undefined
            }
          >
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border-subtle p-2">
              {complianceStandardOptions.map((tool) => {
                const selected = complianceTools.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    disabled={pending}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium transition-colors",
                      selected
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border-subtle text-muted-foreground hover:bg-muted/40"
                    )}
                    onClick={() => {
                      toggleComplianceTool(tool);
                      setFormError(undefined);
                    }}
                  >
                    {DOCUMENT_COMPLIANCE_TOOL_LABELS[tool] ??
                      toolkitDisplayLabel(tool)}
                  </button>
                );
              })}
            </div>
          </FormField>
        ) : null}

        <FormField label="Select owner(s)" required>
          <OwnerMultiSelect
            options={userOptions}
            value={owners}
            onChange={setOwners}
            loading={usersQuery.isLoading}
            max={5}
          />
        </FormField>

        <FormField label="Document review date" htmlFor="import-review-date">
          <Input
            id="import-review-date"
            type="date"
            value={reviewDate}
            disabled={pending}
            onChange={(event) => setReviewDate(event.target.value)}
          />
        </FormField>

        <div className="space-y-3 rounded-md border border-border-subtle px-3 py-2.5">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-3.5 accent-primary"
              checked={requireAuthorisation}
              disabled={pending}
              onChange={(event) => {
                const checked = event.target.checked;
                setRequireAuthorisation(checked);
                if (!checked) setAuthoriserId("");
                setFormError(undefined);
              }}
            />
            <span>
              <span className="block font-medium">Require authorisation</span>
              <span className="mt-0.5 block text-[0.75rem] text-muted-foreground">
                All imported documents stay pending until approved.
              </span>
            </span>
          </label>

          {requireAuthorisation ? (
            <FormField
              label="Send authorisation to"
              htmlFor="import-authoriser"
              required
              error={
                formError?.toLowerCase().includes("authoris")
                  ? formError
                  : undefined
              }
            >
              <select
                id="import-authoriser"
                className="ims-select"
                value={authoriserId}
                disabled={usersQuery.isLoading || pending}
                onChange={(event) => {
                  setAuthoriserId(event.target.value);
                  setFormError(undefined);
                }}
              >
                <option value="">
                  {usersQuery.isLoading
                    ? "Loading users…"
                    : "Select a user…"}
                </option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                    {user.email && user.email !== user.label
                      ? ` (${user.email})`
                      : ""}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
        </div>
      </div>
    </AppSheet>
  );
}
