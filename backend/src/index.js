const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const { createTables } = require('./config/schema');

// Import routes
const authRoutes = require('./routes/auth');
const emailRoutes = require('./routes/emails');
const draftRoutes = require('./routes/drafts');
const templateRoutes = require('./routes/templates');
const contactRoutes = require('./routes/contacts');
const labelRoutes = require('./routes/labels');
const ruleRoutes = require('./routes/rules');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const categoryRoutes = require('./routes/categories');

// New AI Feature routes
const priorityScoresRoutes = require('./routes/priorityScores');
const meetingsRoutes = require('./routes/meetings');
const followupsRoutes = require('./routes/followups');
const templateSuggestionsRoutes = require('./routes/templateSuggestions');
const spamAnalysisRoutes = require('./routes/spamAnalysis');
const emailPrioritiesRoutes = require('./routes/emailPriorities');
const subjectOptimizationsRoutes = require('./routes/subjectOptimizations');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoryRoutes);

// New AI Feature routes
app.use('/api/priority-scores', priorityScoresRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/template-suggestions', templateSuggestionsRoutes);
app.use('/api/spam-analysis', spamAnalysisRoutes);
app.use('/api/email-priorities', emailPrioritiesRoutes);
app.use('/api/subject-optimizations', subjectOptimizationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await createTables();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
