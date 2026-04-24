const pool = require('../config/database');

// Check if a condition matches an email
const matchCondition = (email, field, operator, value) => {
  const fieldValue = email[field]?.toString().toLowerCase() || '';
  const compareValue = value?.toLowerCase() || '';

  switch (operator) {
    case 'contains':
      return fieldValue.includes(compareValue);
    case 'equals':
      return fieldValue === compareValue;
    case 'starts_with':
      return fieldValue.startsWith(compareValue);
    case 'ends_with':
      return fieldValue.endsWith(compareValue);
    case 'not_contains':
      return !fieldValue.includes(compareValue);
    case 'not_equals':
      return fieldValue !== compareValue;
    default:
      return false;
  }
};

// Apply an action to an email
const applyAction = async (emailId, actionType, actionValue) => {
  switch (actionType) {
    case 'categorize':
    case 'set_category':
      await pool.query(
        'UPDATE emails SET category = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [actionValue, emailId]
      );
      break;
    case 'priority':
    case 'set_priority':
      await pool.query(
        'UPDATE emails SET priority = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [parseInt(actionValue), emailId]
      );
      break;
    case 'label':
    case 'add_label':
      // Get current labels and add new one
      const labelResult = await pool.query('SELECT labels FROM emails WHERE id = $1', [emailId]);
      const currentLabels = labelResult.rows[0]?.labels || [];
      if (!currentLabels.includes(actionValue)) {
        const newLabels = [...currentLabels, actionValue];
        await pool.query(
          'UPDATE emails SET labels = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newLabels, emailId]
        );
      }
      break;
    case 'star':
    case 'mark_starred':
      await pool.query(
        'UPDATE emails SET is_starred = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [actionValue === 'true' || actionValue === true, emailId]
      );
      break;
    case 'archive':
    case 'set_status':
      await pool.query(
        'UPDATE emails SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [actionType === 'archive' ? 'archived' : actionValue, emailId]
      );
      break;
    default:
      console.log(`Unknown action type: ${actionType}`);
  }
};

// Apply all active rules to an email
const applyRulesToEmail = async (email, userId) => {
  try {
    // Get all active rules for the user, ordered by priority
    const rulesResult = await pool.query(
      'SELECT * FROM rules WHERE user_id = $1 AND is_active = TRUE ORDER BY priority ASC',
      [userId]
    );

    const appliedRules = [];

    for (const rule of rulesResult.rows) {
      const matches = matchCondition(
        email,
        rule.condition_field,
        rule.condition_operator,
        rule.condition_value
      );

      if (matches) {
        await applyAction(email.id, rule.action_type, rule.action_value);
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action: rule.action_type,
          value: rule.action_value
        });
        console.log(`Rule "${rule.name}" applied to email ${email.id}`);
      }
    }

    return appliedRules;
  } catch (error) {
    console.error('Error applying rules:', error);
    return [];
  }
};

module.exports = {
  matchCondition,
  applyAction,
  applyRulesToEmail
};
