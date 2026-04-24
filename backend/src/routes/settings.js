const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Create default settings if not exists
      const newSettings = await pool.query(
        'INSERT INTO settings (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
      return res.json(newSettings.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get single settings record by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM settings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      auto_categorize,
      auto_prioritize,
      ai_draft_responses,
      default_tone,
      notification_email,
      notification_push,
      theme,
      language
    } = req.body;

    // Check if settings exist
    const existing = await pool.query(
      'SELECT id FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    if (existing.rows.length === 0) {
      // Create settings
      result = await pool.query(
        `INSERT INTO settings (user_id, auto_categorize, auto_prioritize, ai_draft_responses, default_tone, notification_email, notification_push, theme, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [req.user.id, auto_categorize, auto_prioritize, ai_draft_responses, default_tone, notification_email, notification_push, theme, language]
      );
    } else {
      // Update settings
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (auto_categorize !== undefined) {
        updates.push(`auto_categorize = $${paramIndex}`);
        params.push(auto_categorize);
        paramIndex++;
      }

      if (auto_prioritize !== undefined) {
        updates.push(`auto_prioritize = $${paramIndex}`);
        params.push(auto_prioritize);
        paramIndex++;
      }

      if (ai_draft_responses !== undefined) {
        updates.push(`ai_draft_responses = $${paramIndex}`);
        params.push(ai_draft_responses);
        paramIndex++;
      }

      if (default_tone !== undefined) {
        updates.push(`default_tone = $${paramIndex}`);
        params.push(default_tone);
        paramIndex++;
      }

      if (notification_email !== undefined) {
        updates.push(`notification_email = $${paramIndex}`);
        params.push(notification_email);
        paramIndex++;
      }

      if (notification_push !== undefined) {
        updates.push(`notification_push = $${paramIndex}`);
        params.push(notification_push);
        paramIndex++;
      }

      if (theme !== undefined) {
        updates.push(`theme = $${paramIndex}`);
        params.push(theme);
        paramIndex++;
      }

      if (language !== undefined) {
        updates.push(`language = $${paramIndex}`);
        params.push(language);
        paramIndex++;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(req.user.id);

      result = await pool.query(
        `UPDATE settings SET ${updates.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
        params
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update settings by ID
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      auto_categorize,
      auto_prioritize,
      ai_draft_responses,
      default_tone,
      notification_email,
      notification_push,
      theme,
      language
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (auto_categorize !== undefined) {
      updates.push(`auto_categorize = $${paramIndex}`);
      params.push(auto_categorize);
      paramIndex++;
    }

    if (auto_prioritize !== undefined) {
      updates.push(`auto_prioritize = $${paramIndex}`);
      params.push(auto_prioritize);
      paramIndex++;
    }

    if (ai_draft_responses !== undefined) {
      updates.push(`ai_draft_responses = $${paramIndex}`);
      params.push(ai_draft_responses);
      paramIndex++;
    }

    if (default_tone !== undefined) {
      updates.push(`default_tone = $${paramIndex}`);
      params.push(default_tone);
      paramIndex++;
    }

    if (notification_email !== undefined) {
      updates.push(`notification_email = $${paramIndex}`);
      params.push(notification_email);
      paramIndex++;
    }

    if (notification_push !== undefined) {
      updates.push(`notification_push = $${paramIndex}`);
      params.push(notification_push);
      paramIndex++;
    }

    if (theme !== undefined) {
      updates.push(`theme = $${paramIndex}`);
      params.push(theme);
      paramIndex++;
    }

    if (language !== undefined) {
      updates.push(`language = $${paramIndex}`);
      params.push(language);
      paramIndex++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    params.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE settings SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Delete settings (reset to default)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM settings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    // Create new default settings
    const result = await pool.query(
      'INSERT INTO settings (user_id) VALUES ($1) RETURNING *',
      [req.user.id]
    );

    res.json({ message: 'Settings reset to default', settings: result.rows[0] });
  } catch (error) {
    console.error('Delete settings error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

module.exports = router;
