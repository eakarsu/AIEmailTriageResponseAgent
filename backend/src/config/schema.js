const pool = require('./database');

const createTables = async () => {
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Emails table
    `CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      from_email VARCHAR(255) NOT NULL,
      from_name VARCHAR(255),
      to_email VARCHAR(255) NOT NULL,
      subject VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      category VARCHAR(100),
      priority INTEGER DEFAULT 3,
      priority_reason TEXT,
      status VARCHAR(50) DEFAULT 'unread',
      is_starred BOOLEAN DEFAULT FALSE,
      labels TEXT[],
      sentiment VARCHAR(50),
      sentiment_confidence INTEGER,
      sentiment_tone TEXT,
      action_items JSONB,
      summary TEXT,
      spam_score INTEGER DEFAULT 0,
      spam_analysis JSONB,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Draft Responses table
    `CREATE TABLE IF NOT EXISTS draft_responses (
      id SERIAL PRIMARY KEY,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subject VARCHAR(500),
      body TEXT NOT NULL,
      tone VARCHAR(50) DEFAULT 'professional',
      status VARCHAR(50) DEFAULT 'draft',
      ai_generated BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Templates table
    `CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      subject VARCHAR(500),
      body TEXT NOT NULL,
      category VARCHAR(100),
      tags TEXT[],
      usage_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      company VARCHAR(255),
      phone VARCHAR(50),
      notes TEXT,
      is_vip BOOLEAN DEFAULT FALSE,
      tags TEXT[],
      last_contacted TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Labels table
    `CREATE TABLE IF NOT EXISTS labels (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT '#3B82F6',
      description TEXT,
      email_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Rules table
    `CREATE TABLE IF NOT EXISTS rules (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      condition_field VARCHAR(50) NOT NULL,
      condition_operator VARCHAR(50) NOT NULL,
      condition_value VARCHAR(255) NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      action_value VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      priority INTEGER DEFAULT 1,
      times_applied INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Analytics table
    `CREATE TABLE IF NOT EXISTS analytics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      emails_received INTEGER DEFAULT 0,
      emails_sent INTEGER DEFAULT 0,
      emails_categorized INTEGER DEFAULT 0,
      ai_responses_generated INTEGER DEFAULT 0,
      avg_response_time INTEGER DEFAULT 0,
      top_category VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Settings table
    `CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      auto_categorize BOOLEAN DEFAULT TRUE,
      auto_prioritize BOOLEAN DEFAULT TRUE,
      ai_draft_responses BOOLEAN DEFAULT TRUE,
      default_tone VARCHAR(50) DEFAULT 'professional',
      notification_email BOOLEAN DEFAULT TRUE,
      notification_push BOOLEAN DEFAULT FALSE,
      theme VARCHAR(20) DEFAULT 'light',
      language VARCHAR(10) DEFAULT 'en',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Categories table
    `CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      color VARCHAR(20) DEFAULT '#6366F1',
      icon VARCHAR(50),
      keywords TEXT[],
      email_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Priority Scores table (AI Priority Scorer)
    `CREATE TABLE IF NOT EXISTS priority_scores (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      urgency_level VARCHAR(50),
      impact_score INTEGER,
      time_sensitivity VARCHAR(50),
      sender_importance VARCHAR(50),
      keywords_found TEXT[],
      reasoning TEXT,
      recommendations TEXT[],
      ai_confidence INTEGER DEFAULT 0,
      ai_model VARCHAR(100),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Meetings table (AI Meeting Extractor)
    `CREATE TABLE IF NOT EXISTS meetings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      title VARCHAR(500),
      description TEXT,
      date DATE,
      time TIME,
      duration_minutes INTEGER,
      location VARCHAR(255),
      meeting_type VARCHAR(100),
      attendees TEXT[],
      agenda TEXT[],
      action_items TEXT[],
      calendar_link VARCHAR(500),
      is_confirmed BOOLEAN DEFAULT FALSE,
      ai_confidence INTEGER DEFAULT 0,
      ai_model VARCHAR(100),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Follow-up Reminders table (AI Follow-up Reminder)
    `CREATE TABLE IF NOT EXISTS followup_reminders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      reminder_type VARCHAR(100),
      reminder_date TIMESTAMP,
      reason TEXT,
      priority VARCHAR(50),
      suggested_action TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      snoozed_until TIMESTAMP,
      completed_at TIMESTAMP,
      ai_confidence INTEGER DEFAULT 0,
      ai_model VARCHAR(100),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Template Suggestions table (AI Template Suggester)
    `CREATE TABLE IF NOT EXISTS template_suggestions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
      suggested_template_name VARCHAR(255),
      match_score INTEGER,
      match_reasons TEXT[],
      customization_suggestions TEXT[],
      alternative_templates JSONB,
      was_used BOOLEAN DEFAULT FALSE,
      ai_confidence INTEGER DEFAULT 0,
      ai_model VARCHAR(100),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Spam Analysis table (AI Spam Intelligence)
    `CREATE TABLE IF NOT EXISTS spam_analysis (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      spam_score INTEGER NOT NULL,
      is_spam BOOLEAN DEFAULT FALSE,
      spam_type VARCHAR(100),
      risk_level VARCHAR(50),
      indicators TEXT[],
      phishing_probability INTEGER DEFAULT 0,
      malware_risk INTEGER DEFAULT 0,
      sender_reputation VARCHAR(50),
      link_analysis JSONB,
      recommendation VARCHAR(100),
      ai_confidence INTEGER DEFAULT 0,
      ai_model VARCHAR(100),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Email Priorities table (AI Email Prioritizer - Productivity)
    `CREATE TABLE IF NOT EXISTS email_priorities (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE CASCADE,
      productivity_score INTEGER,
      action_required BOOLEAN DEFAULT FALSE,
      action_type VARCHAR(100),
      estimated_time_minutes INTEGER,
      best_time_to_handle VARCHAR(100),
      delegation_suggestion TEXT,
      batching_category VARCHAR(100),
      focus_level_required VARCHAR(50),
      deadline TIMESTAMP,
      dependencies TEXT[],
      ai_confidence INTEGER DEFAULT 0,
      ai_model VARCHAR(100),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Subject Optimizations table (AI Email Subject Optimizer - Marketing)
    `CREATE TABLE IF NOT EXISTS subject_optimizations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      email_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
      original_subject VARCHAR(500) NOT NULL,
      optimized_subjects JSONB,
      best_subject VARCHAR(500),
      improvement_score INTEGER,
      target_audience VARCHAR(500),
      tone VARCHAR(500),
      click_appeal_score INTEGER,
      urgency_score INTEGER,
      clarity_score INTEGER,
      personalization_suggestions TEXT[],
      a_b_test_variants JSONB,
      ai_confidence INTEGER DEFAULT 0,
      ai_model VARCHAR(100),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const query of queries) {
    try {
      await pool.query(query);
    } catch (error) {
      console.error('Error creating table:', error.message);
    }
  }

  // Add columns that may be missing from existing tables
  const alterQueries = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`,
  ];

  for (const query of alterQueries) {
    try {
      await pool.query(query);
    } catch (error) {
      // Ignore errors for columns that already exist
    }
  }

  console.log('All tables created successfully');
};

module.exports = { createTables };
