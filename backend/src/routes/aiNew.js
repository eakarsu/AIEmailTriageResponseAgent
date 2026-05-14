const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../../middleware/rateLimiter');
const {
  categorizeEmail,
  prioritizeEmail,
  analyzeEmailSentiment,
  extractActionItems,
  summarizeEmail,
  callOpenRouter
} = require('../services/aiService');

// Local cleanJsonResponse helper
function cleanJsonResponse(content) {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```[\s\S]*$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf('{');
    if (start === -1) throw e;
    let depth = 0, end = -1;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end === -1) throw e;
    return JSON.parse(cleaned.substring(start, end + 1));
  }
}

// POST /api/ai/async-process
// Accepts {email_id, tasks: ['categorize','prioritize','summarize','extract_actions']}
// Runs all requested AI tasks in parallel, stores results, returns combined
router.post('/async-process', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { email_id, tasks } = req.body;
    if (!email_id || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'email_id and tasks array are required' });
    }

    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [email_id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const validTasks = ['categorize', 'prioritize', 'summarize', 'extract_actions'];
    const requestedTasks = tasks.filter(t => validTasks.includes(t));

    if (requestedTasks.length === 0) {
      return res.status(400).json({ error: `Valid tasks are: ${validTasks.join(', ')}` });
    }

    // Run all requested tasks in parallel
    const taskPromises = requestedTasks.map(async (task) => {
      switch (task) {
        case 'categorize': {
          const categoriesResult = await pool.query(
            'SELECT name, description, keywords FROM categories WHERE user_id = $1',
            [req.user.id]
          );
          const result = await categorizeEmail(email.subject, email.body, categoriesResult.rows);
          const category = typeof result === 'string' ? result : result.category;
          await pool.query(
            'UPDATE emails SET category = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [category, email_id]
          );
          return { task, result: { category } };
        }
        case 'prioritize': {
          const result = await prioritizeEmail(email.subject, email.body, email.from_email);
          await pool.query(
            'UPDATE emails SET priority = $1, priority_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [result.priority, result.reason, email_id]
          );
          return { task, result: { priority: result.priority, reason: result.reason } };
        }
        case 'summarize': {
          const result = await summarizeEmail(email.body);
          const summary = typeof result === 'string' ? result : result.summary;
          await pool.query(
            'UPDATE emails SET summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [summary, email_id]
          );
          return { task, result: { summary } };
        }
        case 'extract_actions': {
          const result = await extractActionItems(email.body);
          await pool.query(
            'UPDATE emails SET action_items = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(result), email_id]
          );
          return { task, result };
        }
        default:
          return { task, result: null, error: 'Unknown task' };
      }
    });

    const results = await Promise.all(taskPromises);
    const combined = {};
    for (const r of results) {
      combined[r.task] = r.result;
    }

    res.json({ email_id, tasks_completed: requestedTasks, results: combined });
  } catch (error) {
    console.error('Async process error:', error);
    res.status(500).json({ error: 'Failed to process AI tasks' });
  }
});

// POST /api/ai/smart-reply
// Accepts {email_id, reply_intent: 'accept|decline|clarify|escalate'}
// Fetches thread history (last 5), generates contextually appropriate reply
router.post('/smart-reply', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { email_id, reply_intent } = req.body;
    if (!email_id || !reply_intent) {
      return res.status(400).json({ error: 'email_id and reply_intent are required' });
    }

    const validIntents = ['accept', 'decline', 'clarify', 'escalate'];
    if (!validIntents.includes(reply_intent)) {
      return res.status(400).json({ error: `reply_intent must be one of: ${validIntents.join(', ')}` });
    }

    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [email_id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];

    // Fetch thread history - last 5 emails from same sender/conversation
    const threadResult = await pool.query(
      `SELECT subject, body, from_email, from_name, received_at FROM emails
       WHERE user_id = $1 AND (from_email = $2 OR to_email = $2)
       ORDER BY received_at DESC LIMIT 5`,
      [req.user.id, email.from_email]
    );

    const threadHistory = threadResult.rows.reverse();
    const threadContext = threadHistory.length > 1
      ? threadHistory.map(e => `[${new Date(e.received_at).toLocaleDateString()}] From: ${e.from_email}\nSubject: ${e.subject}\n${e.body.substring(0, 300)}`).join('\n\n---\n\n')
      : 'No prior thread history';

    const intentInstructions = {
      accept: 'Accept the request/proposal positively and confirm next steps.',
      decline: 'Politely decline the request/proposal with a brief explanation.',
      clarify: 'Ask for clarification on key points that are unclear.',
      escalate: 'Acknowledge the issue and explain it is being escalated to the appropriate team/person.'
    };

    const messages = [
      {
        role: 'system',
        content: `You are a professional email assistant. Generate a smart, contextually appropriate reply.
Intent: ${reply_intent} - ${intentInstructions[reply_intent]}

Consider the full thread history when crafting your reply. Be natural, concise, and professional.

Respond in JSON format:
{
  "subject": "Re: <original subject>",
  "body": "<the full email reply text>",
  "tone": "professional|friendly|formal",
  "key_points": ["point1", "point2"]
}`
      },
      {
        role: 'user',
        content: `Thread History:\n${threadContext}\n\n---\nLatest email to reply to:\nFrom: ${email.from_email} (${email.from_name || 'Unknown'})\nSubject: ${email.subject}\n\n${email.body}`
      }
    ];

    const result = await callOpenRouter(messages);
    let reply;
    try {
      reply = cleanJsonResponse(result.content);
    } catch (e) {
      reply = {
        subject: `Re: ${email.subject}`,
        body: result.content,
        tone: 'professional',
        key_points: []
      };
    }

    res.json({
      email_id,
      reply_intent,
      thread_messages_used: threadHistory.length,
      reply,
      model: result.model
    });
  } catch (error) {
    console.error('Smart reply error:', error);
    res.status(500).json({ error: 'Failed to generate smart reply' });
  }
});

// POST /api/ai/email-coaching
// Accepts {email_id, improvement_type: 'tone|clarity|brevity'}
// Generates coaching feedback with suggestions and improved rewrite
router.post('/email-coaching', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { email_id, improvement_type } = req.body;
    if (!email_id || !improvement_type) {
      return res.status(400).json({ error: 'email_id and improvement_type are required' });
    }

    const validTypes = ['tone', 'clarity', 'brevity'];
    if (!validTypes.includes(improvement_type)) {
      return res.status(400).json({ error: `improvement_type must be one of: ${validTypes.join(', ')}` });
    }

    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [email_id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];

    const coachingFocus = {
      tone: 'Analyze the tone of this email. Look for language that may come across as too aggressive, passive-aggressive, too casual, or unprofessional. Focus on making it more appropriate and effective.',
      clarity: 'Analyze the clarity of this email. Look for ambiguous statements, unclear requests, missing context, or confusing structure. Focus on making it easier to understand and act upon.',
      brevity: 'Analyze the brevity of this email. Look for unnecessary filler words, repetition, overly long sentences, or information that can be cut. Focus on making it more concise while retaining all important information.'
    };

    const messages = [
      {
        role: 'system',
        content: `You are an expert email writing coach. ${coachingFocus[improvement_type]}

Respond in JSON format:
{
  "overall_score": <0-100>,
  "improvement_type": "${improvement_type}",
  "issues_found": ["issue1", "issue2", "issue3"],
  "specific_suggestions": [
    {"original": "exact text from email", "improved": "better version", "reason": "why this is better"}
  ],
  "improved_email": "<full rewritten version of the email>",
  "coaching_summary": "<2-3 sentence overall coaching feedback>"
}`
      },
      {
        role: 'user',
        content: `Please coach me on improving this email for ${improvement_type}:\n\nSubject: ${email.subject}\n\n${email.body}`
      }
    ];

    const result = await callOpenRouter(messages);
    let coaching;
    try {
      coaching = cleanJsonResponse(result.content);
    } catch (e) {
      coaching = {
        overall_score: 50,
        improvement_type,
        issues_found: [],
        specific_suggestions: [],
        improved_email: email.body,
        coaching_summary: result.content
      };
    }

    res.json({
      email_id,
      improvement_type,
      coaching,
      model: result.model
    });
  } catch (error) {
    console.error('Email coaching error:', error);
    res.status(500).json({ error: 'Failed to generate email coaching' });
  }
});

// POST /api/ai/inbox-digest
// Summarises the user's most important unread emails using existing summarizeEmail.
// Body: { limit: number (default 10) }
router.post('/inbox-digest', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY on the server.' });
    }
    const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 10, 1), 25);
    const emailsResult = await pool.query(
      `SELECT id, subject, body, from_email, from_name, priority, received_at
       FROM emails
       WHERE user_id = $1 AND status = 'unread'
       ORDER BY COALESCE(priority, 5) ASC, received_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );
    if (emailsResult.rows.length === 0) {
      return res.json({ count: 0, items: [], digest: 'Inbox is empty.' });
    }
    const items = [];
    for (const email of emailsResult.rows) {
      try {
        const summaryRes = await summarizeEmail(email.body || '');
        const summary = typeof summaryRes === 'string' ? summaryRes : (summaryRes?.summary || '');
        items.push({
          id: email.id,
          subject: email.subject,
          from: email.from_email,
          from_name: email.from_name,
          priority: email.priority,
          received_at: email.received_at,
          summary
        });
      } catch (e) {
        items.push({
          id: email.id,
          subject: email.subject,
          from: email.from_email,
          from_name: email.from_name,
          priority: email.priority,
          received_at: email.received_at,
          summary: '',
          summary_error: e.message
        });
      }
    }
    // Build a top-level digest using callOpenRouter
    const digestPrompt = items.map(i =>
      `- [${i.priority || '?'}] ${i.from_name || i.from}: ${i.subject}\n  ${i.summary}`
    ).join('\n');
    const digestMessages = [
      { role: 'system', content: 'You are an executive assistant. Produce a short briefing of the most important unread emails. Group by theme, call out anything urgent, and keep it under 150 words.' },
      { role: 'user', content: `Unread emails:\n${digestPrompt}` }
    ];
    let digestText = '';
    try {
      const r = await callOpenRouter(digestMessages);
      digestText = r.content;
    } catch (e) {
      digestText = `(top-level digest failed: ${e.message})`;
    }
    res.json({ count: items.length, items, digest: digestText });
  } catch (error) {
    console.error('Inbox digest error:', error);
    if (/OPENROUTER_API_KEY|api[_ ]?key/i.test(error.message || '')) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY on the server.' });
    }
    res.status(500).json({ error: 'Failed to generate inbox digest' });
  }
});

