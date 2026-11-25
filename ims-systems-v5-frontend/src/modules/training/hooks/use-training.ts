import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgePolicy,
  addExternalPerson,
  addSessionAttachment,
  archiveCompetency,
  cancelSession,
  clearExemption,
  completeSession,
  createCompetency,
  createPerson,
  createRecord,
  createRole,
  createSession,
  getPerson,
  getPublicRsvpView,
  getPublicSelfView,
  getSession,
  getTrainingGaps,
  getTrainingLog,
  getTrainingMatrix,
  getTrainingOverview,
  getTrainingPlan,
  getTrainingReadiness,
  getTrainingSettings,
  inviteSession,
  issueSelfToken,
  listCompetencies,
  listPeople,
  listRecords,
  listRoles,
  listSessions,
  markLeaver,
  publicRsvp,
  publicSelfAcknowledge,
  publicSelfUpload,
  removeRole,
  removeSessionAttachment,
  setExemption,
  updateCompetency,
  updatePerson,
  updateRole,
  updateSession,
  updateTrainingSettings,
  verifyRecord,
  type SessionAttachmentInput,
} from "../api/training";
import type {
  CreateCompetencyInput,
  CreateExternalPersonInput,
  CreatePersonInput,
  CreateRecordInput,
  CreateRoleInput,
  CreateSessionInput,
  ListPeopleParams,
  SessionOutcome,
  TrainingRsvpStatus,
  UpdateCompetencyInput,
  UpdatePersonInput,
  UpdateRoleInput,
  UpdateSessionInput,
  UpdateTrainingSettingsInput,
} from "../types";

export const trainingKeys = {
  all: ["training"] as const,
  overview: () => [...trainingKeys.all, "overview"] as const,
  matrix: () => [...trainingKeys.all, "matrix"] as const,
  gaps: () => [...trainingKeys.all, "gaps"] as const,
  plan: (months?: number) =>
    [...trainingKeys.all, "plan", months ?? 3] as const,
  readiness: () => [...trainingKeys.all, "readiness"] as const,
  settings: () => [...trainingKeys.all, "settings"] as const,
  log: () => [...trainingKeys.all, "log"] as const,
  competencies: () => [...trainingKeys.all, "competencies"] as const,
  roles: () => [...trainingKeys.all, "roles"] as const,
  people: (params?: ListPeopleParams) =>
    [...trainingKeys.all, "people", params ?? {}] as const,
  person: (id: string) => [...trainingKeys.all, "person", id] as const,
  records: (personId?: string) =>
    [...trainingKeys.all, "records", personId ?? "all"] as const,
  sessions: () => [...trainingKeys.all, "sessions"] as const,
  session: (id: string) => [...trainingKeys.all, "session", id] as const,
  publicSelf: (token: string) =>
    [...trainingKeys.all, "public-self", token] as const,
  publicRsvp: (token: string) =>
    [...trainingKeys.all, "public-rsvp", token] as const,
};

const HUB_REFETCH_MS = 20_000;

async function invalidateHub(
  queryClient: ReturnType<typeof useQueryClient>,
  extras?: string[]
) {
  await queryClient.invalidateQueries({ queryKey: trainingKeys.all });
  if (extras) {
    for (const id of extras) {
      await queryClient.invalidateQueries({
        queryKey: trainingKeys.person(id),
      });
    }
  }
}

