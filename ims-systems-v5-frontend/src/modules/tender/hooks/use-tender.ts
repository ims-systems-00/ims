import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptTenderAnswer,
  addTenderDocument,
  approveTenderAnswers,
  assessTenderRequirement,
  autoAssessTenderRequirements,
  createTenderAnswer,
  createTenderCase,
  createTenderCertificate,
  createTenderPolicy,
  createTenderQuestionnaire,
  createTenderRate,
  createTenderService,
  deleteTenderAnswer,
  deleteTenderCase,
  deleteTenderCertificate,
  deleteTenderPolicy,
  deleteTenderQuestionnaire,
  deleteTenderRate,
  deleteTenderService,
  draftTenderQuestionnaire,
  getTenderGate,
  getTenderHealth,
  getTenderLog,
  getTenderOverview,
  getTenderQuestionnaire,
  getTenderSettings,
  listTenderAnswers,
  listTenderCases,
  listTenderCertificates,
  listTenderPolicies,
  listTenderQuestionnaires,
  listTenderRates,
  listTenderServices,
  markTenderSubmitted,
  parseTenderUpload,
  setTenderAnswer,
  setTenderPricing,
  submitTenderQuestionnaire,
  updateTenderAnswer,
  updateTenderCase,
  updateTenderCertificate,
  updateTenderFacts,
  updateTenderPolicy,
  updateTenderQuestionnaire,
  updateTenderRate,
  updateTenderService,
  updateTenderSettings,
} from "../api/tender";
import type {
  AddDocumentInput,
  ApproveInput,
  AssessRequirementInput,
  CreateQuestionnaireInput,
  DraftQuestionnaireInput,
  MarkSubmittedInput,
  ParseUploadInput,
  SetAnswerInput,
  SetPricingInput,
  SubmitInput,
  TenderFacts,
  UpdateBidInput,
  UpdateTenderSettingsInput,
  UpsertAnswerInput,
  UpsertCaseInput,
  UpsertCertificateInput,
  UpsertPolicyInput,
  UpsertRateInput,
  UpsertServiceInput,
} from "../types";

export const tenderKeys = {
  all: ["tender"] as const,
  settings: () => [...tenderKeys.all, "settings"] as const,
  health: () => [...tenderKeys.all, "health"] as const,
  overview: () => [...tenderKeys.all, "overview"] as const,
  log: () => [...tenderKeys.all, "log"] as const,
  answers: () => [...tenderKeys.all, "answers"] as const,
  certificates: () => [...tenderKeys.all, "certificates"] as const,
  policies: () => [...tenderKeys.all, "policies"] as const,
  services: () => [...tenderKeys.all, "services"] as const,
  cases: () => [...tenderKeys.all, "cases"] as const,
  rates: () => [...tenderKeys.all, "rates"] as const,
  questionnaires: () => [...tenderKeys.all, "questionnaires"] as const,
  questionnaire: (id: string) =>
    [...tenderKeys.all, "questionnaire", id] as const,
  gate: (id: string) => [...tenderKeys.all, "gate", id] as const,
};

const HUB_REFETCH_MS = 20_000;

async function invalidateTender(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string
) {
  await queryClient.invalidateQueries({ queryKey: tenderKeys.all });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: tenderKeys.questionnaire(id),
    });
    await queryClient.invalidateQueries({ queryKey: tenderKeys.gate(id) });
  }
}

/* ---------------- queries ---------------- */

export function useTenderSettingsQuery() {
  return useQuery({
    queryKey: tenderKeys.settings(),
    queryFn: () => getTenderSettings(),
  });
}