// POST /api/ai/sales-sequence
// Returns a 3-touch outbound sales follow-up sequence for a contact and goal.
// Body: { contact_id: number, goal: string, product?: string, tone?: string }
router.post('/sales-sequence', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY on the server.' });
    }
    const { contact_id, goal, product, tone } = req.body || {};
    if (!contact_id || !goal) {
      return res.status(400).json({ error: 'contact_id and goal are required' });
    }
    const contactRes = await pool.query(
      'SELECT id, email, name, company, notes, tags FROM contacts WHERE id = $1 AND user_id = $2',
      [contact_id, req.user.id]
    );
    if (contactRes.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    const contact = contactRes.rows[0];
    const messages = [
      {
        role: 'system',
        content: `You are an outbound sales coach. Produce a 3-touch follow-up email sequence (initial, follow-up day 3, breakup day 7).
Respond ONLY in JSON:
{
  "goal": "<goal>",
  "contact": { "name": "<name>", "company": "<company>" },
  "sequence": [
    { "step": 1, "send_after_days": 0, "subject": "...", "body": "...", "purpose": "..." },
    { "step": 2, "send_after_days": 3, "subject": "...", "body": "...", "purpose": "..." },
    { "step": 3, "send_after_days": 7, "subject": "...", "body": "...", "purpose": "..." }
  ],
  "tone": "${tone || 'professional'}",
  "tips": ["...", "..."]
}`
      },
      {
        role: 'user',
        content: `Goal: ${goal}
Product/Service: ${product || 'unspecified'}
Tone preference: ${tone || 'professional'}
Contact: ${contact.name || contact.email} at ${contact.company || 'unknown company'}
Tags: ${(contact.tags || []).join(', ') || 'none'}
Notes: ${contact.notes || 'none'}`
      }
    ];
    const result = await callOpenRouter(messages);
    let sequence;
    try {
      sequence = cleanJsonResponse(result.content);
    } catch (e) {
      sequence = { goal, contact: { name: contact.name, company: contact.company }, raw: result.content };
    }
    res.json({ contact_id, goal, sequence, model: result.model });
  } catch (error) {
    console.error('Sales sequence error:', error);
    if (/OPENROUTER_API_KEY|api[_ ]?key/i.test(error.message || '')) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY on the server.' });
    }
    res.status(500).json({ error: 'Failed to generate sales sequence' });
  }
});

