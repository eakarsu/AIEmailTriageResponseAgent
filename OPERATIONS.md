# Operations

1. Run `scripts/bootstrap.sh`, replace every placeholder in `.env`, then run `scripts/migrate.sh`.
2. Provision mailbox operators/reviewers and run `./start.sh`; reminder jobs are disabled unless explicitly enabled.
3. Demo data is opt-in: `CONFIRM_DEMO_SEED=yes scripts/seed-demo.sh` outside production only.

Use `/api/governed-triage`. Inbound content is untrusted, prompt-injection scanned, and secret-like text redacted. Drafts require an independent reviewer before entering `email_send_outbox`; this repository does not claim delivery. Production requires credentialed mailbox/calendar/CRM/ticketing/knowledge adapters and labeled-mail evaluations.
