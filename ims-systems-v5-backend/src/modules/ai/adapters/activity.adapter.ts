/**
 * AI → Activities: automated timeline on the parent record when analysis
 * is saved or deleted (V4 AI_ANALYSIS_CONDUCTED / AI_ANALYSIS_DELETED).
 */

import type { ActivitiesApplicationPort } from "../../activities";
import type { AiActivityPort } from "../ports";

const ANALYSIS_ICON = "/images/system/notification/analysis.png";
const EXTRA_ICON = "/images/system/notification/sent.png";

function formatConductedOn(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function createAiActivityAdapter(
  activities: ActivitiesApplicationPort
): AiActivityPort {
  return {
    async recordAnalysisSaved(input) {
      await activities.recordAutomated(input.organizationId, {
        moduleType: input.moduleType,
        moduleId: input.moduleId,
        value: `${input.actorName} conducted and saved an analysis.`,
        createdBy: input.actorId,
        iconSrc: ANALYSIS_ICON,
        extraLogs: [],
      });
    },

    async recordAnalysisDeleted(input) {
      await activities.recordAutomated(input.organizationId, {
        moduleType: input.moduleType,
        moduleId: input.moduleId,
        value: `${input.actorName} deleted an analysis.`,
        createdBy: input.actorId,
        iconSrc: ANALYSIS_ICON,
        extraLogs: input.extraLogs ?? [
          {
            title: "More information",
            description: `This analysis was conducted  by ${
              input.originalConductorName
            } on ${formatConductedOn(input.conductedOn)}`,
            icon: EXTRA_ICON,
            image: EXTRA_ICON,
          },
        ],
      });
    },
  };
}
