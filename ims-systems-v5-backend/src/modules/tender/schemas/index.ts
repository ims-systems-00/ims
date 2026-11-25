import { z } from "zod";
import {
  TENDER_DOCUMENT_KINDS,
  TENDER_QUESTION_STATUSES,
  TENDER_QUESTION_TYPES,
  TENDER_QUESTIONNAIRE_KINDS,
  TENDER_QUESTIONNAIRE_SOURCES,
  TENDER_REQUIREMENT_LEVELS,
  TENDER_REQUIREMENT_STATUSES,
} from "../types";

const entityIdSchema = z.string().trim().min(1).max(80);
const optionalString = z.string().trim().max(2000).optional();
const longText = z.string().trim().max(100_000);

export const idParamSchema = z.object({ id: entityIdSchema });
export const questionParamSchema = z.object({
  id: entityIdSchema,
  qid: entityIdSchema,
});
export const requirementParamSchema = z.object({
  id: entityIdSchema,
  rid: entityIdSchema,
});

export const updateSettingsBodySchema = z.object({
  reviewMonths: z.number().int().min(1).max(120).optional(),
  approvers: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  tone: z.string().trim().max(2000).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  certWarnDays: z.number().int().min(1).max(365).optional(),
  learn: z.boolean().optional(),
  submissionCc: z.string().trim().max(500).optional(),
  fromEmail: z.string().trim().max(200).optional(),
});

export const updateFactsBodySchema = z.record(
  z.string().trim().min(1).max(100),
  z.string().trim().max(4000)
);

const evidenceSchema = z.object({
  kind: z.string().trim().min(1).max(40),
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().max(300).optional(),
});

export const upsertAnswerBodySchema = z.object({
  id: entityIdSchema.optional(),
  question: z.string().trim().min(1).max(4000),
  answer: z.string().trim().max(50_000).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  standards: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  owner: z.string().trim().max(200).optional(),
  approvedBy: z.string().trim().max(200).optional(),
  approvedAt: z.string().trim().max(40).optional(),
  reviewBy: z.string().trim().max(40).optional(),
  evidence: z.array(evidenceSchema).max(40).optional(),
  source: z
    .object({
      qid: z.string().trim().min(1).max(80),
      buyer: z.string().trim().max(200),
    })
    .optional(),
});

export const upsertCertificateBodySchema = z.object({
  id: entityIdSchema.optional(),
  name: z.string().trim().min(1).max(300),
  body: optionalString,
  number: optionalString,
  standard: optionalString,
  scope: z.string().trim().max(4000).optional(),
  issued: z.string().trim().max(40).optional(),
  expires: z.string().trim().max(40).optional(),
  fileId: z.string().trim().max(5000).nullable().optional(),
  fileName: z.string().trim().max(300).nullable().optional(),
  fileMeta: z
    .object({
      Name: z.string(),
      Bucket: z.string(),
      Key: z.string().optional(),
      key: z.string().optional(),
      Size: z.number().optional(),
    })
    .nullable()
    .optional(),
});

export const upsertPolicyBodySchema = z.object({
  id: entityIdSchema.optional(),
  name: z.string().trim().min(1).max(300),
  ref: optionalString,
  version: optionalString,
  reviewed: z.string().trim().max(40).optional(),
  nextReview: z.string().trim().max(40).optional(),
  owner: optionalString,
  fileId: z.string().trim().max(5000).nullable().optional(),
  fileName: z.string().trim().max(300).nullable().optional(),
  fileMeta: z
    .object({
      Name: z.string(),
      Bucket: z.string(),
      Key: z.string().optional(),
      key: z.string().optional(),
      Size: z.number().optional(),
    })
    .nullable()
    .optional(),
  summary: z.string().trim().max(20_000).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
});

export const upsertServiceBodySchema = z.object({
  id: entityIdSchema.optional(),
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(20_000).optional(),
  method: z.string().trim().max(20_000).optional(),
  people: z.array(z.string().trim().min(1).max(200)).max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
});

export const upsertCaseBodySchema = z.object({
  id: entityIdSchema.optional(),
  client: z.string().trim().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  sector: optionalString,
  year: z.string().trim().max(20).optional(),
  value: optionalString,
  summary: z.string().trim().max(20_000).optional(),
  outcome: z.string().trim().max(20_000).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
});

export const upsertRateBodySchema = z.object({
  id: entityIdSchema.optional(),
  item: z.string().trim().min(1).max(300),
  unit: z.string().trim().max(80).optional(),
  rate: z.number().min(0).max(1e9),
  category: optionalString,
});

export const parseUploadBodySchema = z.object({
  name: z.string().trim().min(1).max(400),
  data: z.string().min(1),
});

