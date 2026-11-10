/**
 * Compatibility barrel — timeline should prefer ActivityComposer + ActivityContentView
 * so TipTap is never imported on the Activity tab critical path.
 */
export { ActivityComposer as ActivityRichTextEditor } from "./activity-composer";
export { ActivityContentView as ActivityRichTextView } from "./activity-content-view";
export { isActivityValueEmpty } from "../lib/activity-html";
