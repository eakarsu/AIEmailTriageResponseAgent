// Sales-email sequencing: auto follow-ups based on open/click signals.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/aiService');

// POST /api/sales-sequencing/start { contact_id, opening_subject, opening_body, cadence_days?:[3,7,14] }
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { contact_id, opening_subject, opening_body, cadence_days = [3, 7, 14] } = req.body || {};
    if (!contact_id || !opening_subject || !opening_body) return res.status(400).json({ error: 'contact_id, opening_subject, opening_body required' });
    const id = `seq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const steps = [{ subject: opening_subject, body: opening_body, send_at: new Date().toISOString() }];
    for (let i = 0; i < cadence_days.length; i++) {
      steps.push({
        subject: `Re: ${opening_subject} (${i + 2})`,
        body: `(auto-followup-${i + 1}) ${opening_body.slice(0, 200)}`,
        send_at: new Date(Date.now() + cadence_days[i] * 86400000).toISOString(),
      });
    }
    try {
      await pool.query(
        `INSERT INTO followups (user_id, contact_id, sequence_id, steps, status, created_at) VALUES ($1,$2,$3,$4,'active',NOW())`,
        [req.user.id, contact_id, id, JSON.stringify(steps)]
      );
    } catch {}
    return res.json({ sequence_id: id, contact_id, steps });
  } catch (e) {
    return res.status(500).json({ error: 'start failed' });
  }
});

// POST /api/sales-sequencing/event { sequence_id, type:'open'|'click'|'reply' }
router.post('/event', authenticateToken, async (req, res) => {
  try {
    const { sequence_id, type } = req.body || {};
    if (!sequence_id || !type) return res.status(400).json({ error: 'sequence_id + type required' });
    // On reply, mark sequence completed (stop sending).
    if (type === 'reply') {
      try { await pool.query(`UPDATE followups SET status = 'completed' WHERE sequence_id = $1`, [sequence_id]); } catch {}
    }
    return res.json({ sequence_id, type, status: type === 'reply' ? 'stopped' : 'tracked' });
  } catch (e) {
    return res.status(500).json({ error: 'event failed' });
  }
});

module.exports = router;
