// ============================================================
// === Custom Views API ===
// Provides data endpoints powering 4 custom UI features:
//   1. InboxKanban       - emails grouped by triage category
//   2. ResponseHeatmap   - 7x24 grid of avg response times
//   3. TriageRulesEditor - CRUD for triage rules
//   4. AutoReplyBuilder  - CRUD for auto-reply templates
// In-memory persistence (seeded on first request) to remain
// self-contained even if other tables are not migrated.
// ============================================================
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ---------------- In-memory stores ----------------
const CATEGORIES = ['urgent', 'informational', 'sales', 'spam'];

const seededAt = new Date();
const ISO = (offsetMinutes = 0) =>
  new Date(seededAt.getTime() - offsetMinutes * 60 * 1000).toISOString();

const inboxEmails = [
  // urgent
  { id: 'e-001', from: 'cto@bigcorp.com',     subject: 'PRODUCTION OUTAGE — needs immediate response', preview: 'Our checkout is down, customers cannot place orders.', category: 'urgent',        received_at: ISO(5),   priority: 'high'   },
  { id: 'e-002', from: 'legal@partner.io',    subject: 'Signed contract requires counter-signature today', preview: 'Please review and counter-sign the attached MSA.', category: 'urgent',        received_at: ISO(40),  priority: 'high'   },
  { id: 'e-003', from: 'oncall@infra.io',     subject: 'PagerDuty: api-gateway 5xx spike', preview: 'Latency >2s, error rate 9%.',                     category: 'urgent',        received_at: ISO(90),  priority: 'high'   },
  { id: 'e-004', from: 'ceo@company.com',     subject: 'Board deck needed for tomorrow 9am', preview: 'Please send latest revenue numbers.',           category: 'urgent',        received_at: ISO(180), priority: 'high'   },
  // informational
  { id: 'e-010', from: 'newsletter@techcrunch.com', subject: 'Weekly digest: AI funding rounds', preview: 'Top 10 stories from this week.',           category: 'informational', received_at: ISO(220), priority: 'low'    },
  { id: 'e-011', from: 'updates@github.com',  subject: 'Your weekly repository summary', preview: 'You merged 12 PRs and closed 4 issues.',           category: 'informational', received_at: ISO(310), priority: 'low'    },
  { id: 'e-012', from: 'no-reply@status.io',  subject: 'Scheduled maintenance window 02:00 UTC', preview: 'No action required.',                       category: 'informational', received_at: ISO(420), priority: 'low'    },
  { id: 'e-013', from: 'product@notion.so',   subject: 'New feature: AI blocks in your workspace', preview: 'Try our new generative blocks.',          category: 'informational', received_at: ISO(560), priority: 'low'    },
  // sales
  { id: 'e-020', from: 'aaron@acme.com',      subject: 'Following up on our discovery call', preview: 'Proposing a 14-day pilot at no cost.',          category: 'sales',         received_at: ISO(75),  priority: 'medium' },
  { id: 'e-021', from: 'jen@growthlabs.io',   subject: 'Quick demo of our pipeline tool?', preview: '15 mins this Thursday work for you?',             category: 'sales',         received_at: ISO(140), priority: 'medium' },
  { id: 'e-022', from: 'sales@datadog.com',   subject: 'Renewal coming up — let us know',  preview: 'Your annual contract renews on the 30th.',       category: 'sales',         received_at: ISO(260), priority: 'medium' },
  { id: 'e-023', from: 'enterprise@stripe.com', subject: 'Volume discount proposal',         preview: '20% off above $1M ARR.',                          category: 'sales',         received_at: ISO(480), priority: 'medium' },
  // spam
  { id: 'e-030', from: 'winner@lottery.tk',   subject: 'YOU HAVE WON $5,000,000 USD',       preview: 'Click here to claim your prize NOW!!!',           category: 'spam',          received_at: ISO(15),  priority: 'low'    },
  { id: 'e-031', from: 'no-reply@phish.biz',  subject: 'Account suspended - verify identity', preview: 'Click here within 24h to keep access.',         category: 'spam',          received_at: ISO(200), priority: 'low'    },
  { id: 'e-032', from: 'crypto@rugpull.xyz',  subject: 'EXCLUSIVE pre-sale: buy $MOON now', preview: '100x guaranteed by end of week.',                 category: 'spam',          received_at: ISO(390), priority: 'low'    },
  { id: 'e-033', from: 'support@fake-bank.cn', subject: 'Unusual login attempt detected',    preview: 'Confirm your password to secure account.',       category: 'spam',          received_at: ISO(640), priority: 'low'    },
];

