import type { AiAnalyserTemplateDefinition } from "../types";

/** Ported from V4 `risk_analyser` template. */
export const riskAnalyserTemplate: AiAnalyserTemplateDefinition = {
  dataDisplay: `
#### <= local.risk.reference => <= local.risk.title =>
<= local.risk.description =>
`,
  context: `
You are a risk assesment expert. Consider following risk:

organisation name: <= local.organisation.name =>
title: <= local.risk.title =>
description: <= local.risk.description =>
With the scores (scores for likelihood and consequence can be from 1-5)
total score is multiplied as likelihood x consequnce.
Likelihood: <= local.risk.score.likelihood.current =>.
Consequence: <= local.risk.score.consequence.current =>.
Total: <= local.risk.score.likelihood.current => x <= local.risk.score.consequence.current =>
Higher socre the vulnerability and severity is high. Bespoke your responses with the organisation name.
`,
  reportStructure: [
    {
      name: "Impact analysis",
      description: "Impact analysis",
      prompt: `What impact our business may have because of this risk? Keep following in your responses:
- list specefic impacts that this risk has on our business.
- state the regulatory and compliance issues this may cause.
- take into consideration the ESG impact of this risk.
- always state "as you are reviewing this analysis and mitigate this risk, please ensure to link the
controls from your compliance toolkit to this risk as evidence  within iMS Systems".
    `,
      response: "",
    },
    {
      name: "Risk scoring",
      description: "Risk scoring",
      prompt: `Score the risk based on the description and the likelihood and 
consequences of the risk out of 1-5 for each. 
- See if the scoring we provided is properly done or not. 
- Explain what you took into considaration to score this risk accurately.
- provide how this can impact your ESG scoring.
- show the scores in bold.
`,
      response: "",
    },
    {
      name: "Generate controls and mitigations inline with regulatory standards ",
      description: "Regulatory standard analysis",
      prompt: `Specifically provide relavant ISO controls to mitigate this risk.
    - suggest what are the cost and resources required to implement these mitigations.
    - specify what controls we need to implement to mitigate this risk.
    - always state "If you have been assigned these ISO toolkits within iMS Systems please go to the toolkit, 
    upload your conformance against that control and link it to this risk".
    `,
      response: "",
    },
    {
      name: "Policies and procedures",
      description: "Policies and procedures",
      prompt: `Are there any existing policies and procedures or frameworks that can be leveraged to 
address the identified risk? if so create me the first two policy example that you think 
of in a proper format for my organisation.
- always state "You can populate these policies using myself(Alice) alice.imssystems.tech(in a hyperlink)
where I'll ensure they are inline with the relavant standards".
`,
      response: "",
    },
    {
      name: "Monitoring",
      description: "Monitoring",
      prompt: `How will the effectiveness of the controls or measures be monitored and evaludated?
`,
      response: "",
    },
    {
      name: "Business continuity",
      description:
        "What to do if the risk becomes an actual issue or a major incident.",
      prompt: `What is the business continuty plan if this risk becomes and issue or a major incident?
- provide what can we do to prevent this risk from turning into an issue or a major incident.
`,
      response: "",
    },
    {
      name: "Next steps",
      description: "Provide guidance to users on what to do next.",
      prompt: `Specify what the user should do after the analysis and what task to create to manage
monitor and miigate this risk effectively.
- always state "From the answers above use the relavant information and convert them to the tasks and 
assign them to the team to start the process of mitigation".
`,
      response: "",
    },
  ],
};
