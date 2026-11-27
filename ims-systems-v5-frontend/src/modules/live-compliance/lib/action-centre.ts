import { create } from "zustand";
import { loadPublicEnv } from "@/shared/lib/env";
import { useCurrentOrganisationQuery } from "@/modules/organisation/hooks/use-organisations";
import { LIVE_MODULE_NAMES, LIVE_STANDARDS, type ActionBucket, type ActionCentreItem } from "../types";
import { formatDay } from "./health";

export const ACTION_BUCKET_LABELS: Record<ActionBucket, string> = {
  now: "Overdue",
  week: "Due this week",
  later: "Coming up",
};

/** "Training · ISO 7.2 · Due 29 Nov 2026" */
export function actionMeta(item: ActionCentreItem): string {
  return [
    LIVE_MODULE_NAMES[item.module],
    item.clause ? `ISO ${item.clause}` : null,
    item.due ? `${item.bucket === "now" ? "Was due" : "Due"} ${formatDay(item.due)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Shared open state so the sign-in summary can open the navbar panel. */
export const useActionCentreStore = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

/** Live compliance is available when an ISO 9001/14001/45001 toolkit is licensed. */
export function useLiveComplianceEnabled(): boolean {
  const provider = loadPublicEnv().VITE_SECURITY_PROVIDER;
  const licenceGated = provider === "auth0-openfga";
  const orgQuery = useCurrentOrganisationQuery(licenceGated);
  const tools = orgQuery.data?.licences.complianceTools ?? [];
  return (
    !licenceGated ||
    tools.some((name) => (LIVE_STANDARDS as readonly string[]).includes(name))
  );
}
