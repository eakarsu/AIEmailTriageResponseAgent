const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../../middleware/rateLimiter');
const { suggestFollowUp } = require('../services/aiService');

// Get all follow-up reminders for user (paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const params = [req.user.id];
    let where = 'WHERE f.user_id = $1';
    if (status) {
      params.push(status);
      where += ` AND f.status = $${params.length}`;
    }

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM followup_reminders f ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const result = await pool.query(
      `SELECT f.*, e.subject as email_subject, e.from_email, e.from_name
       FROM followup_reminders f
       LEFT JOIN emails e ON f.email_id = e.id
       ${where}
       ORDER BY f.reminder_date ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get follow-ups error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single follow-up
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, e.subject as email_subject, e.from_email, e.from_name, e.body as email_body
       FROM followup_reminders f
       LEFT JOIN emails e ON f.email_id = e.id
       WHERE f.id = $1 AND f.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get follow-up error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Suggest follow-up from email (AI-powered)
router.post('/suggest/:emailId', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.emailId, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const suggestion = await suggestFollowUp(email);

    if (!suggestion.needsFollowUp) {
      return res.json({ needsFollowUp: false, message: 'No follow-up needed for this email', suggestion });
    }

    // Calculate reminder date
    let reminderDate = suggestion.suggestedDate;
    if (reminderDate && suggestion.suggestedTime) {
      reminderDate = `${suggestion.suggestedDate} ${suggestion.suggestedTime}`;
    }

    const result = await pool.query(
      `INSERT INTO followup_reminders
       (user_id, email_id, reminder_type, reminder_date, reason, priority,
        suggested_action, status, ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
       RETURNING *`,
      [
        req.user.id,
        email.id,
        suggestion.reminderType,
        reminderDate,
        suggestion.reason,
        suggestion.priority,
        suggestion.suggestedAction,
        suggestion.aiConfidence,
        suggestion.aiModel,
        suggestion.aiResponse
      ]
    );

    res.json({ needsFollowUp: true, followup: result.rows[0] });
  } catch (error) {
    console.error('Suggest follow-up error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual follow-up
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email_id, reminder_type, reminder_date, reason, priority, suggested_action, notes } = req.body;

    const result = await pool.query(
      `INSERT INTO followup_reminders
       (user_id, email_id, reminder_type, reminder_date, reason, priority, suggested_action, notes, status, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 0)
       RETURNING *`,
      [req.user.id, email_id, reminder_type, reminder_date, reason, priority, suggested_action, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create follow-up error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update follow-up
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { reminder_type, reminder_date, reason, priority, suggested_action, status, notes, snoozed_until } = req.body;

    const result = await pool.query(
      `UPDATE followup_reminders
       SET reminder_type = COALESCE($1, reminder_type),
           reminder_date = COALESCE($2, reminder_date),
           reason = COALESCE($3, reason),
           priority = COALESCE($4, priority),
           suggested_action = COALESCE($5, suggested_action),
           status = COALESCE($6, status),
           notes = COALESCE($7, notes),
           snoozed_until = $8,
           completed_at = CASE WHEN $6 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [reminder_type, reminder_date, reason, priority, suggested_action, status, notes, snoozed_until, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update follow-up error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark follow-up as complete
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE followup_reminders
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Complete follow-up error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Snooze follow-up
router.post('/:id/snooze', authenticateToken, async (req, res) => {
  try {
    const { snoozed_until } = req.body;

    const result = await pool.query(
      `UPDATE followup_reminders
       SET status = 'snoozed', snoozed_until = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [snoozed_until, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Snooze follow-up error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete follow-up
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM followup_reminders WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json({ message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error('Delete follow-up error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
