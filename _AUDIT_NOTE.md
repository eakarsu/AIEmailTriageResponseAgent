# Audit Notes — AIEmailTriageResponseAgent

Audit source: `_AUDIT/reports/batch_03.md` § 11 (template-clone, audit reported 0 AI endpoints).

## Original audit recommendations

### Missing AI counterparts
- `/email-classify`, `/priority-score`, `/response-draft`, `/spam-detect`,
  `/meeting-extraction`, `/follow-up-suggest`, `/subject-optimize`,
  `/template-suggest`.

### Missing non-AI features
- IMAP / SMTP / OAuth provider integration.
- Real-time sync.
- Search.
- Batch operations.
- Scheduled send.

### Custom feature suggestions
- Agentic vacation inbox.
- Sales sequencing.
- Customer-support routing.
- Daily executive summary.
- Real-time grammar/tone assistant.
- Natural-language meeting scheduling.
- Email-to-CRM sync.

## Current state observed

Audit's "0 AI endpoints" outdated. The codebase wires `aiService.js`
(`categorizeEmail`, `prioritizeEmail`, `analyzeEmailSentiment`,
`extractActionItems`, `summarizeEmail`, `callOpenRouter`) into emails,
emailPriorities, followups, drafts, priorityScores, meetings,
subjectOptimizations, spamAnalysis, templateSuggestions, and aiNew
(`async-process`, `smart-reply`, `email-coaching`). Each "missing AI counterpart"
has at least a corresponding route file.

## Implementations applied this pass

None — adding more endpoints would duplicate existing per-resource AI handlers.

## Prioritized backlog

1. **MECHANICAL** — Add `/api/ai/inbox-digest` endpoint summarizing the
   user's most important unread emails using existing `summarizeEmail`.
2. **MECHANICAL** — Add `/api/ai/sales-sequence` taking `{ contact_id, goal }`
   and returning a 3-touch follow-up sequence.
3. **NEEDS-CREDS** — IMAP / SMTP / Gmail / Outlook OAuth provider
   integration is the real blocker (no AI gap is binding without inbound
   email).
4. **NEEDS-PRODUCT-DECISION** — CRM sync needs a target CRM (Salesforce,
   HubSpot, Pipedrive) and per-tenant mapping.
5. **TOO-RISKY** — Auto-replying ("vacation agent") without explicit user
   approval can leak data; needs explicit-approval UX.

## Apply pass 3 (frontend)

Action: **LEFT-AS-IS**. The Vite/React/Tailwind frontend already has 7
dedicated AI feature pages (`PriorityScorer`, `MeetingExtractor`,
`FollowupReminder`, `TemplateSuggester`, `SpamIntelligence`,
`EmailPrioritizer`, `SubjectOptimizer`) wired in `App.jsx`, plus the
existing `Emails`/`Drafts` pages call the per-resource AI handlers. FE
already wired to backend AI endpoints; no changes needed.

## Apply pass 4 (mechanical backlog)

Action: **IMPLEMENTED** the two MECHANICAL backlog items.

Backend (`backend/src/routes/aiNew.js`):
1. `POST /api/ai/inbox-digest` — fetches the user's most important
   unread emails (`status='unread'`, ordered by priority/recency,
   capped at 25), summarises each via existing `summarizeEmail`, then
   asks the LLM for a top-level briefing. Body: `{ limit }`. Returns
   503 with a friendly message when `OPENROUTER_API_KEY` is missing.
2. `POST /api/ai/sales-sequence` — loads a contact and returns a
   3-touch follow-up email sequence (initial / day-3 / day-7). Body:
   `{ contact_id, goal, product?, tone? }`. Reuses existing
   `callOpenRouter` + `cleanJsonResponse`. Same 503 handling.

Both routes mounted at `/api/ai` (existing `aiNewRoutes` mount), use
`authenticateToken` + `aiRateLimiter`. No new dependencies.

Frontend:
- New `frontend/src/pages/AIAdvanced.jsx` with a tabbed UI surfacing
  both endpoints. Uses Tailwind + lucide-react (already in deps),
  attaches the JWT bearer from `localStorage`, shows a 503/error
  banner. Contact dropdown loaded via the existing `getContacts`
  helper.
- Wired in `frontend/src/App.jsx` at `/ai-advanced`.
- Added to AI Features section in `frontend/src/components/Layout.jsx`.

Syntax check: `node --check` and babel JSX parse PASS for all touched
files. Smoke test: started backend on port 3501, logged in as
`demo@example.com / demo123`, both endpoints returned valid LLM JSON.

Backlog (still not implemented): IMAP/SMTP/OAuth provider integration
(NEEDS-CREDS), CRM sync (NEEDS-PRODUCT-DECISION), agentic vacation
auto-reply (TOO-RISKY).

## Apply pass 5 (all backlog)

Action: **IMPLEMENTED** four additional endpoints, one per category.
File touched: `backend/src/routes/aiNew.js` (additive only).

1. `POST /api/ai/executive-daily-summary` — **MECHANICAL**. Audit's
   "Daily executive summary" suggestion. Pulls last 24h (or a `date=`)
   inbox, asks LLM for chief-of-staff briefing JSON. 503 +
   `missing: OPENROUTER_API_KEY` when unset.
2. `POST /api/ai/grammar-tone-assistant` — **MECHANICAL**. Audit's
   "Real-time grammar/tone assistant". Returns grammar score, issues,
   tone match, improved rewrite.
3. `POST /api/ai/customer-support-routing` — **MECHANICAL**. Routes a
   support email to one of N queues with SLA.
   `// PRODUCT-DECISION:` default 6-queue taxonomy used when caller
   omits `queues`; production should load from settings/ticket-system.
4. `POST /api/ai/crm-sync` — **NEEDS-CREDS**. Documents env vars
   `CRM_API_KEY`, `CRM_PROVIDER`, `CRM_BASE_URL`. Returns 503 +
   `missing: <unset>` until all are set. When set, enqueues into a new
   additive `crm_sync_log` table (`CREATE TABLE IF NOT EXISTS`); the
   vendor adapter is intentionally not wired.

Syntax: `node --check src/routes/aiNew.js` PASS. Smoke test: started
backend on port 3618 (port 3001 was held by parallel agents), logged in
as `demo@example.com / demo123`, `/api/ai/crm-sync` returned 503 with
`missing: CRM_API_KEY,CRM_PROVIDER,CRM_BASE_URL`, `/api/ai/grammar-tone-assistant`
returned a valid JSON rewrite.

Backlog still untouched: IMAP/SMTP/OAuth provider integration
(NEEDS-CREDS — large), agentic vacation auto-reply (TOO-RISKY — needs
explicit-approval UX), real CRM vendor adapter (depends on chosen
provider).