export function useTenderHealthQuery() {
  return useQuery({
    queryKey: tenderKeys.health(),
    queryFn: () => getTenderHealth(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderOverviewQuery() {
  return useQuery({
    queryKey: tenderKeys.overview(),
    queryFn: () => getTenderOverview(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderLogQuery() {
  return useQuery({
    queryKey: tenderKeys.log(),
    queryFn: () => getTenderLog(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderAnswersQuery() {
  return useQuery({
    queryKey: tenderKeys.answers(),
    queryFn: () => listTenderAnswers(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderCertificatesQuery() {
  return useQuery({
    queryKey: tenderKeys.certificates(),
    queryFn: () => listTenderCertificates(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderPoliciesQuery() {
  return useQuery({
    queryKey: tenderKeys.policies(),
    queryFn: () => listTenderPolicies(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderServicesQuery() {
  return useQuery({
    queryKey: tenderKeys.services(),
    queryFn: () => listTenderServices(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderCasesQuery() {
  return useQuery({
    queryKey: tenderKeys.cases(),
    queryFn: () => listTenderCases(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderRatesQuery() {
  return useQuery({
    queryKey: tenderKeys.rates(),
    queryFn: () => listTenderRates(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderQuestionnairesQuery() {
  return useQuery({
    queryKey: tenderKeys.questionnaires(),
    queryFn: () => listTenderQuestionnaires(),
    refetchInterval: HUB_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useTenderQuestionnaireQuery(id: string | undefined) {
  return useQuery({
    queryKey: tenderKeys.questionnaire(id ?? ""),
    queryFn: () => getTenderQuestionnaire(id!),
    enabled: Boolean(id),
  });
}

export function useTenderGateQuery(id: string | undefined) {
  return useQuery({
    queryKey: tenderKeys.gate(id ?? ""),
    queryFn: () => getTenderGate(id!),
    enabled: Boolean(id),
  });
}

/* ---------------- settings / facts mutations ---------------- */

export function useUpdateTenderSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTenderSettingsInput) =>
      updateTenderSettings(body),
    onSuccess: async (settings) => {
      const prev = queryClient.getQueryData<
        Awaited<ReturnType<typeof getTenderSettings>>
      >(tenderKeys.settings());
      queryClient.setQueryData(tenderKeys.settings(), {
        ...settings,
        facts: prev?.facts ?? {},
      });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.all });
    },
  });
}

export function useUpdateTenderFactsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (facts: TenderFacts) => updateTenderFacts(facts),
    onSuccess: async (facts) => {
      const prev = queryClient.getQueryData<
        Awaited<ReturnType<typeof getTenderSettings>>
      >(tenderKeys.settings());
      if (prev) {
        queryClient.setQueryData(tenderKeys.settings(), { ...prev, facts });
      }
      await queryClient.invalidateQueries({ queryKey: tenderKeys.settings() });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.log() });
    },
  });
}

/* ---------------- library mutations ---------------- */

export function useUpsertTenderAnswerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertAnswerInput & { id?: string }) =>
      input.id
        ? updateTenderAnswer(input.id, input)
        : createTenderAnswer(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.answers() });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.health() });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.overview() });
    },
  });
}

export function useDeleteTenderAnswerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenderAnswer(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.answers() });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.health() });
    },
  });
}

export function useUpsertTenderCertificateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertCertificateInput & { id?: string }) =>
      input.id
        ? updateTenderCertificate(input.id, input)
        : createTenderCertificate(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: tenderKeys.certificates(),
      });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.health() });
    },
  });
}

export function useDeleteTenderCertificateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenderCertificate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: tenderKeys.certificates(),
      });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.health() });
    },
  });
}

export function useUpsertTenderPolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertPolicyInput & { id?: string }) =>
      input.id
        ? updateTenderPolicy(input.id, input)
        : createTenderPolicy(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.policies() });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.health() });
    },
  });
}

export function useDeleteTenderPolicyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenderPolicy(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.policies() });
      await queryClient.invalidateQueries({ queryKey: tenderKeys.health() });
    },
  });
}

export function useUpsertTenderServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertServiceInput & { id?: string }) =>
      input.id
        ? updateTenderService(input.id, input)
        : createTenderService(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.services() });
    },
  });
}

