const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../../middleware/rateLimiter');
const { analyzeSpam } = require('../services/aiService');

// Get all spam analyses for user (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_spam } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const params = [req.user.id];
    let where = 'WHERE sa.user_id = $1';
    if (is_spam !== undefined) {
      params.push(is_spam === 'true');
      where += ` AND sa.is_spam = $${params.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM spam_analysis sa ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const result = await pool.query(
      `SELECT sa.*, e.subject, e.from_email, e.from_name
       FROM spam_analysis sa
       LEFT JOIN emails e ON sa.email_id = e.id
       ${where}
       ORDER BY sa.spam_score DESC, sa.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get spam analyses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single spam analysis
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.*, e.subject, e.from_email, e.from_name, e.body
       FROM spam_analysis sa
       LEFT JOIN emails e ON sa.email_id = e.id
       WHERE sa.id = $1 AND sa.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spam analysis not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get spam analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze email for spam (AI-powered)
router.post('/analyze/:emailId', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.emailId, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const analysis = await analyzeSpam(email);

    // Save analysis
    const result = await pool.query(
      `INSERT INTO spam_analysis
       (user_id, email_id, spam_score, is_spam, spam_type, risk_level,
        indicators, phishing_probability, malware_risk, sender_reputation,
        link_analysis, recommendation, ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        req.user.id,
        email.id,
        analysis.spamScore,
        analysis.isSpam,
        analysis.spamType,
        analysis.riskLevel,
        analysis.indicators,
        analysis.phishingProbability,
        analysis.malwareRisk,
        analysis.senderReputation,
        JSON.stringify(analysis.linkAnalysis),
        analysis.recommendation,
        analysis.aiConfidence,
        analysis.aiModel,
        analysis.aiResponse
      ]
    );

    // Update email with spam score (columns may not exist in older schemas)
    try {
      await pool.query(
        'UPDATE emails SET spam_score = $1, spam_analysis = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [analysis.spamScore, JSON.stringify(analysis), email.id]
      );
    } catch (updateErr) {
      // If spam_score/spam_analysis columns don't exist, try adding them
      try {
        await pool.query('ALTER TABLE emails ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0');
        await pool.query('ALTER TABLE emails ADD COLUMN IF NOT EXISTS spam_analysis JSONB');
        await pool.query(
          'UPDATE emails SET spam_score = $1, spam_analysis = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [analysis.spamScore, JSON.stringify(analysis), email.id]
        );
      } catch (alterErr) {
        console.warn('Could not update email spam columns:', alterErr.message);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Analyze spam error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual spam analysis
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email_id, spam_score, is_spam, spam_type, risk_level, indicators, recommendation } = req.body;

    const result = await pool.query(
      `INSERT INTO spam_analysis
       (user_id, email_id, spam_score, is_spam, spam_type, risk_level, indicators, recommendation, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
       RETURNING *`,
      [req.user.id, email_id, spam_score, is_spam, spam_type, risk_level, indicators, recommendation]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create spam analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update spam analysis
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { spam_score, is_spam, spam_type, risk_level, indicators, recommendation } = req.body;

    const result = await pool.query(
      `UPDATE spam_analysis
       SET spam_score = COALESCE($1, spam_score),
           is_spam = COALESCE($2, is_spam),
           spam_type = COALESCE($3, spam_type),
           risk_level = COALESCE($4, risk_level),
           indicators = COALESCE($5, indicators),
           recommendation = COALESCE($6, recommendation),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [spam_score, is_spam, spam_type, risk_level, indicators, recommendation, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spam analysis not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update spam analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete spam analysis
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM spam_analysis WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Spam analysis not found' });
    }

    res.json({ message: 'Spam analysis deleted successfully' });
  } catch (error) {
    console.error('Delete spam analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get spam statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) as total_analyzed,
         SUM(CASE WHEN is_spam = true THEN 1 ELSE 0 END) as spam_count,
         SUM(CASE WHEN is_spam = false THEN 1 ELSE 0 END) as safe_count,
         AVG(spam_score) as avg_spam_score,
         COUNT(DISTINCT spam_type) as spam_types_found
       FROM spam_analysis
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get spam stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
