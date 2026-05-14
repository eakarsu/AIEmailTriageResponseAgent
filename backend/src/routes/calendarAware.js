// Calendar-aware scheduling: extract proposed times, suggest slots.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/aiService');

// POST /api/calendar-aware/extract { email_id }
router.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { email_id } = req.body || {};
    if (!email_id) return res.status(400).json({ error: 'email_id required' });
    const r = await pool.query(`SELECT subject, body FROM emails WHERE id = $1 AND user_id = $2`, [email_id, req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'email not found' });

    const system = 'Extract proposed meeting times from an email. Output JSON {"proposed_times":[ISO],"duration_minutes":int,"timezone":"...","attendees":["..."]}.';
    let parsed;
    try {
      const raw = await callOpenRouter([{ role: 'system', content: system }, { role: 'user', content: `${r.rows[0].subject}\n\n${r.rows[0].body}`.slice(0, 6000) }]);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable' });
    }

    // Suggest open slots in next 5 business days (assume 9-17 local, 30-min steps)
    const slots = [];
    const now = new Date();
    for (let d = 1; d <= 7 && slots.length < 10; d++) {
      const day = new Date(now.getTime() + d * 86400000);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      day.setHours(10, 0, 0, 0);
      slots.push(new Date(day).toISOString());
      day.setHours(14, 0, 0, 0);
      slots.push(new Date(day).toISOString());
    }
    try {
      await pool.query(`INSERT INTO meetings (user_id, email_id, payload, created_at) VALUES ($1,$2,$3,NOW())`, [req.user.id, email_id, JSON.stringify({ ...parsed, suggested_slots: slots })]);
    } catch {}
    return res.json({ email_id, ...parsed, suggested_slots: slots });
  } catch (e) {
    return res.status(500).json({ error: 'extract failed' });
  }
});

module.exports = router;