// Heatmap: 7 (Sun-Sat) x 24 (hours) average response time minutes.
// Build a realistic pattern: faster during business hours weekdays,
// slower at night & weekends.
function buildHeatmap() {
  const grid = [];
  for (let d = 0; d < 7; d++) {
    const row = [];
    for (let h = 0; h < 24; h++) {
      let base;
      const isWeekend = d === 0 || d === 6;
      if (h >= 9 && h <= 17 && !isWeekend) base = 8 + Math.round(Math.random() * 12);   // 8-20m
      else if (h >= 7 && h <= 21)         base = 25 + Math.round(Math.random() * 35);    // 25-60m
      else                                 base = 90 + Math.round(Math.random() * 150);   // 90-240m
      if (isWeekend) base = Math.round(base * 1.6);
      row.push({ day: d, hour: h, avg_response_minutes: base, sample_count: 1 + Math.floor(Math.random() * 12) });
    }
    grid.push(row);
  }
  return grid;
}
const heatmapData = {
  generated_at: seededAt.toISOString(),
  unit: 'minutes',
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  grid: buildHeatmap(),
};

// Triage rules CRUD
let _ruleSeq = 1;
const triageRules = [
  { id: _ruleSeq++, name: 'Escalate CTO emails',     from_domain: 'bigcorp.com',     subject_regex: '',                    category: 'urgent',        priority: 'high',   active: true,  created_at: ISO(60 * 24)  },
  { id: _ruleSeq++, name: 'Quarantine lottery spam', from_domain: 'lottery.tk',      subject_regex: 'WON|PRIZE',           category: 'spam',          priority: 'low',    active: true,  created_at: ISO(60 * 48)  },
  { id: _ruleSeq++, name: 'Sales sequences',         from_domain: 'growthlabs.io',   subject_regex: 'demo|pilot',          category: 'sales',         priority: 'medium', active: true,  created_at: ISO(60 * 72)  },
  { id: _ruleSeq++, name: 'GitHub digests',          from_domain: 'github.com',      subject_regex: 'weekly|digest',       category: 'informational', priority: 'low',    active: false, created_at: ISO(60 * 96)  },
];

// Auto-reply templates CRUD
let _tplSeq = 1;
const autoReplyTemplates = [
  {
    id: _tplSeq++,
    name: 'Out of office',
    trigger: { category: 'informational', from_domain: '', keywords: '' },
    body: 'Hi {{sender_name}},\n\nI am currently out of office until {{return_date}}. I will respond to your email about "{{subject}}" upon my return.\n\nThanks,\n{{my_name}}',
    active: true,
    created_at: ISO(60 * 24),
  },
  {
    id: _tplSeq++,
    name: 'Sales auto-acknowledge',
    trigger: { category: 'sales', from_domain: '', keywords: 'pilot, demo' },
    body: 'Hi {{sender_name}},\n\nThanks for reaching out about {{subject}}. We are reviewing inbound vendor requests once per quarter. We will be in touch if there is a fit.\n\nBest,\n{{my_name}}',
    active: true,
    created_at: ISO(60 * 36),
  },
  {
    id: _tplSeq++,
    name: 'Urgent acknowledge',
    trigger: { category: 'urgent', from_domain: '', keywords: 'outage, down, sev' },
    body: 'Hi {{sender_name}},\n\nAcknowledged — incident received at {{received_at}}. I am paging the on-call team now. Updates every 15 minutes.\n\n{{my_name}}',
    active: false,
    created_at: ISO(60 * 48),
  },
];

// ---------------- helpers ----------------
function applyRule(rule, email) {
  if (!rule.active) return false;
  const fromOk = !rule.from_domain || (email.from || '').toLowerCase().includes(rule.from_domain.toLowerCase());
  let subjectOk = true;
  if (rule.subject_regex && rule.subject_regex.trim() !== '') {
    try {
      subjectOk = new RegExp(rule.subject_regex, 'i').test(email.subject || '');
    } catch (_) { subjectOk = false; }
  }
  return fromOk && subjectOk;
}

// ---------------- routes ----------------