export const createQuestionnaireBodySchema = z.object({
  text: z.string().trim().max(500_000).optional(),
  parsed: z
    .object({
      questions: z.array(z.record(z.string(), z.unknown())).min(0),
      header: z.number().optional(),
      answerCol: z.number().optional(),
    })
    .optional(),
  meta: z
    .object({
      buyer: optionalString,
      title: optionalString,
      reference: optionalString,
      submissionEmail: optionalString,
      buyerContact: optionalString,
      portalUrl: z.string().trim().max(2000).optional(),
      source: z.enum(TENDER_QUESTIONNAIRE_SOURCES).or(z.string()).optional(),
      fileName: z.string().trim().max(400).nullable().optional(),
      fileId: z.string().trim().max(200).nullable().optional(),
      due: z.string().trim().max(40).nullable().optional(),
      owner: optionalString,
      kind: z.enum(TENDER_QUESTIONNAIRE_KINDS).optional(),
      allowEmpty: z.boolean().optional(),
    })
    .optional(),
  draft: z.boolean().optional(),
});

export const updateBidBodySchema = z
  .object({
    buyer: optionalString,
    title: optionalString,
    reference: optionalString,
    submissionEmail: optionalString,
    buyerContact: optionalString,
    portalUrl: z.string().trim().max(2000).optional(),
    due: z.string().trim().max(40).nullable().optional(),
    owner: optionalString,
    notes: z.string().trim().max(20_000).optional(),
    kind: z.enum(TENDER_QUESTIONNAIRE_KINDS).optional(),
    status: z.string().trim().max(40).optional(),
  })
  .passthrough();

export const addDocumentBodySchema = z.object({
  name: z.string().trim().min(1).max(400).optional(),
  data: z.string().optional(),
  doc: z.record(z.string(), z.unknown()).optional(),
  draft: z.boolean().optional(),
  fileId: z.string().trim().max(200).nullable().optional(),
  fileName: z.string().trim().max(400).nullable().optional(),
});

export const assessRequirementBodySchema = z.object({
  status: z.enum(TENDER_REQUIREMENT_STATUSES).optional(),
  note: z.string().trim().max(4000).optional(),
  evidence: z.array(evidenceSchema).max(40).optional(),
  level: z.enum(TENDER_REQUIREMENT_LEVELS).optional(),
});

export const setPricingBodySchema = z
  .object({
    lines: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(80).optional(),
          description: z.string().trim().max(2000),
          unit: z.string().trim().max(80).optional(),
          qty: z.number().min(0).optional(),
          rate: z.number().nullable().optional(),
          category: z.string().trim().max(200).optional(),
          note: z.string().trim().max(2000).optional(),
          rateId: z.string().trim().max(80).optional(),
          suggested: z.boolean().optional(),
          buyerRow: z.number().optional(),
        })
      )
      .max(2000)
      .optional(),
    overheadPct: z.number().min(0).max(100).optional(),
    marginPct: z.number().min(0).max(100).optional(),
    vatPct: z.number().min(0).max(100).optional(),
    currency: z.string().trim().max(10).optional(),
    notes: z.string().trim().max(10_000).optional(),
    basis: z.string().trim().max(10_000).optional(),
  })
  .passthrough();

export const setAnswerBodySchema = z.object({
  answer: z.string().trim().max(50_000).optional(),
  status: z.enum(TENDER_QUESTION_STATUSES).optional(),
  type: z.enum(TENDER_QUESTION_TYPES).optional(),
  assignee: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(4000).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const draftQuestionnaireBodySchema = z.object({
  only: z.array(entityIdSchema).max(500).optional(),
});

export const approveBodySchema = z.object({
  questionIds: z.array(entityIdSchema).max(500).nullable().optional(),
});

export const submitBodySchema = z.object({
  force: z.boolean().optional(),
  cc: z.string().trim().max(500).optional(),
});

export const markSubmittedBodySchema = z.object({
  how: z.string().trim().max(40).optional(),
});

export const standaloneDraftBodySchema = z.object({
  question: z.string().trim().min(1).max(10_000),
  wordLimit: z.number().int().min(1).max(50_000).nullable().optional(),
});

export const fileUploadBodySchema = z.object({
  fileName: z.string().trim().min(1).max(400),
  contentType: z.string().trim().max(200).optional(),
  fileSize: z.number().int().min(1).max(100_000_000).optional(),
});

export const bidQuerySchema = z.object({
  what: z.enum(["bid", "pricing", "questionnaire"]).optional(),
});

export const exportQuerySchema = z.object({
  format: z.enum(["xlsx", "docx", "csv"]).optional(),
});

export const auditorPackQuerySchema = z.object({
  format: z.enum(["html", "pdf"]).optional(),
});

export const documentKindSchema = z.enum(TENDER_DOCUMENT_KINDS);
export const longTextSchema = longText;
