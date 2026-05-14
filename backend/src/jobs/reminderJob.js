const pool = require('../config/database');

let nodemailer = null;
let transporter = null;

// Gracefully try to load nodemailer
try {
  nodemailer = require('nodemailer');
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('SMTP transporter configured for reminder job.');
  } else {
    console.log('SMTP not configured. Reminder emails will be skipped (in-app notifications only).');
  }
} catch (e) {
  console.log('nodemailer not available. Reminder emails will be skipped.');
}

async function ensureNotificationsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(100) DEFAULT 'reminder',
        title VARCHAR(500),
        message TEXT,
        related_entity_type VARCHAR(100),
        related_entity_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('Failed to create notifications table:', err.message);
  }
}

async function processReminders() {
  try {
    // Fetch overdue pending reminders
    const result = await pool.query(
      `SELECT fr.*, e.subject as email_subject, u.email as user_email, u.name as user_name
       FROM followup_reminders fr
       JOIN emails e ON fr.email_id = e.id
       JOIN users u ON fr.user_id = u.id
       WHERE fr.reminder_date <= NOW()
         AND fr.status = 'pending'
         AND (fr.snoozed_until IS NULL OR fr.snoozed_until <= NOW())
       LIMIT 50`
    );

    if (result.rows.length === 0) return;

    console.log(`[ReminderJob] Processing ${result.rows.length} overdue reminders...`);

    for (const reminder of result.rows) {
      // Send email if SMTP configured
      if (transporter) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: reminder.user_email,
            subject: `Follow-up Reminder: ${reminder.email_subject}`,
            text: `Hi ${reminder.user_name},\n\nThis is a reminder to follow up on the email: "${reminder.email_subject}".\n\nReason: ${reminder.reason || 'N/A'}\nSuggested action: ${reminder.suggested_action || 'N/A'}\n\nBest regards,\nEmail Triage Agent`
          });
          console.log(`[ReminderJob] Email sent to ${reminder.user_email} for reminder ${reminder.id}`);
        } catch (emailErr) {
          console.warn(`[ReminderJob] Failed to send email for reminder ${reminder.id}:`, emailErr.message);
        }
      }

      // Create in-app notification
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id)
           VALUES ($1, 'reminder', $2, $3, 'followup_reminder', $4)`,
          [
            reminder.user_id,
            `Follow-up: ${reminder.email_subject}`,
            reminder.reason || `Time to follow up on "${reminder.email_subject}"`,
            reminder.id
          ]
        );
      } catch (notifErr) {
        console.warn(`[ReminderJob] Failed to create notification for reminder ${reminder.id}:`, notifErr.message);
      }

      // Mark reminder as sent
      await pool.query(
        `UPDATE followup_reminders SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [reminder.id]
      );
    }

    console.log(`[ReminderJob] Processed ${result.rows.length} reminders.`);
  } catch (err) {
    console.error('[ReminderJob] Error processing reminders:', err.message);
  }
}

function startReminderJob() {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  ensureNotificationsTable().then(() => {
    console.log('[ReminderJob] Starting follow-up reminder job (every 15 minutes).');
    // Run immediately, then on interval
    processReminders();
    setInterval(processReminders, INTERVAL_MS);
  });
}

module.exports = { startReminderJob, processReminders };