// POST /api/ai/executive-daily-summary
// Apply-pass-5: audit "Daily executive summary" — synthesises today's inbox into a brief.
// Body: { date? (YYYY-MM-DD, default today), max_emails? (default 30) }
router.post('/executive-daily-summary', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY on the server.', missing: 'OPENROUTER_API_KEY' });
    }
    const date = req.body?.date && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : null;
    const max = Math.min(Math.max(parseInt(req.body?.max_emails, 10) || 30, 1), 100);
    const params = [req.user.id];
    let where = 'user_id = $1';
    if (date) {
      params.push(date);
      where += ` AND DATE(received_at) = $${params.length}`;
    } else {
      where += ' AND received_at >= NOW() - INTERVAL \'24 hours\'';
    }
    params.push(max);
    const r = await pool.query(
      `SELECT id, subject, body, from_email, from_name, priority, category, status, received_at
       FROM emails WHERE ${where} ORDER BY COALESCE(priority,5) ASC, received_at DESC LIMIT $${params.length}`,
      params
    );
    if (r.rows.length === 0) {
      return res.json({ count: 0, summary: 'No emails for the requested window.', items: [] });
    }
    const compactList = r.rows.map(e =>
      `- [P${e.priority || '?'}|${e.category || 'uncat'}|${e.status}] ${e.from_name || e.from_email}: ${e.subject}`
    ).join('\n');
    const messages = [
      { role: 'system', content: 'You are a chief-of-staff producing a concise executive daily inbox briefing. Group by theme, surface anything urgent, list 3-5 recommended actions for the user. Keep under 250 words. Respond ONLY in JSON: { "headline": string, "themes": [{"theme": string, "summary": string, "email_ids_referenced": [number]}], "urgent": [string], "recommended_actions": [string], "tone": "string" }' },
      { role: 'user', content: `Date: ${date || 'last 24h'}\nEmails (${r.rows.length}):\n${compactList}` },
    ];
    const result = await callOpenRouter(messages);
    let parsed;
    try { parsed = cleanJsonResponse(result.content); } catch { parsed = { raw: result.content }; }
    res.json({ date: date || 'last 24h', count: r.rows.length, summary: parsed, model: result.model });
  } catch (error) {
    console.error('Executive daily summary error:', error);
    if (/OPENROUTER_API_KEY|api[_ ]?key/i.test(error.message || '')) {
      return res.status(503).json({ error: 'AI not configured.', missing: 'OPENROUTER_API_KEY' });
    }
    res.status(500).json({ error: 'Failed to generate executive summary' });
  }
});

