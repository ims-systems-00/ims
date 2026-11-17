import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/status-badge";
import { notify } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import {
  useConfirmSmeLicenceMutation,
  useSmeLicenceCheckoutMutation,
} from "../hooks/use-organisations";
import {
  organisationHasSmeLicence,
  normalizeOrganisationLicences,
  type OrganisationProfile,
} from "../types";

type OrganisationSmeLicenceCardProps = {
  organisation: OrganisationProfile;
  className?: string;
};

/**
 * Simple SME licence confirmation panel. Activates via Stripe Checkout and
 * confirms the session on return so local/dev works without webhooks.
 */
export function OrganisationSmeLicenceCard({
  organisation,
  className,
}: OrganisationSmeLicenceCardProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const smeCheckout = useSmeLicenceCheckoutMutation();
  const smeConfirm = useConfirmSmeLicenceMutation();
  const [openingSme, setOpeningSme] = useState(false);
  const confirmingRef = useRef(false);

  const licences = normalizeOrganisationLicences(organisation.licences);
  const hasSme = organisationHasSmeLicence(licences);
  const canCheckout =
    organisation.isCustomer &&
    (organisation.membership?.role === "Super Admin" ||
      organisation.membership?.role === "Head of Service");

  useEffect(() => {
    function clearCheckoutUiState() {
      setOpeningSme(false);
      smeCheckout.reset();
    }
    clearCheckoutUiState();
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) clearCheckoutUiState();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / bfcache only
  }, []);

  const smeCheckoutResult = searchParams.get("sme");
  const sessionId = searchParams.get("session_id") ?? undefined;

  useEffect(() => {
    if (smeCheckoutResult !== "success" && smeCheckoutResult !== "cancelled") {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete("sme");
    next.delete("session_id");
    setSearchParams(next, { replace: true });

    if (smeCheckoutResult === "cancelled") {
      notify.error("SME licence checkout was cancelled");
      return;
    }

    if (confirmingRef.current || hasSme) {
      if (hasSme) notify.success("SME licence is active");
      return;
    }

    confirmingRef.current = true;
    void (async () => {
      try {
        await smeConfirm.mutateAsync({
          organizationId: organisation.id,
          sessionId,
        });
        notify.success("SME licence activated");
      } catch (error) {
        notify.fromError(
          error,
          "Payment received, but SME licence could not be confirmed yet. Refresh in a moment or contact support."
        );
      } finally {
        confirmingRef.current = false;
      }
    })();
  }, [
    hasSme,
    organisation.id,
    searchParams,
    sessionId,
    setSearchParams,
    smeCheckoutResult,
    smeConfirm,
  ]);

  async function openSmeCheckout() {
    setOpeningSme(true);
    try {
      const session = await smeCheckout.mutateAsync(organisation.id);
      if (!session.url) {
        notify.error("Stripe checkout did not return a URL");
        setOpeningSme(false);
        return;
      }
      window.location.assign(session.url);
    } catch (error) {
      setOpeningSme(false);
      notify.fromError(error, "Unable to start SME licence checkout");
    }
  }

  if (hasSme) {
    return (
      <section className={cn("ims-panel flex flex-col", className)}>
        <div className="ims-panel-header">
          <h3 className="text-sm font-semibold tracking-tight">SME licence</h3>
          <StatusBadge tone="success">Active</StatusBadge>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-success/20 bg-success/10 text-success"
            >
              <BadgeCheck className="size-4.5" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                Licence confirmed
              </p>
              <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
                This organisation holds an active SME licence.
              </p>
            </div>
          </div>
          <dl className="space-y-2 border-t border-border-subtle pt-3">
            <div>
              <dt className="ims-detail-label">Organisation</dt>
              <dd className="ims-detail-value break-words">{organisation.name}</dd>
            </div>
            <div>
              <dt className="ims-detail-label">Reference</dt>
              <dd className="ims-detail-value break-all font-mono text-[0.75rem]">
                {organisation.reference}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("ims-panel flex flex-col", className)}>
      <div className="ims-panel-header">
        <h3 className="text-sm font-semibold tracking-tight">SME licence</h3>
        <StatusBadge tone="warning">Inactive</StatusBadge>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-4">
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          Activate an SME licence to confirm licensed access for this
          organisation.
        </p>
        {!organisation.isCustomer ? (
          <p className="text-[0.75rem] text-muted-foreground">
            Complete Go Live first, then activate the licence.
          </p>
        ) : canCheckout ? (
          <div>
            <Button
              type="button"
              size="sm"
              disabled={openingSme || smeConfirm.isPending}
              onClick={() => void openSmeCheckout()}
            >
              {openingSme ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Opening Stripe…
                </>
              ) : (
                "Activate SME licence"
              )}
            </Button>
          </div>
        ) : (
          <p className="text-[0.75rem] text-muted-foreground">
            Ask a Super Admin or Head of Service to activate the SME licence.
          </p>
        )}
      </div>
    </section>
  );
}
