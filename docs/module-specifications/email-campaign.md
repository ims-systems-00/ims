# Email Campaign

## 1. Module Overview

Email Campaign is the CRM module for creating, targeting, sending, and tracking bulk email communications to customers within a business unit.

Its primary business purpose is to let users compose a campaign (name, subject, message, attachments), define the audience by customer pipeline stage and/or individually selected customers, launch the campaign to those customers’ primary and secondary contact emails, and review who was reached after sending.

It solves the problem of manual customer outreach by centralising campaign content, audience selection, queued email delivery, recipient logging, and basic reach metrics—linked to the Customer register for targeting.

Primary users are people with CRM licence and access—typically users with CRM create/read/update/delete permissions. Campaign list visibility is organisation-scoped with role-based business-unit filtering. Exact role-to-permission mapping for every action: **Unclear — requires confirmation** (see Miscellaneous).

---

## 2. Features and Capabilities

### Create a campaign (draft)

- **Capability:** Create a campaign with name, business unit, target audience (customer stages), additional audience (specific customers), subject, message body, and attachments.
- **Who uses it:** Users with CRM create permission (Add button).
- **Outcome:** A new campaign is stored with reference `EC-{number}`, status **Draft**, sender set from organisation office email, and a new **bundle** ID (first instance in a campaign series).
- **Conditions:** At least one of target audience or additional audience required in UI. Campaign name cannot be changed after creation (disabled on edit form).

### Launch a campaign (create and send)

- **Capability:** Create a campaign and immediately queue it for sending in one action.
- **Who uses it:** Users from create drawer (“Launch campaign” button).
- **Outcome:** Campaign created, status moves to **Queued**, background job processes customer matching and sends emails. User sees confirmation before launch.
- **Conditions:** Same audience requirements as draft create. Confirmation: “A campaign will be launched”.

### View, search, and open campaigns

- **Capability:** Browse a paginated list of campaigns; search by reference; open in detail drawer or full detail page.
- **Who uses it:** Users with CRM read access.
- **Outcome:** Users see reference, business unit, subject, target stages, status badge (Draft / Queued / Sent), created date, creator, and actions.
- **Conditions:** List is organisation-scoped with role-based business-unit filter.

### View campaign details

- **Capability:** See campaign metadata, subject, message, attachments, additional audience list, and (after send) recipients.
- **Who uses it:** Users opening drawer or full detail page.
- **Outcome:** Overview sidebar (reference, business unit, creator, target, status); details tab with subject, message, attachments; recipients tab with contact names and emails plus reach counts.
- **Conditions:** Recipients tab populated only after delivery records exist (post-send). Overview metrics loaded on open.

### Update and re-launch a campaign

- **Capability:** Edit campaign content and audience; either save as a new campaign instance in the same bundle, or update and launch the current record.
- **Who uses it:** Users with CRM create permission on edit form.
- **Outcome:** **Save modified campaign** creates a new campaign record sharing the same bundle (new reference). **Launch modified campaign** updates the existing record via PUT then queues send. Confirmations differ for Draft vs already-sent campaigns.
- **Conditions:** Name remains fixed. “Launch modified campaign” disabled without audience selection.

### Close a campaign

- **Capability:** Mark all campaign instances in a bundle as closed.
- **Who uses it:** Users from edit form (“Close campaign” button) on existing campaigns.
- **Outcome:** All records sharing the bundle ID get `closed: true`. User notified of success.
- **Conditions:** Confirmation: “This campaign will be closed”. **Reopen not implemented.**

### Delete a campaign

- **Capability:** Remove a campaign record.
- **Who uses it:** Users with CRM delete permission from row actions.
- **Outcome:** Campaign permanently deleted from list.
- **Conditions:** UI only allows delete when status is not **Sent**. Backend has no status check. Delivery records may remain orphaned — **requires confirmation**.

### Review recipients and campaign reach

- **Capability:** After sending, view recipient names and emails grouped by delivery batch; see customer reach and total recipient counts.
- **Who uses it:** Users on Recipients tab (drawer or detail page).
- **Outcome:** Cards per recipient (name + email); header shows “Customer reach {totalCustomers}” and “Total recipients {totalRecipients}”; paginated “View more” for additional batches.
- **Conditions:** Recipients derived from delivery records created during send—not pre-send preview.

---

## 3. User Outcomes / End Results

- **Create:** Email campaigns with content, attachments, business-unit scope, and customer audience definition.
- **View:** Campaign list with status, detail drawer/page, post-send recipient list, and reach counts.
- **Manage:** Save drafts, launch sends, save modified versions (new reference in bundle), update-and-launch, close bundle, delete (non-sent in UI).
- **Change:** Subject, body, attachments, business unit, target stages, and additional audience (on edit); not campaign name after creation.
- **Information received:** Confirmation dialogs before launch/close/save-modified; success notifications; recipient list and overview counts after send.
- **Business actions enabled:** Bulk email outreach to CRM customers by pipeline stage or hand-picked list; track who was emailed. **No open/click/bounce analytics.**

---

## 4. Scope Boundaries

### In scope

