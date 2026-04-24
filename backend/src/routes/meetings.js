const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { extractMeeting } = require('../services/aiService');

// Get all meetings for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, e.subject as email_subject, e.from_email, e.from_name
       FROM meetings m
       LEFT JOIN emails e ON m.email_id = e.id
       WHERE m.user_id = $1
       ORDER BY m.date DESC, m.time DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single meeting
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, e.subject as email_subject, e.from_email, e.from_name, e.body as email_body
       FROM meetings m
       LEFT JOIN emails e ON m.email_id = e.id
       WHERE m.id = $1 AND m.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract meeting from email (AI-powered)
router.post('/extract/:emailId', authenticateToken, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.emailId, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const extraction = await extractMeeting(email);

    if (!extraction.hasMeeting) {
      return res.json({ hasMeeting: false, message: 'No meeting found in this email', extraction });
    }

    const result = await pool.query(
      `INSERT INTO meetings
       (user_id, email_id, title, description, date, time, duration_minutes,
        location, meeting_type, attendees, agenda, action_items, calendar_link,
        is_confirmed, ai_confidence, ai_model, ai_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        req.user.id,
        email.id,
        extraction.title,
        extraction.description,
        extraction.date,
        extraction.time,
        extraction.durationMinutes,
        extraction.location,
        extraction.meetingType,
        extraction.attendees,
        extraction.agenda,
        extraction.actionItems,
        extraction.calendarLink,
        extraction.isConfirmed,
        extraction.aiConfidence,
        extraction.aiModel,
        extraction.aiResponse
      ]
    );

    res.json({ hasMeeting: true, meeting: result.rows[0] });
  } catch (error) {
    console.error('Extract meeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create manual meeting
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email_id, title, description, date, time, duration_minutes, location, meeting_type, attendees, agenda } = req.body;

    const result = await pool.query(
      `INSERT INTO meetings
       (user_id, email_id, title, description, date, time, duration_minutes,
        location, meeting_type, attendees, agenda, ai_confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0)
       RETURNING *`,
      [req.user.id, email_id, title, description, date, time, duration_minutes, location, meeting_type, attendees, agenda]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update meeting
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, date, time, duration_minutes, location, meeting_type, attendees, agenda, is_confirmed } = req.body;

    const result = await pool.query(
      `UPDATE meetings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           date = COALESCE($3, date),
           time = COALESCE($4, time),
           duration_minutes = COALESCE($5, duration_minutes),
           location = COALESCE($6, location),
           meeting_type = COALESCE($7, meeting_type),
           attendees = COALESCE($8, attendees),
           agenda = COALESCE($9, agenda),
           is_confirmed = COALESCE($10, is_confirmed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12
       RETURNING *`,
      [title, description, date, time, duration_minutes, location, meeting_type, attendees, agenda, is_confirmed, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete meeting
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM meetings WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
