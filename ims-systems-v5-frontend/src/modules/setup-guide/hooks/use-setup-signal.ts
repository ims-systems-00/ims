import { useEffect } from "react";
import { signalSetupEvent } from "../store";

/**
 * Tell the Setup Guide that a user action has happened — typically that a
 * sheet or dialog is now open: `useSetupSignal("org.fu.create-opened", open)`.
 *
 * For one-shot outcomes (a record was saved) call `signalSetupEvent` from the
 * handler instead.
 */
export function useSetupSignal(eventName: string, when: boolean) {
  useEffect(() => {
    if (!when) return;
    signalSetupEvent(eventName);
  }, [eventName, when]);
}

/** @deprecated Prefer `useSetupSignal`. */
export function useTourAction(eventName: string, when: boolean) {
  useSetupSignal(eventName, when);
}
