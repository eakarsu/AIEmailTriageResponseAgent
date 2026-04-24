const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateDraftResponse } = require('../services/aiService');

const router = express.Router();

// Get all drafts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status, limit, offset, sort, order } = req.query;

    let query = `SELECT d.*, e.subject as original_subject, e.from_email, e.from_name
       FROM draft_responses d
       LEFT JOIN emails e ON d.email_id = e.id
       WHERE d.user_id = $1`;
    let countQuery = 'SELECT COUNT(*) FROM draft_responses d WHERE d.user_id = $1';
    const params = [req.user.id];
    const countParams = [req.user.id];
    let paramIndex = 2;
    let countParamIndex = 2;

    if (search) {
      query += ` AND (d.subject ILIKE $${paramIndex} OR d.body ILIKE $${paramIndex})`;
      countQuery += ` AND (d.subject ILIKE $${countParamIndex} OR d.body ILIKE $${countParamIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    if (status) {
      query += ` AND d.status = $${paramIndex}`;
      countQuery += ` AND d.status = $${countParamIndex}`;
      params.push(status);
      countParams.push(status);
      paramIndex++;
      countParamIndex++;
    }

    // Sort
    const validSorts = { created_at: 'd.created_at', status: 'd.status', tone: 'd.tone' };
    const sortCol = validSorts[sort] || 'd.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder}`;

    // If limit is provided, return paginated response
    if (limit) {
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset || 0));

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams)
      ]);

      return res.json({
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset || 0)
      });
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// Get single draft
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, e.subject as original_subject, e.body as original_body, e.from_email, e.from_name
       FROM draft_responses d
       LEFT JOIN emails e ON d.email_id = e.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get draft error:', error);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
});

// Create draft manually
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { email_id, subject, body, tone } = req.body;

    const result = await pool.query(
      `INSERT INTO draft_responses (email_id, user_id, subject, body, tone, ai_generated)
       VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *`,
      [email_id, req.user.id, subject, body, tone || 'professional']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create draft error:', error);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

// Generate AI draft response
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { email_id, tone } = req.body;

    // Get the original email
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [email_id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const draftResponse = await generateDraftResponse(
      email.subject,
      email.body,
      email.from_name || email.from_email,
      tone || 'professional'
    );

    // Save the draft
    const result = await pool.query(
      `INSERT INTO draft_responses (email_id, user_id, subject, body, tone, ai_generated)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [email_id, req.user.id, draftResponse.subject, draftResponse.body, tone || 'professional']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Generate draft error:', error);
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// Regenerate AI draft with different tone
router.post('/:id/regenerate', authenticateToken, async (req, res) => {
  try {
    const { tone } = req.body;

    // Get existing draft with email info
    const draftResult = await pool.query(
      `SELECT d.*, e.subject as original_subject, e.body as original_body, e.from_name, e.from_email
       FROM draft_responses d
       JOIN emails e ON d.email_id = e.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (draftResult.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const draft = draftResult.rows[0];
    const newDraft = await generateDraftResponse(
      draft.original_subject,
      draft.original_body,
      draft.from_name || draft.from_email,
      tone || draft.tone
    );

    // Update the draft
    await pool.query(
      `UPDATE draft_responses SET subject = $1, body = $2, tone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newDraft.subject, newDraft.body, tone || draft.tone, req.params.id]
    );

    // Fetch the updated draft with joined email data
    const result = await pool.query(
      `SELECT d.*, e.subject as original_subject, e.body as original_body, e.from_email, e.from_name
       FROM draft_responses d
       LEFT JOIN emails e ON d.email_id = e.id
       WHERE d.id = $1 AND d.user_id = $2`,
      [req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Regenerate draft error:', error);
    res.status(500).json({ error: 'Failed to regenerate draft' });
  }
});

// Update draft
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { subject, body, status, tone } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (subject !== undefined) {
      updates.push(`subject = $${paramIndex}`);
      params.push(subject);
      paramIndex++;
    }

    if (body !== undefined) {
      updates.push(`body = $${paramIndex}`);
      params.push(body);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (tone !== undefined) {
      updates.push(`tone = $${paramIndex}`);
      params.push(tone);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE draft_responses SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update draft error:', error);
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

// Bulk delete - MUST be registered BEFORE /:id routes
router.delete('/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await pool.query(
      `DELETE FROM draft_responses WHERE id = ANY($1) AND user_id = $2 RETURNING id`,
      [ids, req.user.id]
    );
    res.json({ deleted: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete drafts error:', error);
    res.status(500).json({ error: 'Failed to bulk delete drafts' });
  }
});

// Delete draft
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM draft_responses WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// Send draft (mark as sent)
router.post('/:id/send', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE draft_responses SET status = 'sent', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Update the original email status
    if (result.rows[0].email_id) {
      await pool.query(
        "UPDATE emails SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [result.rows[0].email_id]
      );
    }

    res.json({ message: 'Draft sent successfully', draft: result.rows[0] });
  } catch (error) {
    console.error('Send draft error:', error);
    res.status(500).json({ error: 'Failed to send draft' });
  }
});

module.exports = router;
