const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../../middleware/rateLimiter');
const { suggestTemplateResponse } = require('../services/aiService');

// Get all template suggestions for user (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      'SELECT COUNT(*) FROM template_suggestions WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT ts.*, e.subject as email_subject, e.from_email, t.name as template_name
       FROM template_suggestions ts
       LEFT JOIN emails e ON ts.email_id = e.id
       LEFT JOIN templates t ON ts.template_id = t.id
       WHERE ts.user_id = $1
       ORDER BY ts.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get template suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single template suggestion
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ts.*, e.subject as email_subject, e.from_email, e.body as email_body,
              t.name as template_name, t.subject as template_subject, t.body as template_body
       FROM template_suggestions ts
       LEFT JOIN emails e ON ts.email_id = e.id
       LEFT JOIN templates t ON ts.template_id = t.id
       WHERE ts.id = $1 AND ts.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template suggestion not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get template suggestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Suggest template for email (AI-powered)
router.post('/suggest/:emailId', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    // Get email
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.emailId, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Get user's templates
    const templatesResult = await pool.query(
      'SELECT * FROM templates WHERE user_id = $1 ORDER BY usage_count DESC',
      [req.user.id]
    );

    const email = emailResult.rows[0];
    const templates = templatesResult.rows;

    if (templates.length === 0) {
      return res.json({ suggestion: null, message: 'No templates available' });
    }

    const emailContent = `Subject: ${email.subject}\n\nBody: ${email.body}`;
    const { suggestion, aiResponse } = await suggestTemplateResponse(emailContent, templates);

    if (!suggestion || !suggestion.templateId) {
      return res.json({ suggestion: null, message: 'No suitable template found', aiResponse });
    }

    // Save suggestion
    const result = await pool.query(
      `INSERT INTO template_suggestions
       (user_id, email_id, template_id, suggested_template_name, match_score,
        match_reasons, customization_suggestions, alternative_templates,
        ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        req.user.id,
        email.id,
        suggestion.templateId,
        suggestion.templateName,
        suggestion.matchScore,
        suggestion.matchReasons,
        suggestion.customizations,
        JSON.stringify(suggestion.alternatives),
        aiResponse?.duration ? 90 : 0,
        aiResponse?.model || null,
        aiResponse
      ]
    );

    // Get full template details
    const templateResult = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [suggestion.templateId]
    );

    res.json({
      suggestion: result.rows[0],
      template: templateResult.rows[0] || null
    });
  } catch (error) {
    console.error('Suggest template error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark suggestion as used
router.post('/:id/use', authenticateToken, async (req, res) => {
  try {
    // Get suggestion
    const suggestionResult = await pool.query(
      'SELECT * FROM template_suggestions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (suggestionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const suggestion = suggestionResult.rows[0];

    // Mark as used
    await pool.query(
      'UPDATE template_suggestions SET was_used = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.id]
    );

    // Increment template usage count
    if (suggestion.template_id) {
      await pool.query(
        'UPDATE templates SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [suggestion.template_id]
      );
    }

    res.json({ message: 'Suggestion marked as used' });
  } catch (error) {
    console.error('Use suggestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual suggestion
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email_id, template_id, match_score, match_reasons } = req.body;

    // Get template name
    const templateResult = await pool.query('SELECT name FROM templates WHERE id = $1', [template_id]);
    const templateName = templateResult.rows[0]?.name || null;

    const result = await pool.query(
      `INSERT INTO template_suggestions
       (user_id, email_id, template_id, suggested_template_name, match_score, match_reasons, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, 0)
       RETURNING *`,
      [req.user.id, email_id, template_id, templateName, match_score, match_reasons]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create suggestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update suggestion
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { template_id, match_score, match_reasons, customization_suggestions } = req.body;

    const result = await pool.query(
      `UPDATE template_suggestions
       SET template_id = COALESCE($1, template_id),
           match_score = COALESCE($2, match_score),
           match_reasons = COALESCE($3, match_reasons),
           customization_suggestions = COALESCE($4, customization_suggestions),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [template_id, match_score, match_reasons, customization_suggestions, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete suggestion
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM template_suggestions WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({ message: 'Suggestion deleted successfully' });
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
