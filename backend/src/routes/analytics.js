const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all analytics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, search, limit, offset, sort, order } = req.query;

    let query = 'SELECT * FROM analytics WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM analytics WHERE user_id = $1';
    const params = [req.user.id];
    const countParams = [req.user.id];
    let paramIndex = 2;
    let countParamIndex = 2;

    if (start_date) {
      query += ` AND date >= $${paramIndex}`;
      countQuery += ` AND date >= $${countParamIndex}`;
      params.push(start_date);
      countParams.push(start_date);
      paramIndex++;
      countParamIndex++;
    }

    if (end_date) {
      query += ` AND date <= $${paramIndex}`;
      countQuery += ` AND date <= $${countParamIndex}`;
      params.push(end_date);
      countParams.push(end_date);
      paramIndex++;
      countParamIndex++;
    }

    if (search) {
      query += ` AND top_category ILIKE $${paramIndex}`;
      countQuery += ` AND top_category ILIKE $${countParamIndex}`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    // Sort
    const validSorts = { date: 'date', emails_received: 'emails_received', emails_sent: 'emails_sent', ai_responses_generated: 'ai_responses_generated' };
    const sortCol = validSorts[sort] || 'date';
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
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get dashboard summary - MUST be before /:id
router.get('/summary/dashboard', authenticateToken, async (req, res) => {
  try {
    // Total emails
    const emailsResult = await pool.query(
      'SELECT COUNT(*) as total FROM emails WHERE user_id = $1',
      [req.user.id]
    );

    // Unread emails
    const unreadResult = await pool.query(
      "SELECT COUNT(*) as total FROM emails WHERE user_id = $1 AND status = 'unread'",
      [req.user.id]
    );

    // Emails by category
    const categoriesResult = await pool.query(
      'SELECT category, COUNT(*) as count FROM emails WHERE user_id = $1 GROUP BY category',
      [req.user.id]
    );

    // Emails by priority
    const prioritiesResult = await pool.query(
      'SELECT priority, COUNT(*) as count FROM emails WHERE user_id = $1 GROUP BY priority ORDER BY priority',
      [req.user.id]
    );

    // Draft responses
    const draftsResult = await pool.query(
      'SELECT COUNT(*) as total FROM draft_responses WHERE user_id = $1',
      [req.user.id]
    );

    // AI-generated drafts
    const aiDraftsResult = await pool.query(
      'SELECT COUNT(*) as total FROM draft_responses WHERE user_id = $1 AND ai_generated = true',
      [req.user.id]
    );

    // Recent analytics
    const recentAnalytics = await pool.query(
      'SELECT * FROM analytics WHERE user_id = $1 ORDER BY date DESC LIMIT 7',
      [req.user.id]
    );

    res.json({
      totalEmails: parseInt(emailsResult.rows[0].total),
      unreadEmails: parseInt(unreadResult.rows[0].total),
      byCategory: categoriesResult.rows,
      byPriority: prioritiesResult.rows,
      totalDrafts: parseInt(draftsResult.rows[0].total),
      aiGeneratedDrafts: parseInt(aiDraftsResult.rows[0].total),
      recentAnalytics: recentAnalytics.rows
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Get single analytics record
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM analytics WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analytics record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Create/Update analytics for today
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { emails_received, emails_sent, emails_categorized, ai_responses_generated, avg_response_time, top_category } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Check if record exists for today
    const existing = await pool.query(
      'SELECT id FROM analytics WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE analytics SET
          emails_received = COALESCE($1, emails_received),
          emails_sent = COALESCE($2, emails_sent),
          emails_categorized = COALESCE($3, emails_categorized),
          ai_responses_generated = COALESCE($4, ai_responses_generated),
          avg_response_time = COALESCE($5, avg_response_time),
          top_category = COALESCE($6, top_category)
        WHERE id = $7 RETURNING *`,
        [emails_received, emails_sent, emails_categorized, ai_responses_generated, avg_response_time, top_category, existing.rows[0].id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO analytics (user_id, date, emails_received, emails_sent, emails_categorized, ai_responses_generated, avg_response_time, top_category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.user.id, today, emails_received || 0, emails_sent || 0, emails_categorized || 0, ai_responses_generated || 0, avg_response_time || 0, top_category]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create/Update analytics error:', error);
    res.status(500).json({ error: 'Failed to update analytics' });
  }
});

// Update analytics record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { emails_received, emails_sent, emails_categorized, ai_responses_generated, avg_response_time, top_category } = req.body;

    const result = await pool.query(
      `UPDATE analytics SET
        emails_received = COALESCE($1, emails_received),
        emails_sent = COALESCE($2, emails_sent),
        emails_categorized = COALESCE($3, emails_categorized),
        ai_responses_generated = COALESCE($4, ai_responses_generated),
        avg_response_time = COALESCE($5, avg_response_time),
        top_category = COALESCE($6, top_category)
      WHERE id = $7 AND user_id = $8 RETURNING *`,
      [emails_received, emails_sent, emails_categorized, ai_responses_generated, avg_response_time, top_category, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analytics record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update analytics error:', error);
    res.status(500).json({ error: 'Failed to update analytics' });
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
      `DELETE FROM analytics WHERE id = ANY($1) AND user_id = $2 RETURNING id`,
      [ids, req.user.id]
    );
    res.json({ deleted: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete analytics error:', error);
    res.status(500).json({ error: 'Failed to bulk delete analytics' });
  }
});

// Delete analytics record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM analytics WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analytics record not found' });
    }

    res.json({ message: 'Analytics record deleted successfully' });
  } catch (error) {
    console.error('Delete analytics error:', error);
    res.status(500).json({ error: 'Failed to delete analytics' });
  }
});

module.exports = router;
