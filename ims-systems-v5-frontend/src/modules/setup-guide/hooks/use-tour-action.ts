import { useEffect } from "react";
import { signalTourAction } from "../store";

/**
 * Tell the Setup Guide that a user action has happened — typically that a
 * sheet or dialog is now open: `useTourAction("org.fu.create-opened", open)`.
 *
 * Fires each time `when` turns true. It is a no-op unless a tour is running,
 * so modules can call it unconditionally. For one-off moments (a record was
 * saved) call `signalTourAction` from the handler instead.
 */
export function useTourAction(eventName: string, when: boolean) {
  useEffect(() => {
    if (!when) return;
    signalTourAction(eventName);
  }, [eventName, when]);
}
