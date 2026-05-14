// ============================================================
// === Batch 03 Gaps & Frontend Mounts ===
// Auto-generated Gap-feature endpoints (lean v0).
// TODO: configure credentials (set OPENROUTER_API_KEY).
// ============================================================
const express = require('express');
const router = express.Router();

let _gfReady = false;
async function ensureGapTable(pool) {
  if (_gfReady || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS gap_features (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(120) NOT NULL,
      user_id INT,
      input JSONB,
      output JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    _gfReady = true;
  } catch (_) { /* tolerant of missing DB */ }
}

async function callAI(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'AI service unavailable. Set OPENROUTER_API_KEY (TODO: configure credentials).' };
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || '';
    return { ok: r.ok, status: r.status, text, raw: data };
  } catch (e) {
    return { ok: false, status: 500, error: String(e.message || e) };
  }
}

function buildHandler(slug, label, hint) {
  return async (req, res) => {
    const body = req.body || {};
    const userId = req.user?.id || null;
    const prompt = `Feature: ${label}\nContext hint: ${hint}\nUser input:\n${JSON.stringify(body, null, 2)}\n\nProduce a concise, actionable response.`;
    const ai = await callAI(prompt);
    try {
      const pool = req.app.locals.pool || req.app.get('pool') || null;
      if (pool) {
        await ensureGapTable(pool);
        await pool.query('INSERT INTO gap_features(slug, user_id, input, output) VALUES ($1,$2,$3,$4)',
          [slug, userId, body, { text: ai.text || ai.error || null }]);
      }
    } catch (_) { /* tolerant */ }
    if (!ai.ok) return res.status(ai.status || 500).json({ error: ai.error || ai.text || `Upstream error (${ai.status})`, slug });
    res.json({ slug, label, result: ai.text });
  };
}

router.post('/gap-no-multilingual-classification', buildHandler('gap-ai-no-multilingual-classification', 'No multilingual classification', 'No multilingual classification'));
router.post('/gap-no-tone-sentiment-calibration-before-send', buildHandler('gap-ai-no-tone-sentiment-calibration-before-send', 'No tone/sentiment calibration before send', 'No tone/sentiment calibration before send'));
router.post('/gap-no-agentic-ooo-summariser', buildHandler('gap-ai-no-agentic-ooo-summariser', 'No agentic "OOO summariser"', 'No agentic "OOO summariser"'));
router.post('/gap-no-phishing-url-sandbox-check', buildHandler('gap-ai-no-phishing-url-sandbox-check', 'No phishing-URL sandbox check', 'No phishing-URL sandbox check'));
router.post('/gap-no-imap-smtp-oauth-connector-endpoints', buildHandler('gap-non-no-imap-smtp-oauth-connector-endpoints', 'No IMAP/SMTP/OAuth connector endpoints', 'No IMAP/SMTP/OAuth connector endpoints'));
router.post('/gap-no-webhooks-no-provider-push', buildHandler('gap-non-no-webhooks-no-provider-push', 'No webhooks (no provider push)', 'No webhooks (no provider push)'));
router.post('/gap-no-real-time-sync-stream', buildHandler('gap-non-no-real-time-sync-stream', 'No real-time sync stream', 'No real-time sync stream'));
router.post('/gap-no-batch-operations', buildHandler('gap-non-no-batch-operations', 'No batch operations', 'No batch operations'));
router.post('/gap-no-scheduled-send-endpoint', buildHandler('gap-non-no-scheduled-send-endpoint', 'No scheduled-send endpoint', 'No scheduled-send endpoint'));
router.post('/gap-no-file-upload-attachments', buildHandler('gap-non-no-file-upload-attachments', 'No file upload (attachments)', 'No file upload (attachments)'));

module.exports = router;
