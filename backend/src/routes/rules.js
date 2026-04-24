const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all rules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_active, search, limit, offset, sort, order } = req.query;

    let query = 'SELECT * FROM rules WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM rules WHERE user_id = $1';
    const params = [req.user.id];
    const countParams = [req.user.id];
    let paramIndex = 2;
    let countParamIndex = 2;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      countQuery += ` AND is_active = $${countParamIndex}`;
      params.push(is_active === 'true');
      countParams.push(is_active === 'true');
      paramIndex++;
      countParamIndex++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      countQuery += ` AND (name ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    // Sort
    const validSorts = { name: 'name', priority: 'priority', times_applied: 'times_applied', created_at: 'created_at' };
    const sortCol = validSorts[sort] || 'priority';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
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
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// Get single rule
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rules WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// Create rule
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, condition_field, condition_operator, condition_value, action_type, action_value, priority } = req.body;

    const result = await pool.query(
      `INSERT INTO rules (user_id, name, description, condition_field, condition_operator, condition_value, action_type, action_value, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, name, description, condition_field, condition_operator, condition_value, action_type, action_value, priority || 1]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// Update rule
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, condition_field, condition_operator, condition_value, action_type, action_value, is_active, priority } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (condition_field !== undefined) {
      updates.push(`condition_field = $${paramIndex}`);
      params.push(condition_field);
      paramIndex++;
    }

    if (condition_operator !== undefined) {
      updates.push(`condition_operator = $${paramIndex}`);
      params.push(condition_operator);
      paramIndex++;
    }

    if (condition_value !== undefined) {
      updates.push(`condition_value = $${paramIndex}`);
      params.push(condition_value);
      paramIndex++;
    }

    if (action_type !== undefined) {
      updates.push(`action_type = $${paramIndex}`);
      params.push(action_type);
      paramIndex++;
    }

    if (action_value !== undefined) {
      updates.push(`action_value = $${paramIndex}`);
      params.push(action_value);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE rules SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
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
      `DELETE FROM rules WHERE id = ANY($1) AND user_id = $2 RETURNING id`,
      [ids, req.user.id]
    );
    res.json({ deleted: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete rules error:', error);
    res.status(500).json({ error: 'Failed to bulk delete rules' });
  }
});

// Delete rule
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM rules WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Toggle rule active status
router.post('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE rules SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle rule error:', error);
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

module.exports = router;
