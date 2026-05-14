// Support routing: incoming support email → agent + context bundle.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/aiService');

// POST /api/support-routing/triage { email_id }
router.post('/triage', authenticateToken, async (req, res) => {
  try {
    const { email_id } = req.body || {};
    if (!email_id) return res.status(400).json({ error: 'email_id required' });
    const r = await pool.query(`SELECT * FROM emails WHERE id = $1 AND user_id = $2`, [email_id, req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'email not found' });
    const e = r.rows[0];

    // Past tickets from this sender for context
    let history = [];
    try {
      const r2 = await pool.query(`SELECT id, subject, received_at FROM emails WHERE user_id = $1 AND sender = $2 ORDER BY received_at DESC LIMIT 10`, [req.user.id, e.sender]);
      history = r2.rows;
    } catch {}

    const system = 'Triage an inbound support email. Output JSON {"category":"...","priority":"high|med|low","suggested_assignee":"team_name","first_response":"..."}.';
    let triage;
    try {
      const raw = await callOpenRouter([{ role: 'system', content: system }, { role: 'user', content: JSON.stringify({ email: { subject: e.subject, body: e.body, sender: e.sender }, history }) }]);
      try { triage = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { triage = { raw }; }
    } catch (err) {
      return res.status(503).json({ error: 'LLM unavailable', detail: err.message });
    }

    try {
      await pool.query(`INSERT INTO email_priorities (email_id, priority, payload, created_at) VALUES ($1,$2,$3,NOW())`, [email_id, triage.priority || 'med', JSON.stringify(triage)]);
    } catch {}
    return res.json({ email_id, triage, history_count: history.length });
  } catch (e) {
    return res.status(500).json({ error: 'triage failed' });
  }
});

module.exports = router;
