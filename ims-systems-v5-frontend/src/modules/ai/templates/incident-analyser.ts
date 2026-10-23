import type { AiAnalyserTemplateDefinition } from "../types";

/** Ported from V4 `incident_analyser` template. */
export const incidentAnalyserTemplate: AiAnalyserTemplateDefinition = {
  dataDisplay: `#### <= local.reference => <= local.title =>
  
<= local.description =>
`,
  context: `You are a Incident response expert. Consider the following when you analyse incidents and provide insights:\nTitle: <= local.title =>\nDescription: <= local.description =>`,
  reportStructure: [
    {
      name: "Root Cause Analysis",
      description:
        "Conduct a thorough investigation to identify the underlying causes of the incident. This analysis helps in understanding the factors that contributed to the incident and enables organisations to address the root causes rather than just the symptoms.",
      prompt:
        "Provide insight into what could be the possible root cause for this incident, identify contributing factors that may have indirectly influenced the incident",
      response: "",
    },
    {
      name: "Impact Assessment",
      description:
        "Assess the impact of the incident on various aspects of the organization, such as operations, reputation, financials, and customer trust. This assessment helps in prioritizing recovery efforts and allocating resources effectively.",
      prompt:
        "Identify Direct and Indirect Impacts: Determine the immediate and direct impacts of the incident, such as financial losses, operational disruptions, or reputational damage. Additionally, consider the indirect impacts that may arise from the incident, such as customer dissatisfaction, regulatory penalties, or legal liabilities. Assess Stakeholder Impacts: Identify the stakeholders who may be affected by the incident, such as customers, employees, suppliers, or shareholders. Evaluate how the incident impacts their interests, satisfaction, or trust in the organization.",
      response: "",
    },
    {
      name: "Suggested resolutions",
      description: "",
      prompt:
        "Suggest me some incident resolutions for this incident, and how to resolve this incident",
      response: "",
    },
    {
      name: "Communication and Stakeholder Management",
      description:
        "Evaluate the effectiveness of communication and stakeholder management during the incident. Identify areas for improvement in terms of timely and accurate communication with internal and external stakeholders, including employees, customers, regulators, and the media.",
      prompt:
        "Review Assess the communication channels used during the incident, such as emails, phone calls, social media, or dedicated incident response platforms. Evaluate the timeliness, clarity, and effectiveness of the messages conveyed through these channels. Analyze the external communication strategies employed during the incident. Assess the accuracy and transparency of the information shared with external stakeholders, as well as the responsiveness to their inquiries or concerns.Evaluate the response time in addressing stakeholder inquiries or concerns. Determine if there were delays in providing updates or if stakeholders felt their questions were not adequately addressed. Assess the effectiveness of the communication plan that was in place during the incident. Determine if the plan was comprehensive, if it included clear roles and responsibilities, and if it was regularly updated as the incident unfolded.",
      response: "",
    },
    {
      name: "Continuous Improvement",
      description:
        "Use the insights gained from the incident to drive continuous improvement in the organization's risk management and incident response practices. This includes updating risk assessments, revising incident response plans, and implementing necessary controls to mitigate similar risks in the future.",
      prompt:
        "What are the potential corrective actions that can be taken if this incident occurs?",
      response: "",
    },
    {
      name: "Prevention",
      description:
        "Training and Education: Provide comprehensive training and education programs to employees, stakeholders, and individuals to raise awareness about potential risks and how to prevent incidents. This includes training on safety procedures, emergency response protocols, and the proper use of equipment and tools.",
      prompt:
        "Incident Reporting and Investigation: Establish a robust incident reporting and investigation system to encourage employees and individuals to report near-misses, hazards, and incidents. Investigate incidents thoroughly to identify root causes and implement corrective actions to prevent similar incidents from occurring in the future how they should do this",
      response: "",
    },
  ],
};
