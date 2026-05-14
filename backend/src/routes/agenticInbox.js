// Agentic inbox: OOO assistant that drafts replies and summarises important
// threads.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/aiService');

// POST /api/agentic-inbox/ooo-summary { since_iso? } — summarise emails from a date
router.post('/ooo-summary', authenticateToken, async (req, res) => {
  try {
    const since = req.body?.since_iso ? new Date(req.body.since_iso) : new Date(Date.now() - 7 * 86400000);
    const r = await pool.query(`SELECT id, subject, body, sender FROM emails WHERE user_id = $1 AND received_at >= $2 ORDER BY received_at DESC LIMIT 200`, [req.user.id, since]);
    if (!r.rows.length) return res.json({ since, count: 0, summary: 'No emails to summarise.' });

    const system = 'Summarise the user\'s inbox while OOO. Group by sender and urgency. Output JSON: {"groups":[{"sender":"...","urgency":"high|med|low","summary":"...","email_ids":[ids]}],"recommended_drafts":[{"email_id":id,"draft":"..."}]}.';
    const ctx = JSON.stringify(r.rows.map(e => ({ id: e.id, subject: e.subject, sender: e.sender, excerpt: (e.body || '').slice(0, 250) })));
    let parsed;
    try {
      const raw = await callOpenRouter([{ role: 'system', content: system }, { role: 'user', content: ctx }]);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }

    if (Array.isArray(parsed.recommended_drafts)) {
      for (const d of parsed.recommended_drafts.slice(0, 25)) {
        try {
          await pool.query(`INSERT INTO drafts (user_id, email_id, body, source, created_at) VALUES ($1,$2,$3,'ooo_agent',NOW())`, [req.user.id, d.email_id, d.draft]);
        } catch {}
      }
    }
    return res.json({ since, count: r.rows.length, summary: parsed });
  } catch (e) {
    return res.status(500).json({ error: 'summary failed' });
  }
});

module.exports = router;
