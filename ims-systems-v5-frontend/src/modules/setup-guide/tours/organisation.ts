import type { TourDefinition } from "../types";

/**
 * Organisation setup — business units, users, premises.
 *
 * Journey-demo chapter 1 ("Build the organisation so everything rolls up"),
 * retold on the real V5 screens. Each point targets a `data-tour` hook in the
 * Functional Units, Users / Invitations and Business Premises modules.
 */
export const organisationTour: TourDefinition = {
  id: "organisation",
  title: "Organisation",
  description:
    "Create business units, invite users with the right role and register your sites.",
  requiredPermission: "functional-units:read",
  chapters: [
    {
      id: "units",
      name: "Business units",
      route: "/functional-units",
      title: "Build the organisation so everything rolls up",
      body: "Start with your business units — a department, a site, or a whole business in a group. Users, premises, assets, risks and audits all belong to a unit, and every report and dashboard rolls up from here.",
      points: [
        {
          id: "register",
          kind: "explain",
          target: "[data-tour='org.fu.register']",
          placement: "top",
          title: "The Functional Units register",
          body: "Every unit in the organisation is listed here with its type, what it is responsible for and how many members it has. Open a row to see its details and members.",
        },
        {
          id: "open-create",
          kind: "action",
          target: "[data-tour='org.fu.create']",
          placement: "bottom",
          title: "Add a unit",
          body: "New units are created from this button. It opens a short form on the right.",
          waitFor: "org.fu.create-opened",
          actionHint: "Click “Create a function”.",
          missingHint:
            "The “Create a function” button is not on this page. You may not have permission to create units.",
        },
        {
          id: "access-type",
          kind: "explain",
          route: "/functional-units?create=1",
          target: "[data-tour='org.fu.field.access-type']",
          placement: "left",
          title: "Access type",
          body: "Internal business function is for your own teams or subsidiaries. The internal and external compliance functions are for auditors. External function is for anyone else. Choose carefully — it cannot be changed after the unit is created.",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
        {
          id: "name",
          kind: "explain",
          route: "/functional-units?create=1",
          target: "[data-tour='org.fu.field.name']",
          placement: "left",
          title: "Name",
          body: "Name the department, site or business as people in the organisation know it. Each unit holds its own users, assets, risks and audits and feeds the organisation view.",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
        {
          id: "responsibility",
          kind: "explain",
          route: "/functional-units?create=1",
          target: "[data-tour='org.fu.field.responsibility']",
          placement: "left",
          title: "Responsibility",
          body: "Say in a sentence or two what this unit is accountable for. It appears in the register, so anyone can see who owns what.",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
        {
          id: "submit",
          kind: "explain",
          route: "/functional-units?create=1",
          target: "[data-tour='org.fu.submit']",
          placement: "top",
          title: "Create",
          body: "Create saves the unit and adds it to the register; users and premises are added to it next. Fill in the form and press Create to save it now — the guide carries on by itself — or press Next to continue without saving.",
          advanceOn: "org.fu.created",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
      ],
    },
    {
      id: "users",
      name: "Users",
      route: "/users",
      title: "Invite people with the right role",
      body: "People join the organisation by invitation. You choose their role when you invite them; they become members as soon as they accept.",
      points: [
        {
          id: "tabs",
          kind: "explain",
          target: "[data-tour='org.users.tabs']",
          placement: "bottom",
          title: "Members and invitations",
          body: "All Users lists everyone with active access. Invitations shows who has been invited but has not accepted yet — you can resend or remove an invitation there.",
        },
        {
          id: "open-invite",
          kind: "action",
          target: "[data-tour='org.users.add']",
          placement: "bottom",
          title: "Add a user",
          body: "Users are never created directly. This button opens the invitation form.",
          waitFor: "org.users.invite-opened",
          actionHint: "Click “Add user”.",
          missingHint:
            "The “Add user” button is not on this page. You may not have permission to invite users.",
        },
        {
          id: "invite-email",
          kind: "explain",
          route: "/users?invite=1",
          target: "[data-tour='org.users.invite.email']",
          placement: "auto",
          title: "Invite by email",
          body: "Enter the person’s work email. They receive a link and join the organisation once they accept it.",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
        {
          id: "invite-role",
          kind: "explain",
          route: "/users?invite=1",
          target: "[data-tour='org.users.invite.role']",
          placement: "auto",
          title: "Pick the right role",
          body: "The role decides what they can do: Super Admin has full access including settings and billing, Head of Service manages services and teams, Basic User is a standard member, the auditor roles are read-focused, and External User is for outside collaborators. The line under the field describes the role you have selected.",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
        {
          id: "invite-send",
          kind: "explain",
          route: "/users?invite=1",
          target: "[data-tour='org.users.invite.send']",
          placement: "auto",
          title: "Send the invitation",
          body: "Send invitation emails the person straight away and lists them under Invitations until they accept. Only send it if you mean to — press Next to continue without inviting anyone.",
          advanceOn: "org.users.invited",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
      ],
    },
    {
      id: "premises",
      name: "Premises",
      route: "/business-premises",
      title: "Register the sites you operate from",
      body: "Business Premises are your physical sites — offices, plants, warehouses. Each one is linked to the business units that work there.",
      points: [
        {
          id: "open-create",
          kind: "action",
          target: "[data-tour='org.premises.create']",
          placement: "bottom",
          title: "Add a premise",
          body: "Sites are registered from this button. It opens a form on the right.",
          waitFor: "org.premises.create-opened",
          actionHint: "Click “Create premise”.",
          missingHint:
            "The “Create premise” button is not on this page. You may not have permission to create premises.",
        },
        {
          id: "site-details",
          kind: "explain",
          route: "/business-premises?create=1",
          target: "[data-tour='org.premises.site-details']",
          placement: "left",
          title: "Site details",
          body: "Give the site a name, the location people know it by, and its full address.",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
        {
          id: "linked-units",
          kind: "explain",
          route: "/business-premises?create=1",
          target: "[data-tour='org.premises.units']",
          placement: "left",
          title: "Linked units",
          body: "Tick the units that operate from this site. Only Internal business function units can be linked, which is why the units come first.",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
        {
          id: "submit",
          kind: "explain",
          route: "/business-premises?create=1",
          target: "[data-tour='org.premises.submit']",
          placement: "top",
          title: "Create",
          body: "Create adds the site to the register. Press Create to save it now, or Next to finish the guide without saving.",
          advanceOn: "org.premises.created",
          missingHint:
            "The form did not open. Use Try again, or go Back and open it from the button.",
        },
      ],
    },
  ],
  outro: {
    title: "Your organisation is taking shape",
    body: "Units, people and sites are the structure everything else hangs from. Add the rest of yours whenever you are ready — this guide stays under the help icon in the top bar.",
  },
};