// POST /api/ai/grammar-tone-assistant
// Apply-pass-5: audit "Real-time grammar/tone assistant".
// Body: { text, target_tone? (default professional), check_grammar? (default true) }
router.post('/grammar-tone-assistant', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY on the server.', missing: 'OPENROUTER_API_KEY' });
    }
    const { text, target_tone, check_grammar } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' });
    if (text.length > 8000) return res.status(400).json({ error: 'text must be under 8000 chars' });
    const tone = target_tone || 'professional';
    const grammar = check_grammar !== false;
    const messages = [
      {
        role: 'system',
        content: `You are an expert writing assistant. Score grammar (if requested), tone-match against the target, and propose a polished rewrite. Respond ONLY in JSON:
{
  "grammar_score": <0-100 or null>,
  "grammar_issues": [{"original": string, "suggestion": string, "category": "grammar|spelling|punctuation|style"}],
  "current_tone": string,
  "target_tone": string,
  "tone_match_score": <0-100>,
  "tone_issues": [string],
  "improved_text": string,
  "summary": string
}`,
      },
      { role: 'user', content: `Target tone: ${tone}\nCheck grammar: ${grammar}\nText:\n${text}` },
    ];
    const result = await callOpenRouter(messages);
    let parsed;
    try { parsed = cleanJsonResponse(result.content); } catch { parsed = { raw: result.content, target_tone: tone }; }
    res.json({ target_tone: tone, check_grammar: grammar, result: parsed, model: result.model });
  } catch (error) {
    console.error('Grammar/tone error:', error);
    if (/OPENROUTER_API_KEY|api[_ ]?key/i.test(error.message || '')) {
      return res.status(503).json({ error: 'AI not configured.', missing: 'OPENROUTER_API_KEY' });
    }
    res.status(500).json({ error: 'Failed to run grammar/tone assistant' });
  }
});

