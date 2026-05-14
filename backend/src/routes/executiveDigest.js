// Executive daily digest: flagged-emails summary with action items.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/aiService');

// GET /api/executive-digest/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const r = await pool.query(`SELECT id, subject, body, sender, priority FROM emails LEFT JOIN email_priorities ep ON ep.email_id = emails.id WHERE user_id = $1 AND received_at >= $2 ORDER BY received_at DESC LIMIT 200`, [req.user.id, since])
      .catch(async () => pool.query(`SELECT id, subject, body, sender FROM emails WHERE user_id = $1 AND received_at >= $2 ORDER BY received_at DESC LIMIT 200`, [req.user.id, since]));
    if (!r.rows.length) return res.json({ since, count: 0, digest: 'No emails today.' });

    const highPriority = r.rows.filter(e => (e.priority || '').toLowerCase() === 'high').slice(0, 30);
    const sample = highPriority.length ? highPriority : r.rows.slice(0, 30);

    const system = 'Produce a one-page executive digest with: top 5 items, action items, FYI items, and risks. Output JSON {"top":["..."],"actions":["..."],"fyi":["..."],"risks":["..."]}.';
    let digest;
    try {
      const raw = await callOpenRouter([{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(sample.map(e => ({ subject: e.subject, sender: e.sender, excerpt: (e.body || '').slice(0, 250) }))) }]);
      try { digest = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { digest = { raw }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable' });
    }
    return res.json({ since, count: r.rows.length, high_priority_count: highPriority.length, digest });
  } catch (e) {
    return res.status(500).json({ error: 'digest failed' });
  }
});

module.exports = router;
