import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { notify } from "@/shared/lib/toast";
import { useSessionProfileUserId } from "@/security";
import { useDocumentsUiStore } from "@/modules/document-management/store/use-documents-ui-store";
import { getSetupStep } from "../catalog";
import {
  ensureSetupAudit,
  ensureSetupControl,
  ensureSetupDocument,
  ensureSetupRepository,
  ensureSetupRepositoryCreate,
  ensureSetupRisk,
} from "../lib/seed-record";
import { useSetupGuideStore } from "../store";

/**
 * Seed-then-spotlight: when the active sub declares `seed`, ensure a real
 * module record exists and navigate to it before the spotlight measures.
 */
export function useSetupSeed() {
  const navigate = useNavigate();
  const ownerId = useSessionProfileUserId() ?? "";
  const activeStepId = useSetupGuideStore((s) => s.activeStepId);
  const subIndex = useSetupGuideStore((s) => s.subIndex);
  const aliceAssistOpen = useSetupGuideStore((s) => s.aliceAssistOpen);
  const setLastDocumentContext = useSetupGuideStore(
    (s) => s.setLastDocumentContext
  );
  const setLastControlContext = useSetupGuideStore(
    (s) => s.setLastControlContext
  );
  const setLastRiskContext = useSetupGuideStore((s) => s.setLastRiskContext);
  const setLastAuditContext = useSetupGuideStore((s) => s.setLastAuditContext);
  const setLastRepositoryContext = useSetupGuideStore(
    (s) => s.setLastRepositoryContext
  );
  const setSeedPending = useSetupGuideStore((s) => s.setSeedPending);

  const runKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeStepId || aliceAssistOpen) {
      setSeedPending(false);
      return;
    }
    const step = getSetupStep(activeStepId);
    const sub = step?.guide.subs[subIndex];
    if (!sub?.seed) {
      setSeedPending(false);
      runKeyRef.current = null;
      return;
    }

    const runKey = `${activeStepId}:${subIndex}:${sub.seed}:${sub.seedTab ?? ""}`;
    if (runKeyRef.current === runKey) return;
    runKeyRef.current = runKey;

    let cancelled = false;
    setSeedPending(true);

    void (async () => {
      try {
        const state = useSetupGuideStore.getState();
        if (sub.seed === "document") {
          const seeded = await ensureSetupDocument({
            ownerId,
            preferred: state.lastDocumentContext,
            tab: sub.seedTab,
          });
          if (cancelled) return;
          setLastDocumentContext({
            repositoryId: seeded.repositoryId,
            nodeId: seeded.nodeId,
          });
          setLastRepositoryContext({ repositoryId: seeded.repositoryId });
          navigate(seeded.path);
          return;
        }

        if (sub.seed === "control") {
          const seeded = await ensureSetupControl({
            preferred: state.lastControlContext,
          });
          if (cancelled) return;
          setLastControlContext({
            toolkitName: seeded.toolkitName,
            controlId: seeded.controlId,
          });
          navigate(seeded.path);
          return;
        }

        if (sub.seed === "risk") {
          const seeded = await ensureSetupRisk({
            ownerId,
            preferred: state.lastRiskContext,
          });
          if (cancelled) return;
          setLastRiskContext({ riskId: seeded.riskId });
          navigate(seeded.path);
          return;
        }

        if (sub.seed === "audit") {
          const seeded = await ensureSetupAudit({
            auditorId: ownerId,
            preferred: state.lastAuditContext,
          });
          if (cancelled) return;
          setLastAuditContext({ auditId: seeded.auditId });
          navigate(seeded.path);
          return;
        }

        if (sub.seed === "repository-create") {
          const seeded = ensureSetupRepositoryCreate();
          if (cancelled) return;
          // Open the sheet via UI store as well as the URL — more reliable when
          // already on Documents (search-param-only navigations can be no-ops).
          useDocumentsUiStore.getState().setTab("repositories");
          useDocumentsUiStore.getState().setCreateRepoOpen(true);
          navigate(seeded.path);
          return;
        }

        if (sub.seed === "repository") {
          const preferred =
            state.lastRepositoryContext ??
            (state.lastDocumentContext
              ? { repositoryId: state.lastDocumentContext.repositoryId }
              : null);
          const seeded = await ensureSetupRepository({
            ownerId,
            preferred,
          });
          if (cancelled) return;
          setLastRepositoryContext({ repositoryId: seeded.repositoryId });
          useDocumentsUiStore.getState().setCreateRepoOpen(false);
          navigate(seeded.path);
        }
      } catch (error) {
        if (cancelled) return;
        notify.fromError(
          error,
          "Setup Guide could not open a record to highlight the next step."
        );
      } finally {
        if (!cancelled) setSeedPending(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeStepId,
    subIndex,
    aliceAssistOpen,
    ownerId,
    navigate,
    setLastDocumentContext,
    setLastControlContext,
    setLastRiskContext,
    setLastAuditContext,
    setLastRepositoryContext,
    setSeedPending,
  ]);
}