export function useTrainingOverviewQuery() {
  return useQuery({
    queryKey: trainingKeys.overview(),
    queryFn: () => getTrainingOverview(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTrainingMatrixQuery() {
  return useQuery({
    queryKey: trainingKeys.matrix(),
    queryFn: () => getTrainingMatrix(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTrainingGapsQuery() {
  return useQuery({
    queryKey: trainingKeys.gaps(),
    queryFn: () => getTrainingGaps(),
  });
}

export function useTrainingPlanQuery(months = 3) {
  return useQuery({
    queryKey: trainingKeys.plan(months),
    queryFn: () => getTrainingPlan(months),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTrainingReadinessQuery() {
  return useQuery({
    queryKey: trainingKeys.readiness(),
    queryFn: () => getTrainingReadiness(),
  });
}

export function useTrainingSettingsQuery() {
  return useQuery({
    queryKey: trainingKeys.settings(),
    queryFn: () => getTrainingSettings(),
  });
}

export function useTrainingLogQuery() {
  return useQuery({
    queryKey: trainingKeys.log(),
    queryFn: () => getTrainingLog(),
  });
}

export function useCompetenciesQuery() {
  return useQuery({
    queryKey: trainingKeys.competencies(),
    queryFn: () => listCompetencies(),
  });
}

export function useRolesQuery() {
  return useQuery({
    queryKey: trainingKeys.roles(),
    queryFn: () => listRoles(),
  });
}

export function usePeopleQuery(params: ListPeopleParams = {}) {
  return useQuery({
    queryKey: trainingKeys.people(params),
    queryFn: () => listPeople(params),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function usePersonQuery(id: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.person(id ?? ""),
    queryFn: () => getPerson(id!),
    enabled: Boolean(id),
  });
}

export function useRecordsQuery(personId?: string) {
  return useQuery({
    queryKey: trainingKeys.records(personId),
    queryFn: () => listRecords(personId),
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: trainingKeys.sessions(),
    queryFn: () => listSessions(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useSessionQuery(id: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.session(id ?? ""),
    queryFn: () => getSession(id!),
    enabled: Boolean(id),
  });
}

export function usePublicSelfQuery(token?: string) {
  return useQuery({
    queryKey: trainingKeys.publicSelf(token ?? ""),
    queryFn: () => getPublicSelfView(token!),
    enabled: Boolean(token),
  });
}

export function usePublicRsvpQuery(token?: string) {
  return useQuery({
    queryKey: trainingKeys.publicRsvp(token ?? ""),
    queryFn: () => getPublicRsvpView(token!),
    enabled: Boolean(token),
  });
}

export function useUpdateTrainingSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTrainingSettingsInput) =>
      updateTrainingSettings(body),
    onSuccess: async (settings) => {
      queryClient.setQueryData(trainingKeys.settings(), settings);
      await invalidateHub(queryClient);
    },
  });
}

export function useCreateCompetencyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCompetencyInput) => createCompetency(body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useUpdateCompetencyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCompetencyInput }) =>
      updateCompetency(id, body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useArchiveCompetencyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveCompetency(id),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRoleInput) => createRole(body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleInput }) =>
      updateRole(id, body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useRemoveRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeRole(id),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useCreatePersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonInput) => createPerson(body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useAddExternalPersonMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExternalPersonInput) => addExternalPerson(body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useUpdatePersonMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePersonInput) => updatePerson(id, body),
    onSuccess: async (person) => {
      queryClient.setQueryData(trainingKeys.person(id), person);
      await invalidateHub(queryClient, [id]);
    },
  });
}

export function useMarkLeaverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date?: string }) =>
      markLeaver(id, date ? { date } : undefined),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useSetExemptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cid,
      reason,
    }: {
      id: string;
      cid: string;
      reason: string;
    }) => setExemption(id, { cid, reason }),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useClearExemptionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cid }: { id: string; cid: string }) =>
      clearExemption(id, cid),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useAcknowledgePolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cid,
      answers,
    }: {
      id: string;
      cid: string;
      answers?: number[];
    }) => acknowledgePolicy(id, { cid, answers }),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useIssueSelfTokenMutation() {
  return useMutation({
    mutationFn: (id: string) => issueSelfToken(id),
  });
}

export function useCreateRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateRecordInput) => createRecord(body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useVerifyRecordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => verifyRecord(id),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSessionInput) => createSession(body),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useUpdateSessionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSessionInput) => updateSession(id, body),
    onSuccess: async (session) => {
      queryClient.setQueryData(trainingKeys.session(id), session);
      await invalidateHub(queryClient);
    },
  });
}

export function useCompleteSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      outcomes,
    }: {
      id: string;
      outcomes?: Record<string, SessionOutcome>;
    }) => completeSession(id, outcomes),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useCancelSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelSession(id, reason),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useInviteSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, personIds }: { id: string; personIds?: string[] }) =>
      inviteSession(id, personIds),
    onSuccess: async () => invalidateHub(queryClient),
  });
}

export function useAddSessionAttachmentMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      body,
    }: {
      kind: "materials" | "outputs";
      body: SessionAttachmentInput;
    }) => addSessionAttachment(sessionId, kind, body),
    onSuccess: async (session) => {
      queryClient.setQueryData(trainingKeys.session(sessionId), session);
      await invalidateHub(queryClient);
    },
  });
}

export function useRemoveSessionAttachmentMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      attachmentId,
    }: {
      kind: "materials" | "outputs";
      attachmentId: string;
    }) => removeSessionAttachment(sessionId, kind, attachmentId),
    onSuccess: async (session) => {
      queryClient.setQueryData(trainingKeys.session(sessionId), session);
      await invalidateHub(queryClient);
    },
  });
}

export function usePublicSelfAcknowledgeMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { cid: string; answers?: number[] }) =>
      publicSelfAcknowledge(token, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trainingKeys.publicSelf(token),
      });
    },
  });
}

export function usePublicSelfUploadMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      cid: string;
      date?: string;
      provider?: string;
      ref?: string;
      fileId?: string | null;
      note?: string;
    }) => publicSelfUpload(token, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trainingKeys.publicSelf(token),
      });
    },
  });
}

export function usePublicRsvpMutation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: TrainingRsvpStatus; note?: string }) =>
      publicRsvp(token, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trainingKeys.publicRsvp(token),
      });
    },
  });
}
