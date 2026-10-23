import { useState } from "react";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { BookDemoForm } from "../components/book-demo-form";
import { GetStartedForm } from "../components/get-started-form";
import {
  useBookDateMutation,
  useBookedDatesQuery,
  useGetStartedMutation,
} from "../hooks/use-contact-ims";
import type { BookDateInput, GetStartedInput } from "../types";

type ContactTab = "book-demo" | "get-started";

const TABS: Array<{ key: ContactTab; label: string }> = [
  { key: "book-demo", label: "Book a demo" },
  { key: "get-started", label: "Get started" },
];

/**
 * Public Contact IMS page (`/contact`, no login).
 * Both forms email the iMS team; nothing is persisted.
 */
export function ContactImsPage() {
  const [tab, setTab] = useState<ContactTab>("book-demo");
  const bookedDatesQuery = useBookedDatesQuery();
  const bookDateMutation = useBookDateMutation();
  const getStartedMutation = useGetStartedMutation();

  async function handleBookDate(values: BookDateInput) {
    try {
      const result = await bookDateMutation.mutateAsync(values);
      notify.success(result.message);
    } catch (error) {
      notify.fromError(error, "Unable to submit your request");
    }
  }

  async function handleGetStarted(values: GetStartedInput) {
    try {
      const result = await getStartedMutation.mutateAsync(values);
      notify.success(result.message);
    } catch (error) {
      notify.fromError(error, "Unable to submit your request");
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-xl space-y-4 rounded-xl border border-border-subtle bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Contact iMS</h1>
          <p className="text-sm text-muted-foreground">
            Book a demo or tell us what you would like to get started with —
            we will reach out in due course.
          </p>
        </div>

        <div className="flex gap-1 border-b border-border-subtle" role="tablist">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "book-demo" ? (
          <BookDemoForm
            pending={bookDateMutation.isPending}
            bookedDates={bookedDatesQuery.data}
            onSubmit={handleBookDate}
          />
        ) : (
          <GetStartedForm
            pending={getStartedMutation.isPending}
            onSubmit={handleGetStarted}
          />
        )}
      </div>
    </div>
  );
}
