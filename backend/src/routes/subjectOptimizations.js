const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../../middleware/rateLimiter');
const { optimizeSubject } = require('../services/aiService');

// Widen VARCHAR columns that may be too short for AI responses
(async () => {
  try {
    await pool.query('ALTER TABLE subject_optimizations ALTER COLUMN target_audience TYPE VARCHAR(500)');
    await pool.query('ALTER TABLE subject_optimizations ALTER COLUMN tone TYPE VARCHAR(500)');
  } catch (e) { /* columns already wide enough or table doesn't exist yet */ }
})();

// Get all subject optimizations for user (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      'SELECT COUNT(*) FROM subject_optimizations WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT so.*, e.subject as email_subject
       FROM subject_optimizations so
       LEFT JOIN emails e ON so.email_id = e.id
       WHERE so.user_id = $1
       ORDER BY so.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get subject optimizations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single subject optimization
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT so.*, e.subject as email_subject, e.body as email_body
       FROM subject_optimizations so
       LEFT JOIN emails e ON so.email_id = e.id
       WHERE so.id = $1 AND so.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject optimization not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get subject optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optimize subject line (AI-powered)
router.post('/optimize', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { subject, email_id, target_audience, purpose, tone, industry } = req.body;

    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const context = { targetAudience: target_audience, purpose, tone, industry };
    const optimization = await optimizeSubject(subject, context);

    // Save to database
    const result = await pool.query(
      `INSERT INTO subject_optimizations
       (user_id, email_id, original_subject, optimized_subjects, best_subject,
        improvement_score, target_audience, tone, click_appeal_score,
        urgency_score, clarity_score, personalization_suggestions,
        a_b_test_variants, ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        req.user.id,
        email_id || null,
        subject,
        JSON.stringify(optimization.optimizedSubjects),
        optimization.bestSubject,
        optimization.improvementScore,
        optimization.targetAudience,
        optimization.tone,
        optimization.clickAppealScore,
        optimization.urgencyScore,
        optimization.clarityScore,
        optimization.personalizationSuggestions,
        JSON.stringify(optimization.abTestVariants),
        optimization.aiConfidence,
        optimization.aiModel,
        optimization.aiResponse
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Optimize subject error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optimize subject from email
router.post('/optimize/:emailId', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { target_audience, purpose, tone, industry } = req.body;

    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.emailId, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const context = { targetAudience: target_audience, purpose, tone, industry };
    const optimization = await optimizeSubject(email.subject, context);

    const result = await pool.query(
      `INSERT INTO subject_optimizations
       (user_id, email_id, original_subject, optimized_subjects, best_subject,
        improvement_score, target_audience, tone, click_appeal_score,
        urgency_score, clarity_score, personalization_suggestions,
        a_b_test_variants, ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        req.user.id,
        email.id,
        email.subject,
        JSON.stringify(optimization.optimizedSubjects),
        optimization.bestSubject,
        optimization.improvementScore,
        optimization.targetAudience,
        optimization.tone,
        optimization.clickAppealScore,
        optimization.urgencyScore,
        optimization.clarityScore,
        optimization.personalizationSuggestions,
        JSON.stringify(optimization.abTestVariants),
        optimization.aiConfidence,
        optimization.aiModel,
        optimization.aiResponse
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Optimize subject error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual subject optimization
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email_id, original_subject, optimized_subjects, best_subject, improvement_score } = req.body;

    const result = await pool.query(
      `INSERT INTO subject_optimizations
       (user_id, email_id, original_subject, optimized_subjects, best_subject, improvement_score, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, 0)
       RETURNING *`,
      [req.user.id, email_id, original_subject, JSON.stringify(optimized_subjects), best_subject, improvement_score]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create subject optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update subject optimization
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { best_subject, improvement_score, target_audience, tone } = req.body;

    const result = await pool.query(
      `UPDATE subject_optimizations
       SET best_subject = COALESCE($1, best_subject),
           improvement_score = COALESCE($2, improvement_score),
           target_audience = COALESCE($3, target_audience),
           tone = COALESCE($4, tone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [best_subject, improvement_score, target_audience, tone, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject optimization not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update subject optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete subject optimization
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM subject_optimizations WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject optimization not found' });
    }

    res.json({ message: 'Subject optimization deleted successfully' });
  } catch (error) {
    console.error('Delete subject optimization error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
