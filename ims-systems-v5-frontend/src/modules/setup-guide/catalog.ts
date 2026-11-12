import type { SetupStepDefinition } from "./types";

/**
 * Get-set-up checklist — ported from assets/setupux/setup-steps.json.
 *
 * Interactive steps: org, docs, link, soa, risk. Remaining steps Coming soon.
 */
export const SETUP_GUIDE_TITLE = "Get set up";
export const SETUP_GUIDE_ESTIMATE = "about 2 hours";

export const SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: "org",
    title: "Set up your organisation",
    summary: "Business units or whole businesses, feeding the dashboard",
    estimate: "20 min",
    aliceCapable: true,
    status: "available",
    requiredPermission: "functional-units:read",
    route: "/functional-units",
    completeOn: "org.fu.created",
    guide: {
      text: "Create your first business unit. A unit is a team, a site, or a whole business; everything inside it rolls up to the dashboard.",
      subs: [
        {
          label: "Open Organisation › Functional Units",
          target: "[data-tour='org.fu.register']",
          spotLabel: "Your units live here",
          route: "/functional-units",
        },
        {
          label: "Click “Create a function”",
          target: "[data-tour='org.fu.create']",
          spotLabel: "Click here",
          route: "/functional-units",
          advanceOn: "org.fu.create-opened",
        },
        {
          label: "Choose the access type",
          target: "[data-tour='org.fu.field.access-type']",
          spotLabel: "Pick the access type",
          route: "/functional-units?create=1",
        },
        {
          label: "Name it and give it a responsibility",
          target: "[data-tour='org.fu.field.name']",
          spotLabel: "Name it",
          route: "/functional-units?create=1",
        },
        {
          label: "Create it, then invite users and register assets",
          target: "[data-tour='org.fu.submit']",
          spotLabel: "Create",
          spotLabelAbove: true,
          route: "/functional-units?create=1",
          advanceOn: "org.fu.created",
        },
      ],
    },
  },
  {
    id: "docs",
    title: "Bring your compliance in",
    summary: "Purpose, owner, review date, authorisation",
    estimate: "30 min",
    aliceCapable: true,
    status: "available",
    requiredPermission: "document-management:read",
    route: "/documents?tab=repositories",
    completeOn: "docs.document.created",
    guide: {
      text: "Create a repository for your policies, then upload. Set the purpose, owners and review date; switch on authorisation where sign-off is needed.",
      subs: [
        {
          label: "Open Documents › Repositories",
          target: "[data-tour='docs.tabs']",
          spotLabel: "Repositories tab",
          route: "/documents?tab=repositories",
          advanceOn: "docs.tab.repositories",
        },
        {
          label: "Click “Create repository”",
          target: "[data-tour='docs.repo.create']",
          spotLabel: "Click here",
          route: "/documents?tab=repositories",
          advanceOn: "docs.repo.create-opened",
        },
        {
          label: "Name it “Policies & Procedures”",
          target: "[data-tour='docs.repo.sheet']",
          spotLabel: "Name the library",
          route: "/documents?tab=repositories&createRepo=1",
          advanceOn: "docs.repo.created",
        },
        {
          label: "Upload your files with purpose and applicable modules",
          target: "[data-tour='docs.upload']",
          spotLabel: "Upload",
          route: "/documents?tab=repositories",
        },
        {
          label: "Confirm owners, review dates and authorisation",
          target: "[data-tour='docs.upload']",
          spotLabel: "Finish the upload",
          spotLabelAbove: true,
          route: "/documents?tab=repositories",
          advanceOn: "docs.document.created",
        },
      ],
    },
  },
  {
    id: "link",
    title: "Link documents to the standards",
    summary:
      "Compliance Settings; evidence on the clause; the link follows every version",
    estimate: "15 min",
    aliceCapable: true,
    status: "available",
    requiredPermission: "document-management:read",
    route: "/documents?tab=repositories",
    completeOn: "docs.compliance.linked",
    guide: {
      text: "Open a document and tie it to the clauses it supports. It becomes evidence on those controls and the link follows every new version.",
      subs: [
        {
          label: "Open a document",
          target: "[data-tour='docs.tabs']",
          spotLabel: "Open a policy from a repository",
          route: "/documents?tab=repositories",
        },
        {
          label: "Go to Compliance Settings",
          target: "[data-tour='docs.compliance.tab']",
          spotLabel: "Compliance Settings",
          advanceOn: "docs.compliance.tab-opened",
        },
        {
          label: "Select the standards and clauses it supports",
          target: "[data-tour='docs.compliance.panel']",
          spotLabel: "Pick clauses",
        },
        {
          label: "Save",
          target: "[data-tour='docs.compliance.panel']",
          spotLabel: "Link evidence",
          spotLabelAbove: true,
          advanceOn: "docs.compliance.linked",
        },
      ],
    },
  },
  {
    id: "soa",
    title: "Statement of Applicability",
    summary:
      "Built from your toolkits; select, status, evidence; the score moves",
    estimate: "20 min",
    aliceCapable: true,
    status: "available",
    requiredPermission: "compliance:read",
    route: "/compliance/ISO%209001?tab=toolkit",
    completeOn: "soa.evidence.attached",
    guide: {
      text: "iMS OS has built the Statement of Applicability from your licensed toolkits. Confirm what applies, set the status, attach the evidence; the score moves as you go.",
      subs: [
        {
          label: "Open Compliance › your standard › Controls",
          target: "[data-tour='soa.tabs']",
          spotLabel: "Controls tab",
          route: "/compliance/ISO%209001?tab=toolkit",
          advanceOn: "soa.tab.toolkit",
        },
        {
          label: "Open a clause",
          target: "[data-tour='soa.controls']",
          spotLabel: "Open a clause",
          route: "/compliance/ISO%209001?tab=toolkit",
          advanceOn: "soa.control.opened",
        },
        {
          label: "Select it (or justify why not)",
          target: "[data-tour='soa.control.selected']",
          spotLabel: "Select the control",
        },
        {
          label: "Set the status",
          target: "[data-tour='soa.control.state']",
          spotLabel: "Set status",
          advanceOn: "soa.control.status-updated",
        },
        {
          label: "Attach evidence",
          target: "[data-tour='soa.control.evidence']",
          spotLabel: "Attach evidence",
          spotLabelAbove: true,
          advanceOn: "soa.evidence.attached",
        },
      ],
    },
  },
  {
    id: "risk",
    title: "Risk, analysed by Alice",
    summary: "Raise and score; Alice gives impacts, mitigations, controls",
    estimate: "15 min",
    aliceCapable: true,
    status: "available",
    requiredPermission: "risks:read",
    route: "/risks",
    completeOn: "risks.analysed",
    guide: {
      text: "Raise a risk against the organisation or an asset, score it, then let Alice analyse it.",
      subs: [
        {
          label: "Open Risks › Raise risk",
          target: "[data-tour='risks.create']",
          spotLabel: "Raise a risk",
          route: "/risks",
          advanceOn: "risks.create-opened",
        },
        {
          label: "Describe and score it",
          target: "[data-tour='risks.field.title']",
          spotLabel: "Describe and score",
          route: "/risks?create=1",
        },
        {
          label: "Set the owner",
          target: "[data-tour='risks.field.owner']",
          spotLabel: "Set the owner",
          route: "/risks?create=1",
        },
        {
          label: "Click Analyse",
          target: "[data-tour='risks.analyse']",
          spotLabel: "Analyse with Alice",
          advanceOn: "risks.analyse-opened",
        },
        {
          label: "Save Alice's response as the treatment",
          target: "[data-tour='risks.sheet']",
          spotLabel: "Save the treatment",
          spotLabelAbove: true,
          advanceOn: "risks.analysed",
        },
      ],
    },
  },
  {
    id: "audit",
    title: "Internal audits that run themselves",
    summary: "Interval, compliance body, Alice's audit plan",
    estimate: "5 min",
    aliceCapable: true,
    status: "coming_soon",
    requiredPermission: "audits:read",
    route: "/audits",
    guide: {
      text: "Schedule the audit programme once. The interval creates the series; Alice drafts the plan.",
      subs: [
        { label: "Open Audits › Internal › Schedule audit" },
        { label: "Title, focus area, business unit, compliance body" },
        { label: "Auditor, date, time" },
        { label: "Set the interval" },
        { label: "Click Assist & Verification for the plan" },
      ],
    },
  },
  {
    id: "review",
    title: "Management review on autopilot",
    summary: "Series, attendees, agenda, minutes, actions",
    estimate: "5 min",
    aliceCapable: false,
    status: "coming_soon",
    requiredPermission: "management-reviews:read",
    route: "/management-reviews",
    guide: {
      text: "Schedule the management review series with attendees. Agenda, minutes and actions attach to each meeting.",
      subs: [
        { label: "Open Reviews › Schedule review" },
        { label: "Title and privacy" },
        { label: "Date, time and interval" },
        { label: "Tick the attendees" },
        { label: "Schedule" },
      ],
    },
  },
  {
    id: "remote",
    title: "Remote audit ready",
    summary:
      "Invite your lead auditor: read-only login, live evidence, no exports",
    estimate: "5 min",
    aliceCapable: false,
    status: "coming_soon",
    requiredPermission: "functional-units:read",
    route: "/functional-units",
    guide: {
      text: "Make the organisation remote-audit ready: your certification body becomes an external compliance function and your lead auditor gets a read-only login.",
      subs: [
        { label: "Organisation › Functional Units › Create a function" },
        { label: "Access type: External compliance function" },
        { label: "Name the certification body and standards" },
        { label: "Users › Add user › External Auditor" },
        { label: "Send the invitation" },
      ],
    },
  },
  {
    id: "alice",
    title: "Alice manages it proactively",
    summary:
      "Policies due, controls without evidence, audits coming up; she finds, drafts and chases, you decide",
    estimate: "2 min",
    aliceCapable: true,
    status: "coming_soon",
    route: "/",
    guide: {
      text: "Ask Alice your first question. From now on she reviews your data daily and tells you what needs attention.",
      subs: [
        { label: "Open Alice (bottom right)" },
        { label: "Ask “What needs attention this week?”" },
        { label: "Open one of the records she links" },
        { label: "Pin the Monday question" },
      ],
    },
  },
];

const BY_ID = new Map(SETUP_STEPS.map((step) => [step.id, step]));

export function getSetupStep(stepId: string): SetupStepDefinition | undefined {
  return BY_ID.get(stepId);
}

export function listAvailableSteps(): SetupStepDefinition[] {
  return SETUP_STEPS.filter((step) => step.status === "available");
}
