import "./ims-intro.css";
import introSource from "./ims-intro.js?raw";

/**
 * Plays the iMS OS intro from the animation pack (the same script and styles
 * the assets/index.html demo loads) once after a successful sign-in.
 *
 * The overlay is attached to <html>, so the signed-in app can render
 * underneath and be revealed by the zoom-through. Refresh does not replay it:
 * this only runs from the login submit path. Reduced-motion users skip it.
 */
export function playPostLoginIntro(): void {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (document.getElementById("imsi")) return;

  // The script no-ops unless this class is set (same contract as the head guard).
  document.documentElement.classList.add("ims-intro");
  try {
    // Classic-script globals (addEventListener, innerWidth, …) resolve on window.
    const run = new Function(introSource);
    run();
  } catch {
    document.documentElement.classList.remove("ims-intro");
    return;
  }

  if (!document.getElementById("imsi")) {
    document.documentElement.classList.remove("ims-intro");
  }
}
