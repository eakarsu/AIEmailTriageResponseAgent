const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all labels
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, limit, offset, sort, order } = req.query;

    let query = 'SELECT * FROM labels WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM labels WHERE user_id = $1';
    const params = [req.user.id];
    const countParams = [req.user.id];
    let paramIndex = 2;
    let countParamIndex = 2;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      countQuery += ` AND (name ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
      countParamIndex++;
    }

    // Sort
    const validSorts = { name: 'name', email_count: 'email_count', created_at: 'created_at' };
    const sortCol = validSorts[sort] || 'name';
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
    console.error('Get labels error:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// Get single label
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM labels WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get label error:', error);
    res.status(500).json({ error: 'Failed to fetch label' });
  }
});

// Create label
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, color, description } = req.body;

    const result = await pool.query(
      `INSERT INTO labels (user_id, name, color, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, color || '#3B82F6', description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// Update label
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, color, description } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      params.push(color);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE labels SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
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
      `DELETE FROM labels WHERE id = ANY($1) AND user_id = $2 RETURNING id`,
      [ids, req.user.id]
    );
    res.json({ deleted: result.rowCount, ids: result.rows.map(r => r.id) });
  } catch (error) {
    console.error('Bulk delete labels error:', error);
    res.status(500).json({ error: 'Failed to bulk delete labels' });
  }
});

// Delete label
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM labels WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Label not found' });
    }

    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

module.exports = router;