export function useDeleteTenderServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenderService(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.services() });
    },
  });
}

export function useUpsertTenderCaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertCaseInput & { id?: string }) =>
      input.id ? updateTenderCase(input.id, input) : createTenderCase(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.cases() });
    },
  });
}

export function useDeleteTenderCaseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenderCase(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.cases() });
    },
  });
}

export function useUpsertTenderRateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertRateInput & { id?: string }) =>
      input.id ? updateTenderRate(input.id, input) : createTenderRate(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.rates() });
    },
  });
}

export function useDeleteTenderRateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenderRate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenderKeys.rates() });
    },
  });
}

/* ---------------- questionnaire workflow mutations ---------------- */

export function useParseTenderUploadMutation() {
  return useMutation({
    mutationFn: (body: ParseUploadInput) => parseTenderUpload(body),
  });
}

export function useCreateTenderQuestionnaireMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateQuestionnaireInput) =>
      createTenderQuestionnaire(body),
    onSuccess: async () => invalidateTender(queryClient),
  });
}

export function useUpdateTenderQuestionnaireMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBidInput) => updateTenderQuestionnaire(id, body),
    onSuccess: async (q) => {
      await invalidateTender(queryClient, id);
      queryClient.setQueryData(tenderKeys.questionnaire(id), q);
    },
  });
}

export function useDeleteTenderQuestionnaireMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTenderQuestionnaire(id),
    onSuccess: async () => invalidateTender(queryClient),
  });
}

export function useAddTenderDocumentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddDocumentInput) => addTenderDocument(id, body),
    onSuccess: async (q) => {
      await invalidateTender(queryClient, id);
      queryClient.setQueryData(tenderKeys.questionnaire(id), q);
    },
  });
}

export function useAssessTenderRequirementMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rid: string; body: AssessRequirementInput }) =>
      assessTenderRequirement(id, input.rid, input.body),
    onSuccess: async () => invalidateTender(queryClient, id),
  });
}

export function useAutoAssessTenderMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => autoAssessTenderRequirements(id),
    onSuccess: async (q) => {
      await invalidateTender(queryClient, id);
      queryClient.setQueryData(tenderKeys.questionnaire(id), q);
    },
  });
}

export function useSetTenderPricingMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SetPricingInput) => setTenderPricing(id, body),
    onSuccess: async () => invalidateTender(queryClient, id),
  });
}

export function useDraftTenderQuestionnaireMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DraftQuestionnaireInput = {}) =>
      draftTenderQuestionnaire(id, body),
    onSuccess: async (q) => {
      await invalidateTender(queryClient, id);
      queryClient.setQueryData(tenderKeys.questionnaire(id), q);
    },
  });
}

export function useSetTenderAnswerMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { qid: string; body: SetAnswerInput }) =>
      setTenderAnswer(id, input.qid, input.body),
    onSuccess: async () => invalidateTender(queryClient, id),
  });
}

export function useAcceptTenderAnswerMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (qid: string) => acceptTenderAnswer(id, qid),
    onSuccess: async () => invalidateTender(queryClient, id),
  });
}

export function useApproveTenderAnswersMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ApproveInput = {}) => approveTenderAnswers(id, body),
    onSuccess: async (q) => {
      await invalidateTender(queryClient, id);
      queryClient.setQueryData(tenderKeys.questionnaire(id), q);
    },
  });
}

export function useSubmitTenderMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitInput = {}) =>
      submitTenderQuestionnaire(id, body),
    onSuccess: async () => invalidateTender(queryClient, id),
  });
}

export function useMarkTenderSubmittedMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkSubmittedInput = {}) =>
      markTenderSubmitted(id, body),
    onSuccess: async (q) => {
      await invalidateTender(queryClient, id);
      queryClient.setQueryData(tenderKeys.questionnaire(id), q);
    },
  });
}
