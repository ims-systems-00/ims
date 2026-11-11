import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  ExternalLink,
  Loader2,
  Palette,
  Send,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { isApiClientError } from "@/shared/lib/http/errors";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useFormElementsQuery,
  useFormQuery,
  useUpdateFormMutation,
} from "../hooks/use-forms";
import {
  FormBuilderProvider,
  useFormBuilder,
} from "../build-form/form-builder-context";
import { FormBrandPanel } from "../components/form-brand-panel";

function formShareUrl(formId: string): string {
  return `${window.location.origin}/documents/forms/${formId}/submission`;
}

const TABS = [
  { to: "build-form", label: "Build Form" },
  { to: "settings", label: "Settings" },
  { to: "analysis", label: "Analysis" },
  { to: "response", label: "Response" },
] as const;

function BuilderChrome() {
  const { formId = "" } = useParams();
  const navigate = useNavigate();
  const formQuery = useFormQuery(formId);
  const updateMutation = useUpdateFormMutation(formId);
  const { preview, setPreview, brandOpen, setBrandOpen } = useFormBuilder();
  const form = formQuery.data;
  const [copied, setCopied] = useState(false);
  const isPublished = form?.status === "published";

  async function publish() {
    try {
      await updateMutation.mutateAsync({ status: "published" });
      notify.success("Form published — share link is ready");
    } catch (error) {
      notify.error(
        isApiClientError(error) ? error.message : "Could not publish form"
      );
    }
  }

  async function copyShareLink() {
    if (!isPublished) {
      notify.error("Publish the form before sharing the link");
      return;
    }
    try {
      await navigator.clipboard.writeText(formShareUrl(formId));
      setCopied(true);
      notify.success("Share link copied — org members can open and submit");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error("Could not copy share link");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/documents/forms")}
        >
          <ArrowLeft className="size-4" />
          Forms
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold">
              {form?.title ?? "Form"}
            </h1>
            {form ? (
              <StatusBadge
                tone={
                  form.status === "published"
                    ? "success"
                    : form.status === "archived"
                      ? "neutral"
                      : "warning"
                }
              >
                {form.status}
              </StatusBadge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={brandOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setBrandOpen(true)}
          >
            <Palette className="size-4" />
            Brand
          </Button>
          <Button
            type="button"
            variant={preview ? "default" : "outline"}
            size="sm"
            onClick={() => setPreview(!preview)}
          >
            <Eye className="size-4" />
            {preview ? "Editing" : "Preview"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={updateMutation.isPending || isPublished}
            onClick={() => void publish()}
          >
            {updateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Publish
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!isPublished}
            onClick={() => void copyShareLink()}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy share link"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!isPublished}
            onClick={() => navigate(`/documents/forms/${formId}/submission`)}
          >
            <ExternalLink className="size-4" />
            Open fill page
          </Button>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border-subtle">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={`/documents/forms/${formId}/${tab.to}`}
            className={({ isActive }) =>
              cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />

      {form ? (
        <Sheet open={brandOpen} onOpenChange={setBrandOpen}>
          <SheetContent
            side="right"
            className="flex flex-col overflow-hidden p-0 sm:w-[min(100%,36rem)] md:w-[min(100%,40rem)] lg:w-[min(100%,44rem)]"
          >
            <SheetHeader>
              <SheetTitle>Brand</SheetTitle>
              <SheetDescription>
                Theme colors and company visuals for this form.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FormBrandPanel formId={formId} form={form} compact />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

export function FormBuilderLayout() {
  const { formId = "" } = useParams();
  const formQuery = useFormQuery(formId);
  const elementsQuery = useFormElementsQuery(formId);

  if (formQuery.isLoading || elementsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading form…
      </div>
    );
  }

  if (formQuery.isError || !formQuery.data) {
    return (
      <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
        Form not found, or you do not have access in this organisation.
      </div>
    );
  }

  return (
    <FormBuilderProvider
      formId={formId}
      form={formQuery.data}
      elements={elementsQuery.data ?? []}
    >
      <BuilderChrome />
    </FormBuilderProvider>
  );
}