- Email Campaign register at `/admin/email-campaign` under CRM sidebar.
- Campaign CRUD, launch/send, close bundle, recipient listing, overview counts.
- Customer-based audience selection (stages + individual customers).
- Queued background delivery via customer contact emails.
- Campaign delivery batch records for recipient audit.

### Out of scope (handled elsewhere)

- **Customer master data** — audience sourced from Customer Management module.
- **Organisation email configuration** — office email (from), campaign reply-to email on organisation record.
- **SendGrid / mail infrastructure** — delivery mechanism; only business outcome documented here.
- **Email marketing analytics** — no open rate, click rate, bounce tracking in UI or overview API.
- **Scheduling future send times** — route named `/schedule` but sends immediately to queue; no date/time picker.
- **User or internal-staff recipients** — only customer primary/secondary contacts.
- **Invoice or other CRM submodules** — separate features under CRM.

---

## 5. Linked Modules

| Linked Module | Business relationship |
| ------------- | --------------------- |
| Customer Management | Recipients are customers matched by business unit, pipeline stage (`target`), and/or `customAudience` selection; contact names and emails used for delivery. |
| CRM (parent) | Email Campaign is a submodule under CRM navigation alongside Customers and Invoices. |
| Organisation | Supplies sender name/email (`officeEmail`) and campaign reply-to (`campaignEmail`). |
| Dashboard / MY CRM analytics | Account manager overview includes campaign counts (active/closed, monthly trend)—read-only aggregate, not campaign management UI. |
| Notifications | **No campaign-specific user notifications identified** beyond email delivery to customers. |

---

## 6. Current Data Model

| Entity / record | Business meaning | Role in this module |
| --------------- | ---------------- | ------------------- |
| Email Campaign | A bulk email communication to customers | Primary record |
| Bundle | Groups related campaign instances (versions) | Shared ID across save-modified copies |
| Target audience | Customer pipeline stages to include | Stage-based recipient selection |
| Additional audience (customAudience) | Explicitly selected customers | Adds specific customers beyond stage filter |
| Campaign delivery batch | A chunk of recipients emailed in one processing step | Post-send recipient audit |
| Recipient (in delivery) | Name + email pair emailed | Primary or secondary customer contact |

---

## 7. Attributes

| Attribute | Business meaning | Notes |
| --------- | ---------------- | ----- |
| Reference | User-facing identifier | `EC-{number}` |
| Campaign name | Internal campaign label | Fixed after creation in UI |
| Business unit (group) | Which unit’s customers are targeted | Required for customer query at send |
| Target audience | Customer stages: Prospect, Warm lead, Qualified, Proposal, Live | Multi-select; OR match at send |
| Additional audience | Specific customer records | Multi-select; searchable; OR match at send |
| Subject | Email subject line | Required |
| Message (body) | Email body text | Required; template greets “Dear [contact name]” separately |
| Attachments | Files attached to outbound emails | Add on create; append on PUT update |
| Status | Draft / Queued / Sent | Default Draft; Queued on send; Sent after last delivery chunk |
| Closed | Whether campaign bundle is closed | Boolean; set on all bundle members via close action |
| Root campaign | Whether first instance in bundle | True when no bundle passed on create |
| Sent from | Organisation name and office email | Auto-set from organisation on create |
| Launched at | When send completed | Set when status becomes Sent |
| Total customers | Count of customer records processed | Incremented per send chunk |
| Created (by, on) | Who created and when | Shown in list and detail |
| Bundle ID | Links campaign versions | UUID; passed when saving modified copy |

**Recipient delivery record:** campaign link, recipients array (name, email), total count per batch.

---

## 8. Current UI Layout

### Main screens / pages

- **Email campaigns list** — `/admin/email-campaign`, sidebar CRM → **Email Campaign**.
- **Campaign detail page** — `/admin/email-campaign/:id` (hidden from sidebar).

### Important sections and views

**List page:** Search, Add button, data table (Reference, Business unit, Subject, Target, Status, Created on, Created by, Actions), pagination. Row click opens detail drawer.

**Detail drawer tabs:** Overview | Details | Recipients.

**Full detail page panels:** Details | Recipients (horizontal panels).

**Overview sidebar:** Reference, business unit, raised by, target stages, status (Draft red / Sent green).

**Details content:** Additional audience table (reference + customer name); subject; message; attachments.

**Recipients tab:** Customer reach + total recipients counts; recipient cards (name, email); View more pagination.

### Primary actions

- Add campaign (create drawer).
- Launch campaign / Save (create drawer).
- Row click → drawer; row menu → full detail or Delete (non-sent).
- Edit (drawer pencil → edit drawer form).
- Save modified campaign / Launch modified campaign / Close campaign (edit form).
- View more recipients (post-send).

### Forms

**Campaign create/edit:** Campaign name (create only), Business unit, Target audience (multi), Additional audience (multi, customer search), Subject, Message (textarea with user mentions), Attachments dropzone. Buttons: Launch campaign + Save (create); Launch modified campaign + Save modified campaign + Close campaign (edit).

### Navigation and workflow