// Endpoint 1: Kanban data — emails grouped by category.
router.get('/kanban', authenticateToken, (req, res) => {
  const columns = CATEGORIES.map((cat) => ({
    key: cat,
    title: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: inboxEmails.filter((e) => e.category === cat).length,
    emails: inboxEmails
      .filter((e) => e.category === cat)
      .sort((a, b) => new Date(b.received_at) - new Date(a.received_at)),
  }));
  res.json({ columns, total: inboxEmails.length });
});

// Optional: move an email between categories (kanban drag).
router.patch('/kanban/:emailId', authenticateToken, (req, res) => {
  const { category } = req.body || {};
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const e = inboxEmails.find((x) => x.id === req.params.emailId);
  if (!e) return res.status(404).json({ error: 'Email not found' });
  e.category = category;
  res.json(e);
});

// Endpoint 2: Heatmap data.
router.get('/heatmap', authenticateToken, (req, res) => {
  res.json(heatmapData);
});

// Endpoint 3: Triage Rules CRUD + test endpoint.
router.get('/rules', authenticateToken, (req, res) => {
  res.json({ rules: triageRules, total: triageRules.length });
});

router.post('/rules', authenticateToken, (req, res) => {
  const { name, from_domain = '', subject_regex = '', category, priority = 'medium', active = true } = req.body || {};
  if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const rule = {
    id: _ruleSeq++, name, from_domain, subject_regex, category, priority, active,
    created_at: new Date().toISOString(),
  };
  triageRules.unshift(rule);
  res.status(201).json(rule);
});

router.put('/rules/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const rule = triageRules.find((r) => r.id === id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  const allowed = ['name', 'from_domain', 'subject_regex', 'category', 'priority', 'active'];
  for (const k of allowed) {
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, k)) rule[k] = req.body[k];
  }
  res.json(rule);
});

router.delete('/rules/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = triageRules.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
  const [removed] = triageRules.splice(idx, 1);
  res.json(removed);
});

// Test a candidate rule (without saving) against the sample inbox.
router.post('/rules/test', authenticateToken, (req, res) => {
  const candidate = {
    active: true,
    from_domain: '',
    subject_regex: '',
    category: 'informational',
    priority: 'medium',
    ...(req.body || {}),
  };
  const matches = inboxEmails.filter((e) => applyRule(candidate, e));
  res.json({
    candidate,
    match_count: matches.length,
    sample_size: inboxEmails.length,
    matches: matches.map((m) => ({ id: m.id, from: m.from, subject: m.subject, current_category: m.category })),
  });
});

// Endpoint 4: Auto-reply templates CRUD + preview.
router.get('/auto-replies', authenticateToken, (req, res) => {
  res.json({ templates: autoReplyTemplates, total: autoReplyTemplates.length });
});

router.post('/auto-replies', authenticateToken, (req, res) => {
  const { name, trigger = {}, body = '', active = false } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const tpl = {
    id: _tplSeq++, name,
    trigger: {
      category: trigger.category || '',
      from_domain: trigger.from_domain || '',
      keywords: trigger.keywords || '',
    },
    body, active,
    created_at: new Date().toISOString(),
  };
  autoReplyTemplates.unshift(tpl);
  res.status(201).json(tpl);
});

router.put('/auto-replies/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tpl = autoReplyTemplates.find((t) => t.id === id);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  if (req.body.name !== undefined)    tpl.name = req.body.name;
  if (req.body.body !== undefined)    tpl.body = req.body.body;
  if (req.body.active !== undefined)  tpl.active = !!req.body.active;
  if (req.body.trigger !== undefined) tpl.trigger = { ...tpl.trigger, ...req.body.trigger };
  res.json(tpl);
});

router.delete('/auto-replies/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idx = autoReplyTemplates.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  const [removed] = autoReplyTemplates.splice(idx, 1);
  res.json(removed);
});

// Preview rendering (substitute vars).
router.post('/auto-replies/preview', authenticateToken, (req, res) => {
  const { body = '', vars = {} } = req.body || {};
  const defaults = {
    sender_name: 'Acme Contact',
    return_date: 'Monday',
    subject: 'sample subject',
    my_name: 'You',
    received_at: new Date().toLocaleString(),
  };
  const merged = { ...defaults, ...vars };
  const rendered = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(merged, k) ? String(merged[k]) : `{{${k}}}`
  );
  res.json({ rendered, vars: merged });
});

module.exports = router;
