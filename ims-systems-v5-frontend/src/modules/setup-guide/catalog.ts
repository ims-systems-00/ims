import type { SetupStepDefinition } from "./types";

/**
 * Get-set-up checklist — ported from assets/setupux/setup-steps.json.
 *
 * Interactive steps: org → alice (all nine). Remote + Alice are the last two.
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
          seed: "repository-create",
          advanceOn: "docs.repo.created",
        },
        {
          label: "Upload your files with purpose and applicable modules",
          target: "[data-tour='docs.upload']",
          spotLabel: "Upload",
          seed: "repository",
        },
        {
          label: "Confirm owners, review dates and authorisation",
          target: "[data-tour='docs.upload']",
          spotLabel: "Finish the upload",
          spotLabelAbove: true,
          seed: "repository",
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
          target: "[data-tour='docs.compliance.tab']",
          spotLabel: "Document opened — go to Compliance Settings",
          seed: "document",
          advanceOn: "docs.compliance.tab-opened",
        },
        {
          label: "Go to Compliance Settings",
          target: "[data-tour='docs.compliance.tab']",
          spotLabel: "Compliance Settings",
          seed: "document",
          seedTab: "compliance-settings",
        },
        {
          label: "Select the standards and clauses it supports",
          target: "[data-tour='docs.compliance.panel']",
          spotLabel: "Pick clauses",
          seed: "document",
          seedTab: "compliance-settings",
        },
        {
          label: "Save",
          target: "[data-tour='docs.compliance.panel']",
          spotLabel: "Link evidence",
          spotLabelAbove: true,
          seed: "document",
          seedTab: "compliance-settings",
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
          target: "[data-tour='soa.control.selected']",
          spotLabel: "Clause opened — select it",
          seed: "control",
          advanceOn: "soa.control.opened",
        },
        {
          label: "Select it (or justify why not)",
          target: "[data-tour='soa.control.selected']",
          spotLabel: "Select the control",
          seed: "control",
        },
        {
          label: "Set the status",
          target: "[data-tour='soa.control.state']",
          spotLabel: "Set status",
          seed: "control",
          advanceOn: "soa.control.status-updated",
        },
        {
          label: "Attach evidence",
          target: "[data-tour='soa.control.evidence']",
          spotLabel: "Attach evidence",
          spotLabelAbove: true,
          seed: "control",
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
          seed: "risk",
          advanceOn: "risks.analyse-opened",
        },
        {
          label: "Save Alice's response as the treatment",
          target: "[data-tour='risks.sheet']",
          spotLabel: "Save the treatment",
          spotLabelAbove: true,
          seed: "risk",
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
    status: "available",
    requiredPermission: "audits:read",
    route: "/audits/internal",
    completeOn: "audits.plan.saved",
    guide: {
      text: "Schedule the audit programme once. The interval creates the series; Alice drafts the plan.",
      subs: [
        {
          label: "Open Audits › Internal › Schedule audit",
          target: "[data-tour='audits.create']",
          spotLabel: "Schedule audit",
          route: "/audits/internal",
          advanceOn: "audits.create-opened",
        },
        {
          label: "Title, focus area, business unit, compliance body",
          target: "[data-tour='audits.field.title']",
          spotLabel: "Describe the audit",
          route: "/audits/internal?create=1",
        },
        {
          label: "Auditor, date, time",
          target: "[data-tour='audits.field.auditor']",
          spotLabel: "Set auditor and date",
          route: "/audits/internal?create=1",
        },
        {
          label: "Set the interval",
          target: "[data-tour='audits.field.interval']",
          spotLabel: "Set the interval",
          route: "/audits/internal?create=1",
          advanceOn: "audits.scheduled",
        },
        {
          label: "Click Assist & Verification for the plan",
          target: "[data-tour='audits.assist']",
          spotLabel: "Draft the plan with Alice",
          spotLabelAbove: true,
          seed: "audit",
          advanceOn: "audits.plan.saved",
        },
      ],
    },
  },
  {
    id: "review",
    title: "Management review on autopilot",
    summary: "Series, attendees, agenda, minutes, actions",
    estimate: "5 min",
    aliceCapable: true,
    status: "available",
    requiredPermission: "management-reviews:read",
    route: "/management-reviews",
    completeOn: "reviews.scheduled",
    guide: {
      text: "Schedule the management review series with attendees. Agenda, minutes and actions attach to each meeting.",
      subs: [
        {
          label: "Open Reviews › Schedule review",
          target: "[data-tour='reviews.create']",
          spotLabel: "Schedule review",
          route: "/management-reviews",
          advanceOn: "reviews.create-opened",
        },
        {
          label: "Title and privacy",
          target: "[data-tour='reviews.field.title']",
          spotLabel: "Title and privacy",
          route: "/management-reviews?create=1",
        },
        {
          label: "Date, time and interval",
          target: "[data-tour='reviews.field.date']",
          spotLabel: "Set the schedule",
          route: "/management-reviews?create=1",
        },
        {
          label: "Tick the attendees",
          target: "[data-tour='reviews.field.attendees']",
          spotLabel: "Tick attendees",
          route: "/management-reviews?create=1",
        },
        {
          label: "Schedule",
          target: "[data-tour='reviews.sheet']",
          spotLabel: "Schedule the series",
          spotLabelAbove: true,
          advanceOn: "reviews.scheduled",
        },
      ],
    },
  },
  {
    id: "remote",
    title: "Remote audit ready",
    summary:
      "Invite your lead auditor: read-only login, live evidence, no exports",
    estimate: "5 min",
    aliceCapable: true,
    status: "available",
    requiredPermission: "functional-units:read",
    route: "/functional-units",
    completeOn: "remote.auditor.invited",
    guide: {
      text: "Make the organisation remote-audit ready: your certification body becomes an external compliance function and your lead auditor gets a read-only login.",
      subs: [
        {
          label: "Organisation › Functional Units › Create a function",
          target: "[data-tour='org.fu.create']",
          spotLabel: "Create a function",
          route: "/functional-units",
          advanceOn: "org.fu.create-opened",
        },
        {
          label: "Access type: External compliance function",
          target: "[data-tour='org.fu.field.access-type']",
          spotLabel: "Pick External compliance",
          route: "/functional-units?create=1",
        },
        {
          label: "Name the certification body and standards",
          target: "[data-tour='org.fu.field.standards']",
          spotLabel: "Name body and standards",
          route: "/functional-units?create=1",
          advanceOn: "remote.fu.created",
        },
        {
          label: "Users › Add user › External Auditor",
          target: "[data-tour='org.users.add']",
          spotLabel: "Invite External Auditor",
          route: "/users?invite=1",
          advanceOn: "org.users.invite-opened",
        },
        {
          label: "Send the invitation",
          target: "[data-tour='org.users.invite.send']",
          spotLabel: "Send invitation",
          spotLabelAbove: true,
          route: "/users?invite=1",
          advanceOn: "remote.auditor.invited",
        },
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
    status: "available",
    route: "/",
    completeOn: "alice.pinned",
    guide: {
      text: "Ask Alice your first question. From now on she reviews your data daily and tells you what needs attention.",
      subs: [
        {
          label: "Open Alice (bottom right)",
          target: "[data-tour='alice.fab']",
          spotLabel: "Open Alice",
          route: "/",
          advanceOn: "alice.opened",
        },
        {
          label: "Ask “What needs attention this week?”",
          target: "[data-tour='alice.monday']",
          spotLabel: "Ask the Monday question",
          advanceOn: "alice.asked",
        },
        {
          label: "Open one of the records she links",
          target: "[data-tour='alice.panel']",
          spotLabel: "Open a linked record",
          advanceOn: "alice.record.opened",
        },
        {
          label: "Pin the Monday question",
          target: "[data-tour='alice.pin-monday']",
          spotLabel: "Pin as Monday question",
          spotLabelAbove: true,
          advanceOn: "alice.pinned",
        },
      ],
    },
  },
];

/** Starter prompt for the Alice proactive setup step. */
export const ALICE_MONDAY_QUESTION = "What needs attention this week?";

const BY_ID = new Map(SETUP_STEPS.map((step) => [step.id, step]));

export function getSetupStep(stepId: string): SetupStepDefinition | undefined {
  return BY_ID.get(stepId);
}

export function listAvailableSteps(): SetupStepDefinition[] {
  return SETUP_STEPS.filter((step) => step.status === "available");
}
