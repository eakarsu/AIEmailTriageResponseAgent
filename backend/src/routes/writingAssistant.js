// Writing assistant: grammar / tone real-time suggestions.
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { callOpenRouter } = require('../services/aiService');

// POST /api/writing-assistant/improve { text, tone? }
router.post('/improve', authenticateToken, async (req, res) => {
  try {
    const { text, tone = 'professional' } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });
    const system = `Improve grammar and adjust to a ${tone} tone. Preserve meaning. Output JSON {"improved":"...","changes":["..."],"tone_confidence":0..1}.`;
    let parsed;
    try {
      const raw = await callOpenRouter([{ role: 'system', content: system }, { role: 'user', content: text.slice(0, 8000) }]);
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw); } catch { parsed = { improved: raw, changes: [], tone_confidence: null }; }
    } catch (e) {
      return res.status(503).json({ error: 'LLM unavailable', detail: e.message });
    }
    return res.json({ tone, ...parsed });
  } catch (e) {
    return res.status(500).json({ error: 'improve failed' });
  }
});

module.exports = router;
