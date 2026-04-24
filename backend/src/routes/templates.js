const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, search, limit, offset, sort, order } = req.query;

    let query = 'SELECT * FROM templates WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM templates WHERE user_id = $1';
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

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR body ILIKE $${paramIndex})`;
      countQuery += ` AND (name ILIKE $${countParamIndex} OR body ILIKE $${countParamIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    // Sort
    const validSorts = { name: 'name', usage_count: 'usage_count', created_at: 'created_at' };
    const sortCol = validSorts[sort] || 'usage_count';
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
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM templates WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, subject, body, category, tags } = req.body;

    const result = await pool.query(
      `INSERT INTO templates (user_id, name, subject, body, category, tags)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, subject, body, category, tags || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, subject, body, category, tags } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

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

    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(tags);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE templates SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
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
      `DELETE FROM templates WHERE id = ANY($1) AND user_id = $2 RETURNING id`,
      [ids, req.user.id]
    );
    res.json({ deleted: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete templates error:', error);
    res.status(500).json({ error: 'Failed to bulk delete templates' });
  }
});

// Delete template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Use template (increment usage count)
router.post('/:id/use', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE templates SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Use template error:', error);
    res.status(500).json({ error: 'Failed to use template' });
  }
});

module.exports = router;