// POST /api/ai/customer-support-routing
// Apply-pass-5: audit "Customer-support routing".
// PRODUCT-DECISION: routes go to a fixed default queue list; production should
// load queues from a settings table or external ticket-system config.
// Body: { email_id?, subject?, body?, queues? (defaults below) }
router.post('/customer-support-routing', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY on the server.', missing: 'OPENROUTER_API_KEY' });
    }
    let { email_id, subject, body, queues } = req.body || {};
    if (email_id) {
      const er = await pool.query(
        'SELECT subject, body, from_email FROM emails WHERE id = $1 AND user_id = $2',
        [email_id, req.user.id]
      );
      if (er.rows.length === 0) return res.status(404).json({ error: 'Email not found' });
      subject = subject || er.rows[0].subject;
      body = body || er.rows[0].body;
    }
    if (!subject && !body) return res.status(400).json({ error: 'email_id or subject/body required' });
    // PRODUCT-DECISION: default queue taxonomy when caller does not supply one.
    const defaultQueues = [
      { id: 'tier1_general', name: 'Tier 1 General Support' },
      { id: 'tier2_technical', name: 'Tier 2 Technical' },
      { id: 'billing', name: 'Billing & Refunds' },
      { id: 'sales', name: 'Sales / Pre-purchase' },
      { id: 'security', name: 'Security & Account Issues' },
      { id: 'escalation', name: 'Manager Escalation' },
    ];
    const queueList = Array.isArray(queues) && queues.length > 0 ? queues : defaultQueues;
    const messages = [
      {
        role: 'system',
        content: `You are a support-routing classifier. Given a customer email and a list of queues, pick the best queue and an SLA. Respond ONLY in JSON:
{
  "primary_queue_id": string,
  "primary_queue_name": string,
  "confidence": <0-100>,
  "alternative_queues": [{"queue_id": string, "score": <0-100>}],
  "category": string,
  "urgency": "low|medium|high|critical",
  "suggested_sla_hours": number,
  "needs_manager_escalation": boolean,
  "first_response_template": string,
  "reasoning": string
}`,
      },
      { role: 'user', content: `Available queues: ${JSON.stringify(queueList)}\n\nEmail:\nSubject: ${subject || ''}\nBody: ${body || ''}` },
    ];
    const result = await callOpenRouter(messages);
    let parsed;
    try { parsed = cleanJsonResponse(result.content); } catch { parsed = { raw: result.content }; }
    res.json({ email_id: email_id || null, queues: queueList, routing: parsed, model: result.model });
  } catch (error) {
    console.error('Customer support routing error:', error);
    if (/OPENROUTER_API_KEY|api[_ ]?key/i.test(error.message || '')) {
      return res.status(503).json({ error: 'AI not configured.', missing: 'OPENROUTER_API_KEY' });
    }
    res.status(500).json({ error: 'Failed to route support email' });
  }
});

// POST /api/ai/crm-sync
// Apply-pass-5: audit "Email-to-CRM sync" — NEEDS-CREDS.
// Documented env vars (all required):
//   - CRM_API_KEY: vendor API key
//   - CRM_PROVIDER: salesforce | hubspot | pipedrive
//   - CRM_BASE_URL: vendor REST base URL
// Returns 503 with `missing: <ENV>` when any var is unset; otherwise records a
// pending sync row in an additive `crm_sync_log` table (CREATE TABLE IF NOT EXISTS).
let crmSyncTableReady = false;
async function ensureCrmSyncTable() {
  if (crmSyncTableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_sync_log (
      id SERIAL PRIMARY KEY,
      user_id INT,
      email_id INT,
      contact_id INT,
      provider VARCHAR(50),
      direction VARCHAR(20),
      status VARCHAR(50),
      payload JSONB,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  crmSyncTableReady = true;
}
router.post('/crm-sync', authenticateToken, async (req, res) => {
  try {
    const required = ['CRM_API_KEY', 'CRM_PROVIDER', 'CRM_BASE_URL'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
      return res.status(503).json({
        error: 'CRM integration not configured.',
        missing: missing.join(','),
        documentation: 'Set CRM_API_KEY, CRM_PROVIDER (salesforce|hubspot|pipedrive), and CRM_BASE_URL.'
      });
    }
    await ensureCrmSyncTable();
    const { email_id, contact_id, direction } = req.body || {};
    if (!email_id && !contact_id) return res.status(400).json({ error: 'email_id or contact_id required' });
    const r = await pool.query(
      `INSERT INTO crm_sync_log (user_id, email_id, contact_id, provider, direction, status, payload)
       VALUES ($1,$2,$3,$4,$5,'pending',$6) RETURNING *`,
      [req.user.id, email_id || null, contact_id || null, process.env.CRM_PROVIDER, direction || 'outbound', JSON.stringify(req.body || {})]
    );
    // Vendor adapter intentionally not wired; row is enqueued for an external worker.
    res.status(202).json({ enqueued: true, log: r.rows[0] });
  } catch (error) {
    console.error('CRM sync error:', error);
    res.status(500).json({ error: 'CRM sync failed' });
  }
});

module.exports = router;