```
CRM → Email Campaign → list
  → Add → create drawer
      → Save → Draft campaign
      → Launch campaign → confirm → Queued → Sent (background)
  → Row click → drawer (Overview / Details / Recipients)
  → Edit drawer → modify → Save modified (new EC reference, same bundle)
                    OR Launch modified (update + send same record)
                    OR Close campaign (entire bundle)
  → Delete (row menu, status ≠ Sent)
```

### Material empty, loading, or restricted states

- Loading on list and detail fetch.
- Empty table: “No data found”.
- Detail error: “This campaign has been deleted or removed”.
- Recipients tab empty until delivery records exist.
- Delete hidden for Sent campaigns.
- Create gated by CRM CREATE; edit/switch view gated by CRM CREATE on detail.
- Launch/Save disabled when no target and no additional audience selected.

---

## 9. Miscellaneous / Module-Specific Information

### Terminology

- **Launch** — queue campaign for immediate background send (not a future schedule despite API path `/schedule`).
- **Bundle** — groups campaign versions; closing affects all instances sharing a bundle ID.
- **Target audience** — customer **stage** filter, not arbitrary user groups.
- **Customer reach** (overview) — `totalCustomers` on campaign (customer records processed).
- **Total recipients** (overview) — sum of delivery batch totals (individual email addresses, including primary + secondary per customer).

### Campaign lifecycle (confirmed states)

| State | Meaning | How entered | Allowed actions (UI) |
| ----- | ------- | ----------- | ---------------------- |
| **Draft** | Created, not sent | Save on create | Edit, launch, delete |
| **Queued** | Send job processing | Launch / send action | Edit (limited); delete blocked in UI once Sent only—Queued delete **may** still work in UI |
| **Sent** | Delivery completed | Background job finishes last chunk | View recipients; save modified creates new instance; delete blocked in UI |
| **Closed** (flag) | Bundle marked inactive | Close campaign action | **Reopen not available**; edit form still accessible — **requires confirmation** if editing blocked |

There is no separate “Scheduled”, “Failed”, or “Active/Inactive” status enum value.

### What sending a campaign does (business outcome)

1. User confirms launch.
2. Campaign status → **Queued**; job queued.
3. System finds customers in the campaign’s business unit where stage matches target **OR** customer is in additional audience.
4. For each customer, primary contact/email and secondary contact/email (if present) become recipients.
5. Emails sent using organisation branding template: campaign name as heading, personalised greeting with recipient name, message body, signature, attachments.
6. Reply-to set to organisation **campaign email**; sent via configured mail service (SendGrid).
7. Delivery batches recorded with recipient names/emails.
8. When final chunk completes: status → **Sent**, `launchedAt` set, temporary attachment files cleaned up.

**No engagement tracking** (opens, clicks, bounces) is stored or displayed.

### Campaign overview (`getCampaignOverView`)

Returns two counts only:

- **totalCustomers** — from campaign record (customers processed during send)
- **totalRecipients** — aggregated sum of delivery batch totals

Displayed in Recipients tab header. No charts, rates, or per-status breakdown in campaign detail UI.

### Closing a campaign

Sets `closed: true` on **all campaigns sharing the bundle ID** via `updateMany`. Does not delete records or stop in-flight sends. Closed state is **not prominently displayed** in overview sidebar (only Draft/Sent status shown). **Cannot reopen** through UI or API.

### Important business rules (observed)

- Audience rule at send: customers in selected business unit AND (stage in target OR id in customAudience).
- At least one audience selector required in UI before save/launch.
- “Save modified campaign” creates a **new** campaign (POST) with existing bundle—not an in-place update.
- “Launch modified campaign” updates in place (PUT) then sends same ID.
- Backend PUT update does **not** change `name` or `customAudience` — **requires confirmation** if UI sends them on launch-modified path.
- Delete removes campaign record only; delivery history may remain.

### Frontend vs backend discrepancies (requires confirmation)

| Topic | Frontend | Backend | Conclusion |
| ----- | -------- | ------- | ---------- |
| Save modified | POST create with bundle | Works as new instance | By design (versioning) |
| Launch modified | PUT then send | PUT ignores customAudience/name | Audience changes on launch-modified may not persist |
| Delete | Blocked when Sent | No status check | UI narrower than backend |
| Recipients pagination | Uses `toolState` from store | Store exports `queryHandlers` | `toolState` undefined — View more may fail |
| Additional audience display | Checks `customAudience.lenght` (typo) | N/A | Table may never show despite data |
| Detail route screenIdentifier | `customer-detail` | N/A | Possible copy-paste error |
| Overview Queued status | Badge in list | Exists in enum | Sidebar overview omits Queued styling |
| campaignOverview | Displays totalCustomers/Recipients | totalCustomers from campaign doc | Count semantics differ (customers vs emails) |

### Unclear or incomplete behavior

- Whether Queued campaigns can be deleted from UI (delete only checks ≠ Sent).
- Whether closed campaigns should restrict edit/launch (flag exists but UI does not gate).
- Fate of `campaigndeliveries` records when campaign deleted.
- Whether failed mail chunks leave campaign stuck in Queued vs Sent.
