/**
 * Setup Guide — interactive get-set-up model (setupux-inspired).
 *
 * Flat checklist of module steps. An active step shows a coach panel + spotlight
 * on the real screen; Alice-capable steps can open an assist sheet that creates
 * real records after the user confirms.
 */

import type { InvitationRole } from "@/modules/invitations/types";

export type SetupStepStatus = "available" | "coming_soon";

export type SetupSubStep = {
  /** Coach line shown in the guide panel. */
  label: string;
  /** Optional `[data-tour=…]` selector to spotlight. */
  target?: string;
  /** Short label drawn under/above the spotlight. */
  spotLabel?: string;
  /** When true, place the spot label above the control. */
  spotLabelAbove?: boolean;
  /**
   * Optional path to put the app in before highlighting this sub-step
   * (e.g. `/functional-units?create=1`).
   */
  route?: string;
  /** Advance the coach when this event is signalled. */
  advanceOn?: string;
};

export type SetupStepDefinition = {
  id: string;
  title: string;
  summary: string;
  estimate: string;
  aliceCapable: boolean;
  status: SetupStepStatus;
  /** Permission needed to run the step (checklist gating). */
  requiredPermission?: string;
  /** Primary route when the user Continues. */
  route: string;
  guide: {
    text: string;
    subs: SetupSubStep[];
  };
  /** Domain event that marks the step complete (e.g. `org.fu.created`). */
  completeOn?: string;
};

/**
 * Draft used by Alice org assist — Internal business function.
 * Mandatory: name, accessType, responsibility, operatingLocation.
 */
export type AliceDraftUnit = {
  id: string;
  name: string;
  operatingLocation: string;
  accessType: "Internal business function";
  responsibility: string;
};

/**
 * Draft invitation — mandatory: email, role.
 */
export type AliceDraftInvite = {
  id: string;
  email: string;
  role: InvitationRole;
};

/**
 * Draft premise — mandatory: name, location, address, and a unit to link.
 * `unitDraftId` is resolved to a real FU id after units are created.
 */
export type AliceDraftPremise = {
  id: string;
  name: string;
  location: string;
  address: string;
  unitDraftId: string;
};
