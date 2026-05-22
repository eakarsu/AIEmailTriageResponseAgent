const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.json({
  summary: { inboxes: 8, breach_risk: 19, auto_replies_ready: 12, escalations: 5 },
  emails: [
    { subject: 'Enterprise renewal terms', sender: 'procurement@client.com', hours_left: 1, action: 'route to account owner' },
    { subject: 'Security questionnaire', sender: 'risk@partner.com', hours_left: 3, action: 'attach approved template' },
    { subject: 'Invoice issue', sender: 'ap@vendor.com', hours_left: 8, action: 'standard reply' },
  ],
}));

module.exports = router;
