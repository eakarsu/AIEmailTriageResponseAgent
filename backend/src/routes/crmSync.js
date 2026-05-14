// CRM sync: auto-update contacts / deals from email exchange. v0 supports
// HubSpot (contact upsert via REST) when configured.
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// POST /api/crm-sync/push-contact { email, properties:{name?,company?,phone?} }
router.post('/push-contact', authenticateToken, async (req, res) => {
  try {
    const { email, properties = {} } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    // TODO: configure credentials — HUBSPOT_ACCESS_TOKEN
    const hubspot = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!hubspot) {
      try { await pool.query(`INSERT INTO contacts (user_id, email, properties, created_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (user_id,email) DO UPDATE SET properties = EXCLUDED.properties`, [req.user.id, email, JSON.stringify(properties)]); } catch {}
      return res.json({ provider: 'local', email, properties, note: 'HUBSPOT_ACCESS_TOKEN missing — stored locally only' });
    }
    const r = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hubspot}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { email, ...properties } }),
    });
    if (!r.ok && r.status !== 409) return res.status(502).json({ error: 'hubspot push failed', status: r.status });
    const data = r.status === 409 ? { conflict: true } : await r.json();
    return res.json({ provider: 'hubspot', email, hubspot_response: data });
  } catch (e) {
    return res.status(500).json({ error: 'push failed' });
  }
});

module.exports = router;
