const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { prioritizeForProductivity } = require('../services/aiService');

// Get all email priorities for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { action_required, batching_category } = req.query;
    let query = `
      SELECT ep.*, e.subject, e.from_email, e.from_name
      FROM email_priorities ep
      LEFT JOIN emails e ON ep.email_id = e.id
      WHERE ep.user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (action_required !== undefined) {
      query += ` AND ep.action_required = $${paramIndex}`;
      params.push(action_required === 'true');
      paramIndex++;
    }

    if (batching_category) {
      query += ` AND ep.batching_category = $${paramIndex}`;
      params.push(batching_category);
    }

    query += ' ORDER BY ep.productivity_score DESC, ep.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get email priorities error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single email priority
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ep.*, e.subject, e.from_email, e.from_name, e.body
       FROM email_priorities ep
       LEFT JOIN emails e ON ep.email_id = e.id
       WHERE ep.id = $1 AND ep.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email priority not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get email priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze email for productivity (AI-powered)
router.post('/analyze/:emailId', authenticateToken, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.emailId, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const analysis = await prioritizeForProductivity(email);

    const result = await pool.query(
      `INSERT INTO email_priorities
       (user_id, email_id, productivity_score, action_required, action_type,
        estimated_time_minutes, best_time_to_handle, delegation_suggestion,
        batching_category, focus_level_required, deadline, dependencies,
        ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        req.user.id,
        email.id,
        analysis.productivityScore,
        analysis.actionRequired,
        analysis.actionType,
        analysis.estimatedTimeMinutes,
        analysis.bestTimeToHandle,
        analysis.delegationSuggestion,
        analysis.batchingCategory,
        analysis.focusLevelRequired,
        analysis.deadline,
        analysis.dependencies,
        analysis.aiConfidence,
        analysis.aiModel,
        analysis.aiResponse
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Analyze email priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual email priority
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      email_id, productivity_score, action_required, action_type,
      estimated_time_minutes, best_time_to_handle, batching_category
    } = req.body;

    const result = await pool.query(
      `INSERT INTO email_priorities
       (user_id, email_id, productivity_score, action_required, action_type,
        estimated_time_minutes, best_time_to_handle, batching_category, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)
       RETURNING *`,
      [req.user.id, email_id, productivity_score, action_required, action_type,
       estimated_time_minutes, best_time_to_handle, batching_category]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create email priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update email priority
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      productivity_score, action_required, action_type,
      estimated_time_minutes, best_time_to_handle, delegation_suggestion,
      batching_category, focus_level_required, deadline, dependencies
    } = req.body;

    const result = await pool.query(
      `UPDATE email_priorities
       SET productivity_score = COALESCE($1, productivity_score),
           action_required = COALESCE($2, action_required),
           action_type = COALESCE($3, action_type),
           estimated_time_minutes = COALESCE($4, estimated_time_minutes),
           best_time_to_handle = COALESCE($5, best_time_to_handle),
           delegation_suggestion = COALESCE($6, delegation_suggestion),
           batching_category = COALESCE($7, batching_category),
           focus_level_required = COALESCE($8, focus_level_required),
           deadline = $9,
           dependencies = COALESCE($10, dependencies),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [productivity_score, action_required, action_type, estimated_time_minutes,
       best_time_to_handle, delegation_suggestion, batching_category,
       focus_level_required, deadline, dependencies, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email priority not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update email priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete email priority
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM email_priorities WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email priority not found' });
    }

    res.json({ message: 'Email priority deleted successfully' });
  } catch (error) {
    console.error('Delete email priority error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get productivity summary
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) as total_analyzed,
         AVG(productivity_score) as avg_productivity_score,
         SUM(CASE WHEN action_required = true THEN 1 ELSE 0 END) as action_required_count,
         SUM(estimated_time_minutes) as total_estimated_time,
         batching_category,
         COUNT(*) as category_count
       FROM email_priorities
       WHERE user_id = $1
       GROUP BY batching_category`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get productivity stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
