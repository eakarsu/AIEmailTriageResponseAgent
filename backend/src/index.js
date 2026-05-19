const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: '../.env' });

const { createTables } = require('./config/schema');
const { startReminderJob } = require('./jobs/reminderJob');

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
const aiNewRoutes = require('./routes/aiNew');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API server
  crossOriginEmbedderPolicy: false
}));

// CORS allowlist from env (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

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
app.use('/api/ai', aiNewRoutes);
app.use('/api/agentic-inbox', require('./routes/agenticInbox'));
app.use('/api/sales-sequencing', require('./routes/salesSequencing'));
app.use('/api/support-routing', require('./routes/supportRouting'));
app.use('/api/executive-digest', require('./routes/executiveDigest'));
app.use('/api/writing-assistant', require('./routes/writingAssistant'));
app.use('/api/calendar-aware', require('./routes/calendarAware'));
app.use('/api/crm-sync', require('./routes/crmSync'));
app.use('/api/custom-views', require('./routes/customViews'));

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
    
// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('../routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Start reminder job with a 5-second delay to allow full startup
      setTimeout(startReminderJob, 5000);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
