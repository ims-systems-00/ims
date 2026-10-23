import type { AiAnalyserTemplateDefinition } from "../types";

/** Ported from V4 `audit_analyser` template. */
export const auditAnalyserTemplate: AiAnalyserTemplateDefinition = {
  dataDisplay: `#### <= local.reference => <= local.title =>

<= local.focusArea =>
`,
  context: `You are a compliance auditor who helps organisations prepare for thier audits, 
  provide guidance on how to conduct internal audits depending on the standards they audit.
  Provide clauses from the standard. Ask for the industry so specific audits can be conducted.
  Consider the following when you conduct the audt and provide insights:
  \nTitle: <= local.title =>\n Focus area: <= local.focusArea =>
  `,
  reportStructure: [
    {
      name: "Audit Tips",
      description:
        "Understand what compliance standards the users are auditing and provide tips on how to conduct the audits effectively",
      prompt: `Understand what compliance standards the users are auditing 
        and provide suggestions on how to conduct the audit. Example suggest 
        potential risks and how to identify non conformance.`,
      response: "",
    },
    {
      name: "Audit Plan",
      description:
        "Provide users an audit plan based on the compliance standard they are auditing and the industry",
      prompt: `Provide users an audit plan based on the compliance standard they are auditing and the industry`,
      response: "",
    },
    {
      name: "Audit Methodology",
      description:
        "Provide the users a methodology they can use to conduct the audit based on the industry and the compliance",
      prompt: `Provide the users a methodology they can use to conduct the audit based on the industry and the compliance`,
      response: "",
    },
    {
      name: "Audit Checklist",
      description:
        "Provide users with an audit checklist based on the compliance standard they are auditing and industry",
      prompt: `Provide users with an audit checklist based on the compliance standard they are auditing and industry`,
      response: "",
    },
    {
      name: "Identify risks ",
      description:
        "Identify potential risks due to their industry, and let the auditors know in advance what they can look out for. ",
      prompt:
        "Identify potential risks due to their industry, and let the auditors know in advance what they can look out for. ",
      response: "",
    },
    {
      name: "Non Conformities",
      description:
        "Provide information on what a non-conformity looks like and how to confirm that it is a non-conformity.",
      prompt:
        "Provide information on what a non-conformity looks like and how to confirm that it is a non-conformity.",
      response: "",
    },
    {
      name: "Continual improvements",
      description: "How the auditor should identify improvements ",
      prompt:
        "How the auditor should identify improvements, provide details of how the users can identify improvements when they are auditing, what improvement clauses there are in the ISO standard they are auditing",
      response: "",
    },
    {
      name: "Review Documents  ",
      description:
        "Provide a list of documents that the auditor should review as part of the audits based on the standard they are auditing.",
      prompt:
        "Provide a list of documents that the auditor should review as part of the audits based on the standard they are auditing.",
      response: "",
    },
    {
      name: "Report template",
      description:
        "Provide an ISO internal audit report template for users based on the ISO compliance standard they are auditing and the industry",
      prompt: `Provide an ISO internal audit report template for users based
       on the ISO compliance standard they are auditing and the industry.
       Make the headlines/titles as header 5.`,
      response: "",
    },
  ],
};
