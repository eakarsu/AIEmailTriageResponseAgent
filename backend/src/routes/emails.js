const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { categorizeEmail, prioritizeEmail, analyzeEmailSentiment, extractActionItems, summarizeEmail } = require('../services/aiService');
const { applyRulesToEmail } = require('../services/rulesEngine');

const router = express.Router();

// Get all emails
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, status, priority, search, limit = 50, offset = 0, sort, order } = req.query;

    let query = 'SELECT * FROM emails WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM emails WHERE user_id = $1';
    const params = [req.user.id];
    const countParams = [req.user.id];
    let paramIndex = 2;
    let countParamIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      countQuery += ` AND category = $${countParamIndex}`;
      params.push(category);
      countParams.push(category);
      paramIndex++;
      countParamIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      countQuery += ` AND status = $${countParamIndex}`;
      params.push(status);
      countParams.push(status);
      paramIndex++;
      countParamIndex++;
    }

    if (priority) {
      query += ` AND priority = $${paramIndex}`;
      countQuery += ` AND priority = $${countParamIndex}`;
      params.push(parseInt(priority));
      countParams.push(parseInt(priority));
      paramIndex++;
      countParamIndex++;
    }

    if (search) {
      query += ` AND (subject ILIKE $${paramIndex} OR body ILIKE $${paramIndex} OR from_email ILIKE $${paramIndex})`;
      countQuery += ` AND (subject ILIKE $${countParamIndex} OR body ILIKE $${countParamIndex} OR from_email ILIKE $${countParamIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    // Sort
    const validSorts = { received_at: 'received_at', priority: 'priority', from_email: 'from_email' };
    const sortCol = validSorts[sort] || 'received_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortCol} ${sortOrder}`;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      emails: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get single email
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Create email (simulating receiving an email)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { from_email, from_name, to_email, subject, body, labels } = req.body;

    // Fetch user's custom categories with keywords
    const categoriesResult = await pool.query(
      'SELECT name, description, keywords FROM categories WHERE user_id = $1',
      [req.user.id]
    );
    const customCategories = categoriesResult.rows;

    // AI categorization and prioritization using custom categories
    const category = await categorizeEmail(subject, body, customCategories);
    const priorityResult = await prioritizeEmail(subject, body, from_email);

    const result = await pool.query(
      `INSERT INTO emails (user_id, from_email, from_name, to_email, subject, body, category, priority, priority_reason, labels)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.id, from_email, from_name, to_email, subject, body, category, priorityResult.priority, priorityResult.reason, labels || []]
    );

    const email = result.rows[0];

    // Apply auto-rules to the email
    const appliedRules = await applyRulesToEmail(email, req.user.id);

    // If rules were applied, fetch the updated email
    if (appliedRules.length > 0) {
      const updatedResult = await pool.query('SELECT * FROM emails WHERE id = $1', [email.id]);
      return res.status(201).json({ ...updatedResult.rows[0], appliedRules });
    }

    res.status(201).json(email);
  } catch (error) {
    console.error('Create email error:', error);
    res.status(500).json({ error: 'Failed to create email' });
  }
});

// Update email
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, is_starred, category, priority, labels } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (is_starred !== undefined) {
      updates.push(`is_starred = $${paramIndex}`);
      params.push(is_starred);
      paramIndex++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (labels !== undefined) {
      updates.push(`labels = $${paramIndex}`);
      params.push(labels);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE emails SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({ error: 'Failed to update email' });
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
      `DELETE FROM emails WHERE id = ANY($1) AND user_id = $2 RETURNING id`,
      [ids, req.user.id]
    );
    res.json({ deleted: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete emails error:', error);
    res.status(500).json({ error: 'Failed to bulk delete emails' });
  }
});

// Delete email
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM emails WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({ message: 'Email deleted successfully' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// AI: Categorize email
router.post('/:id/categorize', authenticateToken, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Fetch user's custom categories with keywords
    const categoriesResult = await pool.query(
      'SELECT name, description, keywords FROM categories WHERE user_id = $1',
      [req.user.id]
    );
    const customCategories = categoriesResult.rows;

    const email = emailResult.rows[0];
    const category = await categorizeEmail(email.subject, email.body, customCategories);

    const result = await pool.query(
      'UPDATE emails SET category = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [category, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Categorize email error:', error);
    res.status(500).json({ error: 'Failed to categorize email' });
  }
});

// AI: Prioritize email
router.post('/:id/prioritize', authenticateToken, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const priorityResult = await prioritizeEmail(email.subject, email.body, email.from_email);

    const result = await pool.query(
      'UPDATE emails SET priority = $1, priority_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [priorityResult.priority, priorityResult.reason, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Prioritize email error:', error);
    res.status(500).json({ error: 'Failed to prioritize email' });
  }
});

// AI: Analyze sentiment
router.post('/:id/sentiment', authenticateToken, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const sentiment = await analyzeEmailSentiment(email.body);

    // Save sentiment to database
    await pool.query(
      'UPDATE emails SET sentiment = $1, sentiment_confidence = $2, sentiment_tone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [sentiment.sentiment, sentiment.confidence, sentiment.tone, req.params.id]
    );

    res.json({ email_id: email.id, ...sentiment });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// AI: Extract action items
router.post('/:id/actions', authenticateToken, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const actions = await extractActionItems(email.body);

    // Save action items to database
    await pool.query(
      'UPDATE emails SET action_items = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(actions), req.params.id]
    );

    res.json({ email_id: email.id, ...actions });
  } catch (error) {
    console.error('Extract actions error:', error);
    res.status(500).json({ error: 'Failed to extract action items' });
  }
});

// AI: Summarize email
router.post('/:id/summarize', authenticateToken, async (req, res) => {
  try {
    const emailResult = await pool.query(
      'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];
    const summary = await summarizeEmail(email.body);

    // Save summary to database
    await pool.query(
      'UPDATE emails SET summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [summary, req.params.id]
    );

    res.json({ email_id: email.id, summary });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to summarize email' });
  }
});

// Batch categorize emails
router.post('/batch/categorize', authenticateToken, async (req, res) => {
  try {
    const { email_ids } = req.body;

    const results = [];
    for (const id of email_ids) {
      const emailResult = await pool.query(
        'SELECT * FROM emails WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (emailResult.rows.length > 0) {
        const email = emailResult.rows[0];
        const category = await categorizeEmail(email.subject, email.body);

        await pool.query(
          'UPDATE emails SET category = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [category, id]
        );

        results.push({ id, category });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Batch categorize error:', error);
    res.status(500).json({ error: 'Failed to batch categorize' });
  }
});

module.exports = router;
