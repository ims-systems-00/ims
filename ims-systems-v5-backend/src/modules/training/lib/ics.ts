import type { TrainingCompetency, TrainingPerson, TrainingSession } from "../types";

function escT(x: string): string {
  return String(x || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcs(input: {
  session: TrainingSession;
  competency: TrainingCompetency | undefined;
  orgName: string;
  domain?: string;
  person?: TrainingPerson;
  organiserEmail?: string;
}): string {
  const { session: s, competency: c, orgName } = input;
  const domain = input.domain || "ims-os";
  const organiserEmail = input.organiserEmail || "training@ims-os.example";
  const d = s.date.replace(/-/g, "");
  const t = (s.time || "09:00").replace(":", "");
  const start = d + "T" + t + "00";
  const dur = s.duration || 60;
  const e = new Date(
    Date.UTC(
      +s.date.slice(0, 4),
      +s.date.slice(5, 7) - 1,
      +s.date.slice(8, 10),
      +(s.time || "09:00").slice(0, 2),
      +(s.time || "09:00").slice(3, 5) + dur
    )
  );
  const end = e.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const person = input.person;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//iMS OS//Training//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${s.id}@${domain}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escT((c ? c.name : "Training") + " · " + (orgName || ""))}`,
    `LOCATION:${escT(s.location)}`,
    `ORGANIZER;CN=${escT(orgName || "iMS OS")}:mailto:${organiserEmail}`,
    ...(person?.email
      ? [
          `ATTENDEE;CN=${escT(person.name)};ROLE=REQ-PARTICIPANT;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${person.email}`,
        ]
      : []),
    `DESCRIPTION:${escT(
      (s.provider ? "Provider: " + s.provider + "\n" : "") + (s.note || "")
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
