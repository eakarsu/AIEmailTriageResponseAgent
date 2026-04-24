const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { scorePriority } = require('../services/aiService');

// Get all priority scores for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, e.subject, e.from_email, e.from_name
       FROM priority_scores ps
       LEFT JOIN emails e ON ps.email_id = e.id
       WHERE ps.user_id = $1
       ORDER BY ps.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get priority scores error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single priority score
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ps.*, e.subject, e.from_email, e.from_name, e.body
       FROM priority_scores ps
       LEFT JOIN emails e ON ps.email_id = e.id
       WHERE ps.id = $1 AND ps.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Priority score not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get priority score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze email priority (AI-powered)
router.post('/analyze/:emailId', authenticateToken, async (req, res) => {
  try {
    // Get email
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.emailId, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const analysis = await scorePriority(email);

    // Save to database
    const result = await pool.query(
      `INSERT INTO priority_scores
       (user_id, email_id, score, urgency_level, impact_score, time_sensitivity,
        sender_importance, keywords_found, reasoning, recommendations,
        ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        req.user.id,
        email.id,
        analysis.score,
        analysis.urgencyLevel,
        analysis.impactScore,
        analysis.timeSensitivity,
        analysis.senderImportance,
        analysis.keywordsFound,
        analysis.reasoning,
        analysis.recommendations,
        analysis.aiConfidence,
        analysis.aiModel,
        analysis.aiResponse
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Analyze priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual priority score
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email_id, score, urgency_level, reasoning } = req.body;

    const result = await pool.query(
      `INSERT INTO priority_scores
       (user_id, email_id, score, urgency_level, reasoning, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, 0)
       RETURNING *`,
      [req.user.id, email_id, score, urgency_level, reasoning]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create priority score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update priority score
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { score, urgency_level, reasoning } = req.body;

    const result = await pool.query(
      `UPDATE priority_scores
       SET score = COALESCE($1, score),
           urgency_level = COALESCE($2, urgency_level),
           reasoning = COALESCE($3, reasoning),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [score, urgency_level, reasoning, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Priority score not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update priority score error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete priority score
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM priority_scores WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Priority score not found' });
    }

    res.json({ message: 'Priority score deleted successfully' });
  } catch (error) {
    console.error('Delete priority score error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
