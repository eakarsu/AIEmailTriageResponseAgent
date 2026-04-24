const bcrypt = require('bcryptjs');
const pool = require('./config/database');
const { createTables } = require('./config/schema');
require('dotenv').config({ path: '../.env' });

const seedDatabase = async () => {
  try {
    console.log('Creating tables...');
    await createTables();

    // Create demo user
    console.log('Creating demo user...');
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const userResult = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password = $2
       RETURNING id`,
      ['demo@example.com', hashedPassword, 'Demo User', 'admin']
    );
    const userId = userResult.rows[0].id;

    // Clear existing data for demo user
    console.log('Clearing existing data...');
    await pool.query('DELETE FROM subject_optimizations WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM email_priorities WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM spam_analysis WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM template_suggestions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM followup_reminders WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM meetings WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM priority_scores WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM analytics WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM draft_responses WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM emails WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM templates WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM contacts WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM labels WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM rules WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM categories WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM settings WHERE user_id = $1', [userId]);

    // Seed Emails (18 items)
    console.log('Seeding emails...');
    const emails = [
      { from_email: 'john.smith@acmecorp.com', from_name: 'John Smith', to_email: 'demo@example.com', subject: 'URGENT: Project Deadline Tomorrow', body: 'Hi, I need to remind you that the project deadline is tomorrow. Please make sure all deliverables are ready. This is critical for our Q1 goals. We cannot afford any delays. Please confirm receipt of this email ASAP.', category: 'Urgent', priority: 1, priority_reason: 'Critical deadline mentioned', status: 'unread' },
      { from_email: 'sarah.jones@techstart.io', from_name: 'Sarah Jones', to_email: 'demo@example.com', subject: 'Partnership Opportunity Discussion', body: 'Dear Team, I would like to discuss a potential partnership between our companies. TechStart has been growing rapidly and we believe there could be significant synergies. Would you be available for a call next week?', category: 'Partnership', priority: 2, priority_reason: 'Business opportunity', status: 'unread' },
      { from_email: 'support@cloudservices.net', from_name: 'Cloud Services Support', to_email: 'demo@example.com', subject: 'Your Support Ticket #45678 Update', body: 'Your support ticket regarding server downtime has been updated. Our team has identified the issue and is working on a fix. Expected resolution time is within 4 hours. We apologize for any inconvenience.', category: 'Support', priority: 2, priority_reason: 'Active support issue', status: 'read' },
      { from_email: 'marketing@newsletter.com', from_name: 'Marketing Weekly', to_email: 'demo@example.com', subject: 'Top Marketing Trends for 2024', body: 'This week in marketing: AI-powered personalization is transforming customer engagement. Learn how top brands are leveraging machine learning to create hyper-targeted campaigns. Plus, social commerce updates and more.', category: 'Marketing', priority: 4, priority_reason: 'Newsletter content', status: 'read' },
      { from_email: 'hr@bigcompany.com', from_name: 'HR Department', to_email: 'demo@example.com', subject: 'Interview Schedule Confirmation', body: 'Dear Candidate, We are pleased to confirm your interview for the Senior Developer position. The interview will be held on Monday at 2:00 PM via Zoom. Please ensure you have a stable internet connection. Meeting link: https://zoom.us/j/123456789', category: 'HR', priority: 2, priority_reason: 'Interview scheduled', status: 'unread' },
      { from_email: 'billing@saasplatform.io', from_name: 'SaaS Billing', to_email: 'demo@example.com', subject: 'Invoice #INV-2024-001 - Payment Due', body: 'Your invoice for January 2024 is now available. Total amount due: $299.00. Payment is due within 30 days. You can pay online through our billing portal or via bank transfer. Thank you for your business.', category: 'Finance', priority: 3, priority_reason: 'Invoice payment', status: 'unread' },
      { from_email: 'mike.dev@github.com', from_name: 'Mike Developer', to_email: 'demo@example.com', subject: 'Pull Request Review Request', body: 'Hey, I have submitted a pull request for the new authentication module. Could you please review it when you get a chance? The changes include OAuth2 integration and improved security measures. Let me know if you have any questions.', category: 'Technical', priority: 3, priority_reason: 'Code review needed', status: 'unread' },
      { from_email: 'sales@competitor.com', from_name: 'Sales Team', to_email: 'demo@example.com', subject: 'Special Offer: 50% Off Enterprise Plan', body: 'Exclusive offer for a limited time! Get 50% off our Enterprise plan for the first year. This includes unlimited users, priority support, and advanced analytics. Dont miss out on this opportunity! Click here to claim your discount.', category: 'Sales', priority: 4, priority_reason: 'Promotional email', status: 'read' },
      { from_email: 'alice.manager@company.com', from_name: 'Alice Manager', to_email: 'demo@example.com', subject: 'Weekly Team Meeting - Wednesday 10 AM', body: 'Hi Team, Reminder for our weekly meeting this Wednesday at 10 AM in Conference Room B. Agenda: 1. Project updates 2. Resource allocation 3. Q2 planning 4. Open discussion. Please come prepared with your updates.', category: 'General', priority: 3, priority_reason: 'Regular meeting', status: 'unread' },
      { from_email: 'security@alerts.com', from_name: 'Security Alert', to_email: 'demo@example.com', subject: 'CRITICAL: Unusual Login Activity Detected', body: 'We detected an unusual login attempt on your account from an unrecognized device in a different location. If this was not you, please change your password immediately and enable two-factor authentication.', category: 'Urgent', priority: 1, priority_reason: 'Security alert', status: 'unread' },
      { from_email: 'vendor@supplies.com', from_name: 'Supplies Vendor', to_email: 'demo@example.com', subject: 'Order Confirmation #ORD-78901', body: 'Thank you for your order! Your office supplies order has been confirmed and will be shipped within 2 business days. Tracking information will be sent once the package is dispatched.', category: 'General', priority: 4, priority_reason: 'Order confirmation', status: 'read' },
      { from_email: 'ceo@startup.io', from_name: 'CEO StartupIO', to_email: 'demo@example.com', subject: 'Investment Opportunity Presentation', body: 'Dear Investor, I would like to invite you to our exclusive presentation on investment opportunities in the AI sector. Our startup has shown 300% growth this year and we are looking for strategic partners.', category: 'Partnership', priority: 2, priority_reason: 'Investment opportunity', status: 'unread' },
      { from_email: 'training@learning.com', from_name: 'Learning Platform', to_email: 'demo@example.com', subject: 'New Course Available: Advanced React', body: 'A new course is now available in your learning path: Advanced React Patterns. This course covers hooks, context, performance optimization, and testing. Start learning today!', category: 'General', priority: 5, priority_reason: 'Educational content', status: 'read' },
      { from_email: 'legal@lawfirm.com', from_name: 'Legal Department', to_email: 'demo@example.com', subject: 'Contract Review Required by Friday', body: 'Please review the attached contract for the new vendor agreement. We need your approval by end of day Friday to proceed with the partnership. Let me know if you have any concerns or questions.', category: 'Urgent', priority: 1, priority_reason: 'Legal deadline', status: 'unread' },
      { from_email: 'customer@client.com', from_name: 'Important Client', to_email: 'demo@example.com', subject: 'Feature Request: Custom Reporting', body: 'We have been using your platform for 6 months now and love it. However, we would like to request a custom reporting feature that allows us to export data in specific formats. Is this something you can accommodate?', category: 'Support', priority: 2, priority_reason: 'VIP customer request', status: 'unread' },
      { from_email: 'newsletter@industry.com', from_name: 'Industry News', to_email: 'demo@example.com', subject: 'Weekly Industry Digest', body: 'This weeks top stories: Major tech acquisitions, new regulations affecting SaaS companies, and emerging trends in cloud computing. Read more in our full newsletter.', category: 'Marketing', priority: 5, priority_reason: 'Newsletter', status: 'read' },
      { from_email: 'ops@infrastructure.io', from_name: 'DevOps Team', to_email: 'demo@example.com', subject: 'Scheduled Maintenance Notice', body: 'Please be advised that we will be performing scheduled maintenance on our servers this Saturday from 2 AM to 6 AM EST. Services may be intermittently unavailable during this window.', category: 'Technical', priority: 3, priority_reason: 'Maintenance notice', status: 'unread' },
      { from_email: 'events@conference.com', from_name: 'Tech Conference', to_email: 'demo@example.com', subject: 'Speaker Invitation: Tech Summit 2024', body: 'We would be honored to have you as a speaker at Tech Summit 2024. The event will be held in San Francisco on March 15-17. Please let us know if you are interested in participating.', category: 'Partnership', priority: 2, priority_reason: 'Speaking opportunity', status: 'unread' }
    ];

    const emailIds = [];
    for (const email of emails) {
      const result = await pool.query(
        `INSERT INTO emails (user_id, from_email, from_name, to_email, subject, body, category, priority, priority_reason, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [userId, email.from_email, email.from_name, email.to_email, email.subject, email.body, email.category, email.priority, email.priority_reason, email.status]
      );
      emailIds.push(result.rows[0].id);
    }

    // Seed Draft Responses (15 items)
    console.log('Seeding draft responses...');
    const drafts = [
      { email_id: emailIds[0], subject: 'Re: URGENT: Project Deadline Tomorrow', body: 'Hi John,\n\nThank you for the reminder. I have reviewed all deliverables and everything is on track. The final documents will be submitted by EOD today.\n\nBest regards', tone: 'professional', status: 'draft' },
      { email_id: emailIds[1], subject: 'Re: Partnership Opportunity Discussion', body: 'Dear Sarah,\n\nThank you for reaching out about the partnership opportunity. We would be very interested in exploring potential synergies between our companies.\n\nI am available for a call next Tuesday or Wednesday afternoon. Please let me know what works best for you.\n\nBest regards', tone: 'professional', status: 'draft' },
      { email_id: emailIds[2], subject: 'Re: Your Support Ticket #45678 Update', body: 'Thank you for the update. I appreciate the quick response from your team. Please keep me posted on the resolution progress.\n\nRegards', tone: 'friendly', status: 'draft' },
      { email_id: emailIds[4], subject: 'Re: Interview Schedule Confirmation', body: 'Dear HR Team,\n\nThank you for confirming the interview schedule. I have noted the date and time and will ensure I have a stable connection for the video call.\n\nLooking forward to the interview.\n\nBest regards', tone: 'formal', status: 'draft' },
      { email_id: emailIds[5], subject: 'Re: Invoice #INV-2024-001 - Payment Due', body: 'Hello,\n\nThank you for sending the invoice. I have processed the payment through your billing portal. Please confirm receipt.\n\nRegards', tone: 'professional', status: 'sent' },
      { email_id: emailIds[6], subject: 'Re: Pull Request Review Request', body: 'Hey Mike,\n\nThanks for the heads up! I will review the PR today and provide feedback. The OAuth2 integration sounds great - excited to see the implementation.\n\nCheers', tone: 'casual', status: 'draft' },
      { email_id: emailIds[8], subject: 'Re: Weekly Team Meeting Agenda', body: 'Hi Alice,\n\nThanks for sharing the agenda. I have prepared my updates and will be ready for the meeting.\n\nSee you tomorrow!\n\nBest', tone: 'friendly', status: 'sent' },
      { email_id: emailIds[9], subject: 'Re: CRITICAL: Unusual Login Activity Detected', body: 'Thank you for the alert. I have immediately changed my password and enabled two-factor authentication. The login attempt was not from me.\n\nPlease advise if there are any additional security measures I should take.\n\nRegards', tone: 'professional', status: 'sent' },
      { email_id: emailIds[11], subject: 'Re: Investment Opportunity Presentation', body: 'Dear CEO,\n\nThank you for the invitation to your investment presentation. I am interested in learning more about your AI sector opportunities.\n\nPlease share the presentation details and schedule.\n\nBest regards', tone: 'formal', status: 'draft' },
      { email_id: emailIds[13], subject: 'Re: Contract Review Required by Friday', body: 'Dear Legal Team,\n\nI have reviewed the contract and have a few questions regarding sections 3.2 and 5.1. Could we schedule a brief call to discuss before I provide final approval?\n\nThank you', tone: 'professional', status: 'draft' },
      { email_id: emailIds[14], subject: 'Re: Feature Request: Custom Reporting', body: 'Dear Valued Customer,\n\nThank you for your positive feedback and for the feature request. Custom reporting is something we have been considering, and your input is very valuable.\n\nI have forwarded your request to our product team. We will keep you updated on the progress.\n\nBest regards', tone: 'professional', status: 'draft' },
      { email_id: emailIds[16], subject: 'Re: Scheduled Maintenance Notice', body: 'Thank you for the advance notice about the maintenance window. We will plan accordingly and inform our team about the potential service interruption.\n\nRegards', tone: 'professional', status: 'sent' },
      { email_id: emailIds[17], subject: 'Re: Speaker Invitation: Tech Summit 2024', body: 'Dear Conference Team,\n\nThank you for the speaking invitation. I am honored and would be delighted to participate in Tech Summit 2024.\n\nPlease share more details about the topics you would like me to cover and the logistics.\n\nBest regards', tone: 'formal', status: 'draft' },
      { email_id: emailIds[3], subject: 'Re: Top Marketing Trends for 2024', body: 'Thank you for sharing these insights. The information about AI-powered personalization was particularly interesting. Please keep sending these updates.\n\nBest', tone: 'friendly', status: 'draft' },
      { email_id: emailIds[7], subject: 'Re: Special Offer: 50% Off Enterprise Plan', body: 'Thank you for the offer. We are currently evaluating our needs and will reach out if we decide to upgrade our plan.\n\nRegards', tone: 'professional', status: 'draft' }
    ];

    for (const draft of drafts) {
      await pool.query(
        `INSERT INTO draft_responses (email_id, user_id, subject, body, tone, status, ai_generated)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [draft.email_id, userId, draft.subject, draft.body, draft.tone, draft.status]
      );
    }

    // Seed Templates (16 items)
    console.log('Seeding templates...');
    const templates = [
      { name: 'Professional Thank You', subject: 'Thank You', body: 'Dear [Name],\n\nThank you for [reason]. I truly appreciate your [time/effort/support].\n\nBest regards,\n[Your Name]', category: 'General', tags: ['thanks', 'professional'] },
      { name: 'Meeting Request', subject: 'Meeting Request: [Topic]', body: 'Dear [Name],\n\nI would like to schedule a meeting to discuss [topic]. Would you be available [proposed times]?\n\nPlease let me know what works best for you.\n\nBest regards,\n[Your Name]', category: 'General', tags: ['meeting', 'schedule'] },
      { name: 'Follow-up After Meeting', subject: 'Follow-up: [Meeting Topic]', body: 'Hi [Name],\n\nThank you for taking the time to meet with me today. As discussed, here are the key action items:\n\n1. [Action item 1]\n2. [Action item 2]\n3. [Action item 3]\n\nPlease let me know if I missed anything.\n\nBest regards,\n[Your Name]', category: 'General', tags: ['follow-up', 'meeting'] },
      { name: 'Support Acknowledgment', subject: 'Re: [Ticket Subject]', body: 'Dear [Customer Name],\n\nThank you for contacting our support team. We have received your request and a support specialist will be in touch within [timeframe].\n\nYour ticket number is: [Ticket #]\n\nBest regards,\nSupport Team', category: 'Support', tags: ['support', 'acknowledgment'] },
      { name: 'Issue Resolution', subject: 'Re: [Issue Subject] - Resolved', body: 'Dear [Customer Name],\n\nI am pleased to inform you that the issue you reported has been resolved. [Brief explanation of the fix]\n\nPlease let us know if you experience any further issues.\n\nBest regards,\nSupport Team', category: 'Support', tags: ['support', 'resolved'] },
      { name: 'Sales Introduction', subject: 'Introduction: [Company Name]', body: 'Dear [Name],\n\nI hope this email finds you well. My name is [Your Name] from [Company Name].\n\nI am reaching out because [reason]. Our solution helps companies like yours [benefit].\n\nWould you be interested in a brief call to learn more?\n\nBest regards,\n[Your Name]', category: 'Sales', tags: ['sales', 'introduction'] },
      { name: 'Proposal Follow-up', subject: 'Following Up: Proposal for [Project]', body: 'Dear [Name],\n\nI wanted to follow up on the proposal I sent on [date] regarding [project]. Have you had a chance to review it?\n\nI would be happy to answer any questions or discuss any concerns you might have.\n\nBest regards,\n[Your Name]', category: 'Sales', tags: ['sales', 'follow-up', 'proposal'] },
      { name: 'Invoice Reminder', subject: 'Reminder: Invoice #[Number] Due', body: 'Dear [Name],\n\nThis is a friendly reminder that invoice #[Number] for [Amount] is due on [Date].\n\nIf you have already made the payment, please disregard this message.\n\nBest regards,\nAccounting Team', category: 'Finance', tags: ['invoice', 'reminder', 'finance'] },
      { name: 'Payment Confirmation', subject: 'Payment Received - Thank You', body: 'Dear [Name],\n\nThank you for your payment of [Amount] for invoice #[Number]. Your payment has been received and processed.\n\nPlease keep this email for your records.\n\nBest regards,\nAccounting Team', category: 'Finance', tags: ['payment', 'confirmation', 'finance'] },
      { name: 'Job Application Response', subject: 'Re: Application for [Position]', body: 'Dear [Applicant Name],\n\nThank you for your interest in the [Position] role at [Company Name]. We have received your application and will review it carefully.\n\nWe will be in touch within [timeframe] regarding next steps.\n\nBest regards,\nHR Team', category: 'HR', tags: ['hr', 'application', 'recruitment'] },
      { name: 'Interview Invitation', subject: 'Interview Invitation: [Position]', body: 'Dear [Applicant Name],\n\nWe are pleased to invite you for an interview for the [Position] role. The interview will be held on [Date] at [Time] via [Location/Platform].\n\nPlease confirm your availability.\n\nBest regards,\nHR Team', category: 'HR', tags: ['hr', 'interview', 'recruitment'] },
      { name: 'Technical Documentation', subject: 'Documentation: [Feature/API]', body: 'Hi Team,\n\nAttached please find the documentation for [Feature/API]. Key points include:\n\n- [Point 1]\n- [Point 2]\n- [Point 3]\n\nPlease review and let me know if you have any questions.\n\nBest,\n[Your Name]', category: 'Technical', tags: ['technical', 'documentation'] },
      { name: 'Bug Report Acknowledgment', subject: 'Re: Bug Report - [Issue]', body: 'Hi [Name],\n\nThank you for reporting this bug. I have logged it in our tracking system with ID [Bug #].\n\nOur development team will investigate and I will keep you updated on the progress.\n\nBest,\n[Your Name]', category: 'Technical', tags: ['technical', 'bug', 'support'] },
      { name: 'Partnership Proposal', subject: 'Partnership Opportunity: [Company Names]', body: 'Dear [Name],\n\nI am writing to explore a potential partnership between [Your Company] and [Their Company].\n\nWe believe there are significant synergies in [areas]. Specifically, we could collaborate on:\n\n1. [Opportunity 1]\n2. [Opportunity 2]\n\nWould you be interested in discussing this further?\n\nBest regards,\n[Your Name]', category: 'Partnership', tags: ['partnership', 'business'] },
      { name: 'Out of Office', subject: 'Out of Office: [Your Name]', body: 'Thank you for your email. I am currently out of the office from [Start Date] to [End Date] with limited access to email.\n\nFor urgent matters, please contact [Alternate Contact] at [Email/Phone].\n\nI will respond to your email upon my return.\n\nBest regards,\n[Your Name]', category: 'General', tags: ['ooo', 'vacation'] },
      { name: 'Project Update', subject: 'Project Update: [Project Name]', body: 'Hi Team,\n\nHere is the weekly update for [Project Name]:\n\n**Completed:**\n- [Item 1]\n- [Item 2]\n\n**In Progress:**\n- [Item 3]\n- [Item 4]\n\n**Blockers:**\n- [Blocker 1]\n\nPlease let me know if you have any questions.\n\nBest,\n[Your Name]', category: 'General', tags: ['project', 'update', 'status'] }
    ];

    const templateIds = [];
    for (const template of templates) {
      const result = await pool.query(
        `INSERT INTO templates (user_id, name, subject, body, category, tags, usage_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [userId, template.name, template.subject, template.body, template.category, template.tags, Math.floor(Math.random() * 50)]
      );
      templateIds.push(result.rows[0].id);
    }

    // Seed Contacts (16 items)
    console.log('Seeding contacts...');
    const contacts = [
      { email: 'john.smith@acmecorp.com', name: 'John Smith', company: 'Acme Corporation', phone: '+1-555-0101', notes: 'Key stakeholder for Q1 project', is_vip: true, tags: ['client', 'enterprise'] },
      { email: 'sarah.jones@techstart.io', name: 'Sarah Jones', company: 'TechStart Inc', phone: '+1-555-0102', notes: 'Partnership discussion ongoing', is_vip: true, tags: ['partner', 'tech'] },
      { email: 'mike.dev@github.com', name: 'Mike Developer', company: 'GitHub', phone: '+1-555-0103', notes: 'Technical contact for integrations', is_vip: false, tags: ['technical', 'developer'] },
      { email: 'alice.manager@company.com', name: 'Alice Manager', company: 'Our Company', phone: '+1-555-0104', notes: 'Internal - Team Lead', is_vip: false, tags: ['internal', 'management'] },
      { email: 'bob.sales@vendor.com', name: 'Bob Sales', company: 'Vendor Inc', phone: '+1-555-0105', notes: 'Account manager for software licenses', is_vip: false, tags: ['vendor', 'sales'] },
      { email: 'carol.ceo@startup.io', name: 'Carol CEO', company: 'StartupIO', phone: '+1-555-0106', notes: 'Potential investor contact', is_vip: true, tags: ['investor', 'executive'] },
      { email: 'david.support@cloudservices.net', name: 'David Support', company: 'Cloud Services', phone: '+1-555-0107', notes: 'Dedicated support contact', is_vip: false, tags: ['support', 'vendor'] },
      { email: 'emma.marketing@agency.com', name: 'Emma Marketing', company: 'Creative Agency', phone: '+1-555-0108', notes: 'Marketing campaign coordinator', is_vip: false, tags: ['marketing', 'agency'] },
      { email: 'frank.finance@bigcorp.com', name: 'Frank Finance', company: 'BigCorp Financial', phone: '+1-555-0109', notes: 'Financial services contact', is_vip: true, tags: ['finance', 'enterprise'] },
      { email: 'grace.hr@company.com', name: 'Grace HR', company: 'Our Company', phone: '+1-555-0110', notes: 'Internal HR contact', is_vip: false, tags: ['internal', 'hr'] },
      { email: 'henry.legal@lawfirm.com', name: 'Henry Legal', company: 'Legal Partners LLP', phone: '+1-555-0111', notes: 'Corporate legal counsel', is_vip: true, tags: ['legal', 'external'] },
      { email: 'iris.investor@vcfund.com', name: 'Iris Investor', company: 'VC Fund Partners', phone: '+1-555-0112', notes: 'Series B investor contact', is_vip: true, tags: ['investor', 'vc'] },
      { email: 'jack.ops@infrastructure.io', name: 'Jack Ops', company: 'Infrastructure IO', phone: '+1-555-0113', notes: 'DevOps and infrastructure vendor', is_vip: false, tags: ['technical', 'vendor'] },
      { email: 'kate.product@competitor.com', name: 'Kate Product', company: 'Competitor Inc', phone: '+1-555-0114', notes: 'Industry contact - conferences', is_vip: false, tags: ['industry', 'networking'] },
      { email: 'leo.consultant@advisory.com', name: 'Leo Consultant', company: 'Advisory Group', phone: '+1-555-0115', notes: 'Business strategy consultant', is_vip: false, tags: ['consultant', 'strategy'] },
      { email: 'maya.press@media.com', name: 'Maya Press', company: 'Tech Media', phone: '+1-555-0116', notes: 'PR and media contact', is_vip: false, tags: ['media', 'pr'] }
    ];

    for (const contact of contacts) {
      await pool.query(
        `INSERT INTO contacts (user_id, email, name, company, phone, notes, is_vip, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, contact.email, contact.name, contact.company, contact.phone, contact.notes, contact.is_vip, contact.tags]
      );
    }

    // Seed Labels (15 items)
    console.log('Seeding labels...');
    const labels = [
      { name: 'Important', color: '#EF4444', description: 'High priority items requiring attention' },
      { name: 'Follow Up', color: '#F59E0B', description: 'Items that need follow-up action' },
      { name: 'Waiting', color: '#8B5CF6', description: 'Waiting for response from others' },
      { name: 'Project A', color: '#3B82F6', description: 'Related to Project A' },
      { name: 'Project B', color: '#10B981', description: 'Related to Project B' },
      { name: 'Personal', color: '#EC4899', description: 'Personal correspondence' },
      { name: 'Finance', color: '#14B8A6', description: 'Financial matters' },
      { name: 'Legal', color: '#6366F1', description: 'Legal documents and correspondence' },
      { name: 'Marketing', color: '#F97316', description: 'Marketing related emails' },
      { name: 'Sales', color: '#22C55E', description: 'Sales opportunities and leads' },
      { name: 'Support', color: '#0EA5E9', description: 'Customer support tickets' },
      { name: 'Archive', color: '#6B7280', description: 'Items to archive' },
      { name: 'Urgent', color: '#DC2626', description: 'Requires immediate attention' },
      { name: 'Read Later', color: '#A855F7', description: 'Items to read when time permits' },
      { name: 'Newsletter', color: '#84CC16', description: 'Newsletter subscriptions' }
    ];

    for (const label of labels) {
      await pool.query(
        `INSERT INTO labels (user_id, name, color, description)
         VALUES ($1, $2, $3, $4)`,
        [userId, label.name, label.color, label.description]
      );
    }

    // Seed Rules (15 items)
    console.log('Seeding rules...');
    const rules = [
      { name: 'Auto-star VIP emails', description: 'Automatically star emails from VIP contacts', condition_field: 'from_email', condition_operator: 'contains', condition_value: '@acmecorp.com', action_type: 'star', action_value: 'true', priority: 1, is_active: true },
      { name: 'Categorize Support Tickets', description: 'Auto-categorize support emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'ticket', action_type: 'categorize', action_value: 'Support', priority: 2, is_active: true },
      { name: 'Flag Urgent Emails', description: 'Flag emails with urgent in subject', condition_field: 'subject', condition_operator: 'contains', condition_value: 'urgent', action_type: 'priority', action_value: '1', priority: 1, is_active: true },
      { name: 'Label Invoice Emails', description: 'Add finance label to invoices', condition_field: 'subject', condition_operator: 'contains', condition_value: 'invoice', action_type: 'label', action_value: 'Finance', priority: 3, is_active: true },
      { name: 'Archive Newsletters', description: 'Auto-archive newsletter emails', condition_field: 'from_email', condition_operator: 'contains', condition_value: 'newsletter', action_type: 'archive', action_value: 'true', priority: 5, is_active: false },
      { name: 'Categorize HR Emails', description: 'Categorize recruitment emails as HR', condition_field: 'subject', condition_operator: 'contains', condition_value: 'interview', action_type: 'categorize', action_value: 'HR', priority: 3, is_active: true },
      { name: 'Star Partner Emails', description: 'Star emails from partners', condition_field: 'from_email', condition_operator: 'contains', condition_value: 'partner', action_type: 'star', action_value: 'true', priority: 2, is_active: true },
      { name: 'Label Marketing Campaigns', description: 'Label marketing campaign emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'campaign', action_type: 'label', action_value: 'Marketing', priority: 4, is_active: true },
      { name: 'Prioritize Security Alerts', description: 'High priority for security emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'security', action_type: 'priority', action_value: '1', priority: 1, is_active: true },
      { name: 'Categorize Sales Offers', description: 'Categorize discount/offer emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'offer', action_type: 'categorize', action_value: 'Sales', priority: 4, is_active: true },
      { name: 'Label Legal Documents', description: 'Label contract related emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'contract', action_type: 'label', action_value: 'Legal', priority: 2, is_active: true },
      { name: 'Archive Promotional', description: 'Archive promotional emails', condition_field: 'body', condition_operator: 'contains', condition_value: 'unsubscribe', action_type: 'archive', action_value: 'true', priority: 5, is_active: false },
      { name: 'Flag Payment Emails', description: 'Flag payment related emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'payment', action_type: 'priority', action_value: '2', priority: 2, is_active: true },
      { name: 'Categorize Technical', description: 'Categorize bug report emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'bug', action_type: 'categorize', action_value: 'Technical', priority: 3, is_active: true },
      { name: 'Label Project Updates', description: 'Label project update emails', condition_field: 'subject', condition_operator: 'contains', condition_value: 'update', action_type: 'label', action_value: 'Follow Up', priority: 4, is_active: true }
    ];

    for (const rule of rules) {
      await pool.query(
        `INSERT INTO rules (user_id, name, description, condition_field, condition_operator, condition_value, action_type, action_value, priority, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [userId, rule.name, rule.description, rule.condition_field, rule.condition_operator, rule.condition_value, rule.action_type, rule.action_value, rule.priority, rule.is_active]
      );
    }

    // Seed Categories (15 items)
    console.log('Seeding categories...');
    const categories = [
      { name: 'Sales', description: 'Sales inquiries and opportunities', color: '#22C55E', icon: 'dollar-sign', keywords: ['sale', 'discount', 'offer', 'price', 'quote'] },
      { name: 'Support', description: 'Customer support requests', color: '#3B82F6', icon: 'help-circle', keywords: ['help', 'issue', 'problem', 'ticket', 'support'] },
      { name: 'Marketing', description: 'Marketing communications', color: '#F97316', icon: 'megaphone', keywords: ['campaign', 'newsletter', 'promotion', 'marketing'] },
      { name: 'HR', description: 'Human resources communications', color: '#A855F7', icon: 'users', keywords: ['interview', 'resume', 'hiring', 'recruitment', 'job'] },
      { name: 'Finance', description: 'Financial matters', color: '#14B8A6', icon: 'credit-card', keywords: ['invoice', 'payment', 'budget', 'expense', 'billing'] },
      { name: 'Technical', description: 'Technical discussions', color: '#6366F1', icon: 'code', keywords: ['bug', 'api', 'error', 'code', 'development'] },
      { name: 'General', description: 'General correspondence', color: '#6B7280', icon: 'mail', keywords: [] },
      { name: 'Spam', description: 'Unwanted emails', color: '#EF4444', icon: 'trash', keywords: ['unsubscribe', 'spam', 'promotional'] },
      { name: 'Urgent', description: 'Time-sensitive matters', color: '#DC2626', icon: 'alert-circle', keywords: ['urgent', 'asap', 'immediately', 'critical'] },
      { name: 'Partnership', description: 'Partnership opportunities', color: '#8B5CF6', icon: 'handshake', keywords: ['partner', 'collaboration', 'joint', 'alliance'] },
      { name: 'Legal', description: 'Legal communications', color: '#0EA5E9', icon: 'scale', keywords: ['contract', 'legal', 'agreement', 'terms'] },
      { name: 'Events', description: 'Event invitations and updates', color: '#EC4899', icon: 'calendar', keywords: ['event', 'conference', 'meeting', 'webinar'] },
      { name: 'Feedback', description: 'Customer feedback', color: '#84CC16', icon: 'message-circle', keywords: ['feedback', 'review', 'suggestion', 'opinion'] },
      { name: 'Orders', description: 'Order notifications', color: '#F59E0B', icon: 'shopping-cart', keywords: ['order', 'shipping', 'delivery', 'tracking'] },
      { name: 'Security', description: 'Security alerts', color: '#EF4444', icon: 'shield', keywords: ['security', 'alert', 'breach', 'password'] }
    ];

    for (const category of categories) {
      await pool.query(
        `INSERT INTO categories (user_id, name, description, color, icon, keywords)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, category.name, category.description, category.color, category.icon, category.keywords]
      );
    }

    // Seed Analytics (15 items)
    console.log('Seeding analytics...');
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      await pool.query(
        `INSERT INTO analytics (user_id, date, emails_received, emails_sent, emails_categorized, ai_responses_generated, avg_response_time, top_category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, dateStr, Math.floor(Math.random() * 50) + 10, Math.floor(Math.random() * 30) + 5, Math.floor(Math.random() * 40) + 10, Math.floor(Math.random() * 20) + 5, Math.floor(Math.random() * 120) + 30, ['Sales', 'Support', 'Marketing', 'Technical', 'General'][Math.floor(Math.random() * 5)]]
      );
    }

    // Seed Settings
    console.log('Seeding settings...');
    await pool.query(
      `INSERT INTO settings (user_id, auto_categorize, auto_prioritize, ai_draft_responses, default_tone, notification_email, notification_push, theme, language)
       VALUES ($1, TRUE, TRUE, TRUE, 'professional', TRUE, FALSE, 'light', 'en')`,
      [userId]
    );

    // ==================== NEW AI FEATURES SEED DATA ====================

    // Seed Priority Scores (15 items)
    console.log('Seeding priority scores...');
    const priorityScores = [
      { email_id: emailIds[0], score: 95, urgency_level: 'critical', impact_score: 90, time_sensitivity: 'immediate', sender_importance: 'vip', keywords_found: ['urgent', 'deadline', 'tomorrow'], reasoning: 'Critical project deadline with urgent language', recommendations: ['Respond immediately', 'Confirm deliverables', 'Set reminder'] },
      { email_id: emailIds[1], score: 75, urgency_level: 'high', impact_score: 80, time_sensitivity: 'this_week', sender_importance: 'important', keywords_found: ['partnership', 'opportunity', 'discussion'], reasoning: 'Business opportunity from potential partner', recommendations: ['Schedule call', 'Research company', 'Prepare talking points'] },
      { email_id: emailIds[4], score: 85, urgency_level: 'high', impact_score: 85, time_sensitivity: 'today', sender_importance: 'important', keywords_found: ['interview', 'monday', 'zoom'], reasoning: 'Job interview scheduled - needs confirmation', recommendations: ['Confirm attendance', 'Test Zoom connection', 'Prepare documents'] },
      { email_id: emailIds[9], score: 98, urgency_level: 'critical', impact_score: 95, time_sensitivity: 'immediate', sender_importance: 'vip', keywords_found: ['critical', 'security', 'unusual', 'immediately'], reasoning: 'Security threat requires immediate action', recommendations: ['Change password now', 'Enable 2FA', 'Review account activity'] },
      { email_id: emailIds[13], score: 90, urgency_level: 'critical', impact_score: 88, time_sensitivity: 'this_week', sender_importance: 'important', keywords_found: ['contract', 'friday', 'approval'], reasoning: 'Legal deadline approaching', recommendations: ['Review contract today', 'Note questions', 'Schedule call with legal'] },
      { email_id: emailIds[6], score: 60, urgency_level: 'medium', impact_score: 70, time_sensitivity: 'this_week', sender_importance: 'regular', keywords_found: ['pull request', 'review', 'authentication'], reasoning: 'Code review request - not blocking', recommendations: ['Review when available', 'Check OAuth implementation', 'Provide feedback'] },
      { email_id: emailIds[2], score: 70, urgency_level: 'medium', impact_score: 65, time_sensitivity: 'today', sender_importance: 'regular', keywords_found: ['ticket', 'update', 'downtime'], reasoning: 'Support ticket update - monitoring required', recommendations: ['Monitor resolution', 'Acknowledge receipt', 'Plan for downtime'] },
      { email_id: emailIds[5], score: 55, urgency_level: 'medium', impact_score: 50, time_sensitivity: 'this_month', sender_importance: 'regular', keywords_found: ['invoice', 'payment', '30 days'], reasoning: 'Standard invoice with 30-day terms', recommendations: ['Process payment', 'Update records', 'File for accounting'] },
      { email_id: emailIds[14], score: 78, urgency_level: 'high', impact_score: 82, time_sensitivity: 'this_week', sender_importance: 'vip', keywords_found: ['feature request', 'custom', '6 months'], reasoning: 'VIP customer feature request', recommendations: ['Acknowledge request', 'Forward to product team', 'Provide timeline'] },
      { email_id: emailIds[8], score: 65, urgency_level: 'medium', impact_score: 60, time_sensitivity: 'today', sender_importance: 'regular', keywords_found: ['meeting', 'wednesday', 'agenda'], reasoning: 'Regular team meeting reminder', recommendations: ['Prepare updates', 'Review agenda', 'Join on time'] },
      { email_id: emailIds[11], score: 72, urgency_level: 'high', impact_score: 78, time_sensitivity: 'this_week', sender_importance: 'vip', keywords_found: ['investment', 'presentation', 'AI'], reasoning: 'Investment opportunity presentation', recommendations: ['Schedule time to attend', 'Research company', 'Prepare questions'] },
      { email_id: emailIds[17], score: 68, urgency_level: 'medium', impact_score: 75, time_sensitivity: 'this_month', sender_importance: 'important', keywords_found: ['speaker', 'conference', 'march'], reasoning: 'Speaking opportunity at tech conference', recommendations: ['Confirm interest', 'Check calendar', 'Propose topics'] },
      { email_id: emailIds[3], score: 25, urgency_level: 'low', impact_score: 20, time_sensitivity: 'no_deadline', sender_importance: 'low', keywords_found: ['newsletter', 'trends', 'marketing'], reasoning: 'Newsletter - informational only', recommendations: ['Read when free', 'Archive if not interested'] },
      { email_id: emailIds[15], score: 20, urgency_level: 'minimal', impact_score: 15, time_sensitivity: 'no_deadline', sender_importance: 'low', keywords_found: ['newsletter', 'digest', 'stories'], reasoning: 'Industry newsletter - optional reading', recommendations: ['Skim or archive', 'Unsubscribe if not useful'] },
      { email_id: emailIds[7], score: 30, urgency_level: 'low', impact_score: 25, time_sensitivity: 'no_deadline', sender_importance: 'low', keywords_found: ['offer', 'discount', '50%'], reasoning: 'Promotional email - sales pitch', recommendations: ['Archive or delete', 'Review if interested in product'] }
    ];

    for (const ps of priorityScores) {
      await pool.query(
        `INSERT INTO priority_scores (user_id, email_id, score, urgency_level, impact_score, time_sensitivity, sender_importance, keywords_found, reasoning, recommendations, ai_confidence, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [userId, ps.email_id, ps.score, ps.urgency_level, ps.impact_score, ps.time_sensitivity, ps.sender_importance, ps.keywords_found, ps.reasoning, ps.recommendations, 90, 'anthropic/claude-haiku-4.5']
      );
    }

    // Seed Meetings (15 items)
    console.log('Seeding meetings...');
    const meetings = [
      { email_id: emailIds[4], title: 'Senior Developer Interview', description: 'Interview for Senior Developer position', date: '2024-02-05', time: '14:00', duration_minutes: 60, location: 'https://zoom.us/j/123456789', meeting_type: 'video_call', attendees: ['HR Team', 'Hiring Manager'], agenda: ['Introduction', 'Technical questions', 'Culture fit', 'Q&A'], is_confirmed: false },
      { email_id: emailIds[8], title: 'Weekly Team Meeting', description: 'Regular weekly sync with the team', date: '2024-02-07', time: '10:00', duration_minutes: 60, location: 'Conference Room B', meeting_type: 'in_person', attendees: ['Alice Manager', 'Team Members'], agenda: ['Project updates', 'Resource allocation', 'Q2 planning', 'Open discussion'], is_confirmed: true },
      { email_id: emailIds[1], title: 'Partnership Discussion Call', description: 'Initial partnership exploration call', date: '2024-02-06', time: '15:00', duration_minutes: 45, location: 'Google Meet', meeting_type: 'video_call', attendees: ['Sarah Jones', 'Business Development'], agenda: ['Company introductions', 'Synergy areas', 'Next steps'], is_confirmed: false },
      { email_id: emailIds[11], title: 'Investment Opportunity Presentation', description: 'Exclusive AI sector investment presentation', date: '2024-02-08', time: '11:00', duration_minutes: 90, location: 'StartupIO Office / Virtual', meeting_type: 'hybrid', attendees: ['CEO', 'Investors'], agenda: ['Company overview', 'Growth metrics', 'Investment terms', 'Q&A'], is_confirmed: false },
      { email_id: emailIds[17], title: 'Tech Summit 2024 Planning', description: 'Speaker coordination for Tech Summit', date: '2024-03-15', time: '09:00', duration_minutes: 480, location: 'San Francisco Convention Center', meeting_type: 'in_person', attendees: ['Conference Organizers', 'Speakers'], agenda: ['Keynote', 'Breakout sessions', 'Networking'], is_confirmed: false },
      { email_id: null, title: 'Product Roadmap Review', description: 'Quarterly product roadmap review', date: '2024-02-09', time: '14:00', duration_minutes: 120, location: 'Main Conference Room', meeting_type: 'in_person', attendees: ['Product Team', 'Engineering Leads', 'Stakeholders'], agenda: ['Q1 review', 'Q2 priorities', 'Resource planning'], is_confirmed: true },
      { email_id: null, title: 'Client Demo - ACME Corp', description: 'Product demonstration for ACME', date: '2024-02-06', time: '10:00', duration_minutes: 45, location: 'Microsoft Teams', meeting_type: 'video_call', attendees: ['John Smith', 'Sales Team'], agenda: ['Feature overview', 'Use case demo', 'Pricing discussion'], is_confirmed: true },
      { email_id: null, title: 'Sprint Planning', description: 'Bi-weekly sprint planning session', date: '2024-02-05', time: '09:00', duration_minutes: 90, location: 'Dev Room', meeting_type: 'in_person', attendees: ['Dev Team', 'Product Owner', 'Scrum Master'], agenda: ['Backlog review', 'Story pointing', 'Sprint commitment'], is_confirmed: true },
      { email_id: null, title: 'Board Meeting', description: 'Quarterly board meeting', date: '2024-02-15', time: '13:00', duration_minutes: 180, location: 'Boardroom / Zoom', meeting_type: 'hybrid', attendees: ['Board Members', 'Executive Team'], agenda: ['Financial review', 'Strategic updates', 'Governance items'], is_confirmed: true },
      { email_id: null, title: 'Customer Success Check-in', description: 'Monthly check-in with key accounts', date: '2024-02-08', time: '16:00', duration_minutes: 30, location: 'Phone', meeting_type: 'phone_call', attendees: ['Customer Success Manager', 'Account Lead'], agenda: ['Usage review', 'Feedback', 'Upcoming features'], is_confirmed: true },
      { email_id: null, title: 'Design Review', description: 'UI/UX design review session', date: '2024-02-07', time: '11:00', duration_minutes: 60, location: 'Design Studio', meeting_type: 'in_person', attendees: ['Design Team', 'Product Manager'], agenda: ['Design presentations', 'Feedback', 'Iterations'], is_confirmed: false },
      { email_id: null, title: 'Security Audit Follow-up', description: 'Review security audit findings', date: '2024-02-09', time: '10:00', duration_minutes: 60, location: 'Secure Room', meeting_type: 'in_person', attendees: ['Security Team', 'IT Director'], agenda: ['Findings review', 'Remediation plan', 'Timeline'], is_confirmed: true },
      { email_id: null, title: 'Marketing Campaign Kickoff', description: 'Launch meeting for Q2 marketing campaign', date: '2024-02-12', time: '14:00', duration_minutes: 90, location: 'Marketing War Room', meeting_type: 'in_person', attendees: ['Marketing Team', 'Creative Agency'], agenda: ['Campaign objectives', 'Timeline', 'Budget review'], is_confirmed: false },
      { email_id: null, title: 'Vendor Negotiation', description: 'Contract negotiation with software vendor', date: '2024-02-10', time: '15:00', duration_minutes: 60, location: 'Zoom', meeting_type: 'video_call', attendees: ['Procurement', 'Vendor Rep', 'Legal'], agenda: ['Terms discussion', 'Pricing negotiation', 'SLA review'], is_confirmed: false },
      { email_id: null, title: 'All Hands Meeting', description: 'Monthly company-wide all hands', date: '2024-02-28', time: '16:00', duration_minutes: 60, location: 'Town Hall / Live Stream', meeting_type: 'hybrid', attendees: ['All Employees', 'Executive Team'], agenda: ['Company updates', 'Achievements', 'Q&A'], is_confirmed: true }
    ];

    for (const meeting of meetings) {
      await pool.query(
        `INSERT INTO meetings (user_id, email_id, title, description, date, time, duration_minutes, location, meeting_type, attendees, agenda, is_confirmed, ai_confidence, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [userId, meeting.email_id, meeting.title, meeting.description, meeting.date, meeting.time, meeting.duration_minutes, meeting.location, meeting.meeting_type, meeting.attendees, meeting.agenda, meeting.is_confirmed, 88, 'anthropic/claude-haiku-4.5']
      );
    }

    // Seed Follow-up Reminders (15 items)
    console.log('Seeding follow-up reminders...');
    const followups = [
      { email_id: emailIds[0], reminder_type: 'response_needed', reminder_date: '2024-02-05 09:00:00', reason: 'Project deadline tomorrow - need to confirm deliverables', priority: 'high', suggested_action: 'Send confirmation with status update', status: 'pending' },
      { email_id: emailIds[1], reminder_type: 'action_pending', reminder_date: '2024-02-06 10:00:00', reason: 'Schedule partnership discussion call', priority: 'high', suggested_action: 'Propose meeting times', status: 'pending' },
      { email_id: emailIds[4], reminder_type: 'response_needed', reminder_date: '2024-02-04 14:00:00', reason: 'Interview confirmation needed', priority: 'high', suggested_action: 'Confirm interview attendance', status: 'completed' },
      { email_id: emailIds[5], reminder_type: 'deadline', reminder_date: '2024-02-28 12:00:00', reason: 'Invoice payment due in 30 days', priority: 'medium', suggested_action: 'Process payment', status: 'pending' },
      { email_id: emailIds[6], reminder_type: 'action_pending', reminder_date: '2024-02-06 15:00:00', reason: 'Pull request waiting for review', priority: 'medium', suggested_action: 'Review and provide feedback', status: 'pending' },
      { email_id: emailIds[13], reminder_type: 'deadline', reminder_date: '2024-02-09 17:00:00', reason: 'Contract review deadline is Friday', priority: 'high', suggested_action: 'Complete review and submit approval', status: 'pending' },
      { email_id: emailIds[14], reminder_type: 'response_needed', reminder_date: '2024-02-07 10:00:00', reason: 'VIP customer awaiting feature request response', priority: 'high', suggested_action: 'Provide timeline and acknowledgment', status: 'pending' },
      { email_id: emailIds[17], reminder_type: 'response_needed', reminder_date: '2024-02-10 09:00:00', reason: 'Speaker invitation needs response', priority: 'medium', suggested_action: 'Confirm interest and availability', status: 'pending' },
      { email_id: emailIds[11], reminder_type: 'check_in', reminder_date: '2024-02-08 08:00:00', reason: 'Investment presentation follow-up', priority: 'medium', suggested_action: 'Review presentation details and prepare questions', status: 'pending' },
      { email_id: emailIds[2], reminder_type: 'check_in', reminder_date: '2024-02-05 16:00:00', reason: 'Check support ticket resolution status', priority: 'medium', suggested_action: 'Verify issue is resolved', status: 'completed' },
      { email_id: emailIds[8], reminder_type: 'action_pending', reminder_date: '2024-02-07 08:00:00', reason: 'Prepare updates for team meeting', priority: 'medium', suggested_action: 'Compile weekly status report', status: 'pending' },
      { email_id: null, reminder_type: 'check_in', reminder_date: '2024-02-12 10:00:00', reason: 'Follow up on proposal sent last week', priority: 'medium', suggested_action: 'Send gentle follow-up email', status: 'pending' },
      { email_id: null, reminder_type: 'deadline', reminder_date: '2024-02-15 17:00:00', reason: 'Q1 report submission deadline', priority: 'high', suggested_action: 'Finalize and submit report', status: 'pending' },
      { email_id: null, reminder_type: 'info_request', reminder_date: '2024-02-08 14:00:00', reason: 'Gather requirements for new feature', priority: 'medium', suggested_action: 'Send requirements questionnaire', status: 'snoozed' },
      { email_id: null, reminder_type: 'response_needed', reminder_date: '2024-02-20 09:00:00', reason: 'Review and respond to partnership terms', priority: 'high', suggested_action: 'Schedule review meeting with legal', status: 'pending' }
    ];

    for (const followup of followups) {
      await pool.query(
        `INSERT INTO followup_reminders (user_id, email_id, reminder_type, reminder_date, reason, priority, suggested_action, status, ai_confidence, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [userId, followup.email_id, followup.reminder_type, followup.reminder_date, followup.reason, followup.priority, followup.suggested_action, followup.status, 88, 'anthropic/claude-haiku-4.5']
      );
    }

    // Seed Template Suggestions (15 items)
    console.log('Seeding template suggestions...');
    const templateSuggestions = [
      { email_id: emailIds[0], template_id: templateIds[0], suggested_template_name: 'Professional Thank You', match_score: 75, match_reasons: ['Deadline acknowledgment', 'Confirmation needed'], customization_suggestions: ['Add specific deliverables', 'Include timeline'], was_used: false },
      { email_id: emailIds[1], template_id: templateIds[1], suggested_template_name: 'Meeting Request', match_score: 92, match_reasons: ['Partnership discussion', 'Scheduling needed'], customization_suggestions: ['Propose specific times', 'Add agenda items'], was_used: true },
      { email_id: emailIds[2], template_id: templateIds[3], suggested_template_name: 'Support Acknowledgment', match_score: 88, match_reasons: ['Support ticket update', 'Customer communication'], customization_suggestions: ['Reference ticket number', 'Add expected resolution'], was_used: false },
      { email_id: emailIds[4], template_id: templateIds[10], suggested_template_name: 'Interview Invitation', match_score: 95, match_reasons: ['Interview confirmation', 'Formal response needed'], customization_suggestions: ['Confirm date/time', 'Add any questions'], was_used: true },
      { email_id: emailIds[5], template_id: templateIds[8], suggested_template_name: 'Payment Confirmation', match_score: 82, match_reasons: ['Invoice payment', 'Financial communication'], customization_suggestions: ['Reference invoice number', 'Confirm payment method'], was_used: false },
      { email_id: emailIds[6], template_id: templateIds[12], suggested_template_name: 'Bug Report Acknowledgment', match_score: 70, match_reasons: ['Technical review', 'Code feedback'], customization_suggestions: ['Add specific feedback', 'Include review timeline'], was_used: false },
      { email_id: emailIds[11], template_id: templateIds[13], suggested_template_name: 'Partnership Proposal', match_score: 85, match_reasons: ['Investment opportunity', 'Business partnership'], customization_suggestions: ['Express interest level', 'Request more details'], was_used: false },
      { email_id: emailIds[13], template_id: null, suggested_template_name: 'Contract Review Response', match_score: 65, match_reasons: ['Legal document', 'Review request'], customization_suggestions: ['Note specific sections', 'Propose review call'], was_used: false },
      { email_id: emailIds[14], template_id: templateIds[4], suggested_template_name: 'Issue Resolution', match_score: 78, match_reasons: ['Customer request', 'Feature feedback'], customization_suggestions: ['Acknowledge feature request', 'Provide timeline'], was_used: true },
      { email_id: emailIds[17], template_id: templateIds[0], suggested_template_name: 'Professional Thank You', match_score: 80, match_reasons: ['Invitation response', 'Formal communication'], customization_suggestions: ['Express interest', 'Request more details'], was_used: false },
      { email_id: emailIds[3], template_id: templateIds[0], suggested_template_name: 'Professional Thank You', match_score: 60, match_reasons: ['Newsletter appreciation', 'General response'], customization_suggestions: ['Keep brief', 'Express continued interest'], was_used: false },
      { email_id: emailIds[7], template_id: templateIds[5], suggested_template_name: 'Sales Introduction', match_score: 45, match_reasons: ['Sales offer', 'Product interest'], customization_suggestions: ['Express interest or decline', 'Request demo if interested'], was_used: false },
      { email_id: emailIds[8], template_id: templateIds[2], suggested_template_name: 'Follow-up After Meeting', match_score: 90, match_reasons: ['Meeting agenda', 'Team communication'], customization_suggestions: ['Confirm attendance', 'Add your updates'], was_used: true },
      { email_id: emailIds[9], template_id: null, suggested_template_name: 'Security Response', match_score: 72, match_reasons: ['Security alert', 'Action confirmation'], customization_suggestions: ['Confirm actions taken', 'Request additional help'], was_used: true },
      { email_id: emailIds[16], template_id: templateIds[11], suggested_template_name: 'Technical Documentation', match_score: 68, match_reasons: ['Maintenance notice', 'Technical communication'], customization_suggestions: ['Acknowledge notice', 'Confirm preparations'], was_used: false }
    ];

    for (const ts of templateSuggestions) {
      await pool.query(
        `INSERT INTO template_suggestions (user_id, email_id, template_id, suggested_template_name, match_score, match_reasons, customization_suggestions, was_used, ai_confidence, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [userId, ts.email_id, ts.template_id, ts.suggested_template_name, ts.match_score, ts.match_reasons, ts.customization_suggestions, ts.was_used, 85, 'anthropic/claude-haiku-4.5']
      );
    }

    // Seed Spam Analysis (15 items)
    console.log('Seeding spam analysis...');
    const spamAnalyses = [
      { email_id: emailIds[7], spam_score: 75, is_spam: true, spam_type: 'promotional', risk_level: 'medium', indicators: ['Promotional language', 'Discount offer', 'Urgency tactics'], phishing_probability: 15, malware_risk: 5, sender_reputation: 'suspicious', link_analysis: { totalLinks: 3, suspiciousLinks: 1, safeLinks: 2 }, recommendation: 'review' },
      { email_id: emailIds[3], spam_score: 45, is_spam: false, spam_type: 'promotional', risk_level: 'low', indicators: ['Newsletter format', 'Unsubscribe link'], phishing_probability: 5, malware_risk: 0, sender_reputation: 'neutral', link_analysis: { totalLinks: 5, suspiciousLinks: 0, safeLinks: 5 }, recommendation: 'allow' },
      { email_id: emailIds[15], spam_score: 40, is_spam: false, spam_type: 'promotional', risk_level: 'low', indicators: ['Newsletter format', 'Industry content'], phishing_probability: 5, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 8, suspiciousLinks: 0, safeLinks: 8 }, recommendation: 'allow' },
      { email_id: emailIds[0], spam_score: 5, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Known sender', 'Business context'], phishing_probability: 0, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 0, suspiciousLinks: 0, safeLinks: 0 }, recommendation: 'allow' },
      { email_id: emailIds[9], spam_score: 25, is_spam: false, spam_type: 'legitimate', risk_level: 'low', indicators: ['Security alert pattern', 'Action required'], phishing_probability: 20, malware_risk: 5, sender_reputation: 'neutral', link_analysis: { totalLinks: 2, suspiciousLinks: 1, safeLinks: 1 }, recommendation: 'review' },
      { email_id: emailIds[1], spam_score: 10, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Professional language', 'Business inquiry'], phishing_probability: 5, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 1, suspiciousLinks: 0, safeLinks: 1 }, recommendation: 'allow' },
      { email_id: emailIds[4], spam_score: 8, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['HR communication', 'Interview related'], phishing_probability: 2, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 1, suspiciousLinks: 0, safeLinks: 1 }, recommendation: 'allow' },
      { email_id: emailIds[5], spam_score: 12, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Invoice format', 'Known vendor'], phishing_probability: 10, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 2, suspiciousLinks: 0, safeLinks: 2 }, recommendation: 'allow' },
      { email_id: emailIds[6], spam_score: 5, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Technical content', 'Known developer'], phishing_probability: 0, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 1, suspiciousLinks: 0, safeLinks: 1 }, recommendation: 'allow' },
      { email_id: emailIds[11], spam_score: 35, is_spam: false, spam_type: 'promotional', risk_level: 'low', indicators: ['Investment language', 'CEO claim'], phishing_probability: 25, malware_risk: 5, sender_reputation: 'neutral', link_analysis: { totalLinks: 2, suspiciousLinks: 1, safeLinks: 1 }, recommendation: 'review' },
      { email_id: emailIds[13], spam_score: 8, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Legal communication', 'Contract reference'], phishing_probability: 3, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 0, suspiciousLinks: 0, safeLinks: 0 }, recommendation: 'allow' },
      { email_id: emailIds[14], spam_score: 10, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Customer feedback', 'Feature request'], phishing_probability: 2, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 0, suspiciousLinks: 0, safeLinks: 0 }, recommendation: 'allow' },
      { email_id: emailIds[17], spam_score: 15, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Conference invitation', 'Professional event'], phishing_probability: 8, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 3, suspiciousLinks: 0, safeLinks: 3 }, recommendation: 'allow' },
      { email_id: emailIds[8], spam_score: 3, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Internal communication', 'Meeting notice'], phishing_probability: 0, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 0, suspiciousLinks: 0, safeLinks: 0 }, recommendation: 'allow' },
      { email_id: emailIds[2], spam_score: 6, is_spam: false, spam_type: 'legitimate', risk_level: 'safe', indicators: ['Support ticket', 'Known service'], phishing_probability: 3, malware_risk: 0, sender_reputation: 'trusted', link_analysis: { totalLinks: 1, suspiciousLinks: 0, safeLinks: 1 }, recommendation: 'allow' }
    ];

    for (const sa of spamAnalyses) {
      await pool.query(
        `INSERT INTO spam_analysis (user_id, email_id, spam_score, is_spam, spam_type, risk_level, indicators, phishing_probability, malware_risk, sender_reputation, link_analysis, recommendation, ai_confidence, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [userId, sa.email_id, sa.spam_score, sa.is_spam, sa.spam_type, sa.risk_level, sa.indicators, sa.phishing_probability, sa.malware_risk, sa.sender_reputation, JSON.stringify(sa.link_analysis), sa.recommendation, 92, 'anthropic/claude-haiku-4.5']
      );
    }

    // Seed Email Priorities (15 items)
    console.log('Seeding email priorities...');
    const emailPriorities = [
      { email_id: emailIds[0], productivity_score: 95, action_required: true, action_type: 'reply', estimated_time_minutes: 10, best_time_to_handle: 'morning', delegation_suggestion: null, batching_category: 'quick_replies', focus_level_required: 'high', deadline: '2024-02-05 17:00:00', dependencies: ['Review deliverables'] },
      { email_id: emailIds[1], productivity_score: 80, action_required: true, action_type: 'schedule', estimated_time_minutes: 15, best_time_to_handle: 'afternoon', delegation_suggestion: null, batching_category: 'meetings', focus_level_required: 'medium', deadline: null, dependencies: ['Check calendar'] },
      { email_id: emailIds[4], productivity_score: 85, action_required: true, action_type: 'reply', estimated_time_minutes: 5, best_time_to_handle: 'morning', delegation_suggestion: null, batching_category: 'quick_replies', focus_level_required: 'low', deadline: '2024-02-05 12:00:00', dependencies: [] },
      { email_id: emailIds[6], productivity_score: 70, action_required: true, action_type: 'reply', estimated_time_minutes: 45, best_time_to_handle: 'afternoon', delegation_suggestion: null, batching_category: 'deep_work', focus_level_required: 'high', deadline: null, dependencies: ['Set up dev environment'] },
      { email_id: emailIds[13], productivity_score: 88, action_required: true, action_type: 'reply', estimated_time_minutes: 30, best_time_to_handle: 'morning', delegation_suggestion: 'Legal team for review', batching_category: 'deep_work', focus_level_required: 'high', deadline: '2024-02-09 17:00:00', dependencies: ['Read contract', 'Note questions'] },
      { email_id: emailIds[14], productivity_score: 75, action_required: true, action_type: 'forward', estimated_time_minutes: 10, best_time_to_handle: 'morning', delegation_suggestion: 'Product team', batching_category: 'admin', focus_level_required: 'low', deadline: null, dependencies: [] },
      { email_id: emailIds[8], productivity_score: 65, action_required: true, action_type: 'reply', estimated_time_minutes: 5, best_time_to_handle: 'morning', delegation_suggestion: null, batching_category: 'quick_replies', focus_level_required: 'low', deadline: '2024-02-07 09:00:00', dependencies: ['Prepare updates'] },
      { email_id: emailIds[5], productivity_score: 55, action_required: true, action_type: 'archive', estimated_time_minutes: 5, best_time_to_handle: 'anytime', delegation_suggestion: 'Accounting', batching_category: 'admin', focus_level_required: 'low', deadline: '2024-02-28', dependencies: [] },
      { email_id: emailIds[2], productivity_score: 50, action_required: false, action_type: 'read_later', estimated_time_minutes: 3, best_time_to_handle: 'anytime', delegation_suggestion: null, batching_category: 'reading', focus_level_required: 'low', deadline: null, dependencies: [] },
      { email_id: emailIds[3], productivity_score: 20, action_required: false, action_type: 'archive', estimated_time_minutes: 2, best_time_to_handle: 'evening', delegation_suggestion: null, batching_category: 'reading', focus_level_required: 'low', deadline: null, dependencies: [] },
      { email_id: emailIds[11], productivity_score: 72, action_required: true, action_type: 'reply', estimated_time_minutes: 10, best_time_to_handle: 'afternoon', delegation_suggestion: null, batching_category: 'meetings', focus_level_required: 'medium', deadline: null, dependencies: ['Research company'] },
      { email_id: emailIds[17], productivity_score: 68, action_required: true, action_type: 'reply', estimated_time_minutes: 15, best_time_to_handle: 'afternoon', delegation_suggestion: null, batching_category: 'meetings', focus_level_required: 'medium', deadline: null, dependencies: ['Check availability'] },
      { email_id: emailIds[9], productivity_score: 98, action_required: true, action_type: 'reply', estimated_time_minutes: 15, best_time_to_handle: 'morning', delegation_suggestion: null, batching_category: 'quick_replies', focus_level_required: 'high', deadline: '2024-02-04 18:00:00', dependencies: ['Change password', 'Enable 2FA'] },
      { email_id: emailIds[7], productivity_score: 15, action_required: false, action_type: 'archive', estimated_time_minutes: 1, best_time_to_handle: 'anytime', delegation_suggestion: null, batching_category: 'none', focus_level_required: 'low', deadline: null, dependencies: [] },
      { email_id: emailIds[15], productivity_score: 18, action_required: false, action_type: 'archive', estimated_time_minutes: 2, best_time_to_handle: 'evening', delegation_suggestion: null, batching_category: 'reading', focus_level_required: 'low', deadline: null, dependencies: [] }
    ];

    for (const ep of emailPriorities) {
      await pool.query(
        `INSERT INTO email_priorities (user_id, email_id, productivity_score, action_required, action_type, estimated_time_minutes, best_time_to_handle, delegation_suggestion, batching_category, focus_level_required, deadline, dependencies, ai_confidence, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [userId, ep.email_id, ep.productivity_score, ep.action_required, ep.action_type, ep.estimated_time_minutes, ep.best_time_to_handle, ep.delegation_suggestion, ep.batching_category, ep.focus_level_required, ep.deadline, ep.dependencies, 87, 'anthropic/claude-haiku-4.5']
      );
    }

    // Seed Subject Optimizations (15 items)
    console.log('Seeding subject optimizations...');
    const subjectOptimizations = [
      { email_id: emailIds[0], original_subject: 'URGENT: Project Deadline Tomorrow', optimized_subjects: [{ subject: 'Action Required: Final Deliverables Due Tomorrow', score: 85, style: 'Clear & Direct' }, { subject: 'Tomorrow\'s Deadline: Confirm Your Deliverables Now', score: 82, style: 'Urgent & Personal' }, { subject: 'Q1 Project: 24 Hours to Submit Final Materials', score: 78, style: 'Professional & Specific' }], best_subject: 'Action Required: Final Deliverables Due Tomorrow', improvement_score: 25, target_audience: 'Internal Team', tone: 'professional', click_appeal_score: 85, urgency_score: 90, clarity_score: 88, personalization_suggestions: ['Add recipient name', 'Include project code'], a_b_test_variants: [{ variant: 'A', subject: 'Action Required: Final Deliverables Due Tomorrow', hypothesis: 'Tests action-oriented language' }, { variant: 'B', subject: 'Tomorrow\'s Deadline: Confirm Your Deliverables Now', hypothesis: 'Tests personal urgency' }] },
      { email_id: emailIds[1], original_subject: 'Partnership Opportunity Discussion', optimized_subjects: [{ subject: 'Let\'s Explore a Strategic Partnership - TechStart', score: 88, style: 'Professional & Inviting' }, { subject: 'TechStart x [Company]: Partnership Synergies', score: 85, style: 'Collaborative' }, { subject: 'Quick Call to Discuss Partnership Potential?', score: 82, style: 'Casual & Direct' }], best_subject: 'Let\'s Explore a Strategic Partnership - TechStart', improvement_score: 30, target_audience: 'Business Development', tone: 'professional', click_appeal_score: 88, urgency_score: 60, clarity_score: 85, personalization_suggestions: ['Add company name', 'Reference previous interaction'], a_b_test_variants: [{ variant: 'A', subject: 'Let\'s Explore a Strategic Partnership - TechStart', hypothesis: 'Tests formal approach' }, { variant: 'B', subject: 'Quick Call to Discuss Partnership Potential?', hypothesis: 'Tests casual approach' }] },
      { email_id: emailIds[7], original_subject: 'Special Offer: 50% Off Enterprise Plan', optimized_subjects: [{ subject: 'Exclusive: Save 50% on Enterprise - Limited Time', score: 90, style: 'Scarcity & Value' }, { subject: 'Your Enterprise Upgrade Awaits - Half Price!', score: 87, style: 'Personal & Exciting' }, { subject: '50% Enterprise Discount Ends Soon', score: 84, style: 'Direct & Urgent' }], best_subject: 'Exclusive: Save 50% on Enterprise - Limited Time', improvement_score: 35, target_audience: 'Business Buyers', tone: 'promotional', click_appeal_score: 92, urgency_score: 88, clarity_score: 85, personalization_suggestions: ['Add company name', 'Reference current plan'], a_b_test_variants: [{ variant: 'A', subject: 'Exclusive: Save 50% on Enterprise - Limited Time', hypothesis: 'Tests exclusivity appeal' }, { variant: 'B', subject: 'Your Enterprise Upgrade Awaits - Half Price!', hypothesis: 'Tests personalization' }] },
      { email_id: emailIds[3], original_subject: 'Top Marketing Trends for 2024', optimized_subjects: [{ subject: '2024 Marketing: 5 Trends Reshaping Your Strategy', score: 88, style: 'Specific & Valuable' }, { subject: 'Don\'t Miss: Marketing Trends That Will Define 2024', score: 85, style: 'FOMO & Urgent' }, { subject: 'Your 2024 Marketing Playbook Starts Here', score: 82, style: 'Actionable' }], best_subject: '2024 Marketing: 5 Trends Reshaping Your Strategy', improvement_score: 28, target_audience: 'Marketers', tone: 'informative', click_appeal_score: 88, urgency_score: 65, clarity_score: 90, personalization_suggestions: ['Add industry vertical', 'Include specific trend teaser'], a_b_test_variants: [{ variant: 'A', subject: '2024 Marketing: 5 Trends Reshaping Your Strategy', hypothesis: 'Tests specificity' }, { variant: 'B', subject: 'Don\'t Miss: Marketing Trends That Will Define 2024', hypothesis: 'Tests FOMO' }] },
      { email_id: emailIds[4], original_subject: 'Interview Schedule Confirmation', optimized_subjects: [{ subject: 'Interview Confirmed: Senior Developer Role - Monday 2PM', score: 92, style: 'Clear & Complete' }, { subject: 'Your Interview Details Inside - Monday 2PM', score: 88, style: 'Curiosity & Clear' }, { subject: 'Excited to Meet You Monday - Interview Confirmed', score: 85, style: 'Warm & Professional' }], best_subject: 'Interview Confirmed: Senior Developer Role - Monday 2PM', improvement_score: 22, target_audience: 'Job Candidates', tone: 'professional', click_appeal_score: 90, urgency_score: 75, clarity_score: 95, personalization_suggestions: ['Add candidate name', 'Include interviewer name'], a_b_test_variants: [{ variant: 'A', subject: 'Interview Confirmed: Senior Developer Role - Monday 2PM', hypothesis: 'Tests complete information' }, { variant: 'B', subject: 'Excited to Meet You Monday - Interview Confirmed', hypothesis: 'Tests warmth' }] },
      { email_id: emailIds[9], original_subject: 'CRITICAL: Unusual Login Activity Detected', optimized_subjects: [{ subject: 'Action Required: Suspicious Login Detected on Your Account', score: 95, style: 'Urgent & Clear' }, { subject: 'Security Alert: Unknown Device Accessed Your Account', score: 92, style: 'Specific & Alarming' }, { subject: 'Protect Your Account: Unusual Activity Detected', score: 88, style: 'Protective & Urgent' }], best_subject: 'Action Required: Suspicious Login Detected on Your Account', improvement_score: 18, target_audience: 'Account Holders', tone: 'urgent', click_appeal_score: 95, urgency_score: 98, clarity_score: 92, personalization_suggestions: ['Add account type', 'Include location if known'], a_b_test_variants: [{ variant: 'A', subject: 'Action Required: Suspicious Login Detected on Your Account', hypothesis: 'Tests action orientation' }, { variant: 'B', subject: 'Security Alert: Unknown Device Accessed Your Account', hypothesis: 'Tests specificity' }] },
      { email_id: null, original_subject: 'Monthly Newsletter', optimized_subjects: [{ subject: 'This Month\'s Insights: Trends, Tips & More', score: 78, style: 'Engaging & Varied' }, { subject: '[Month] Digest: What You Need to Know', score: 75, style: 'Professional & Timely' }, { subject: 'Your Monthly Update: Don\'t Miss These Stories', score: 72, style: 'FOMO & Personal' }], best_subject: 'This Month\'s Insights: Trends, Tips & More', improvement_score: 40, target_audience: 'Subscribers', tone: 'friendly', click_appeal_score: 78, urgency_score: 45, clarity_score: 80, personalization_suggestions: ['Add subscriber segment', 'Include preview of top story'], a_b_test_variants: [{ variant: 'A', subject: 'This Month\'s Insights: Trends, Tips & More', hypothesis: 'Tests value proposition' }, { variant: 'B', subject: 'Your Monthly Update: Don\'t Miss These Stories', hypothesis: 'Tests FOMO' }] },
      { email_id: null, original_subject: 'New Feature Announcement', optimized_subjects: [{ subject: 'Introducing [Feature]: Transform How You Work', score: 88, style: 'Exciting & Specific' }, { subject: 'New Feature Alert: [Feature] is Here!', score: 85, style: 'Direct & Exciting' }, { subject: 'You Asked, We Built: Meet [Feature]', score: 90, style: 'Customer-Centric' }], best_subject: 'You Asked, We Built: Meet [Feature]', improvement_score: 45, target_audience: 'Product Users', tone: 'exciting', click_appeal_score: 90, urgency_score: 70, clarity_score: 85, personalization_suggestions: ['Add specific feature name', 'Reference user feedback'], a_b_test_variants: [{ variant: 'A', subject: 'You Asked, We Built: Meet [Feature]', hypothesis: 'Tests customer-centric messaging' }, { variant: 'B', subject: 'Introducing [Feature]: Transform How You Work', hypothesis: 'Tests benefit-focused' }] },
      { email_id: null, original_subject: 'Webinar Invitation', optimized_subjects: [{ subject: 'Free Webinar: [Topic] - Reserve Your Spot', score: 85, style: 'Value & Action' }, { subject: 'Learn [Topic] from Experts - Free Webinar [Date]', score: 88, style: 'Educational & Specific' }, { subject: 'You\'re Invited: Exclusive Webinar on [Topic]', score: 82, style: 'Exclusive & Personal' }], best_subject: 'Learn [Topic] from Experts - Free Webinar [Date]', improvement_score: 32, target_audience: 'Professional Audience', tone: 'informative', click_appeal_score: 88, urgency_score: 72, clarity_score: 90, personalization_suggestions: ['Add specific topic', 'Include speaker names'], a_b_test_variants: [{ variant: 'A', subject: 'Learn [Topic] from Experts - Free Webinar [Date]', hypothesis: 'Tests educational value' }, { variant: 'B', subject: 'You\'re Invited: Exclusive Webinar on [Topic]', hypothesis: 'Tests exclusivity' }] },
      { email_id: null, original_subject: 'Thank You for Your Purchase', optimized_subjects: [{ subject: 'Order Confirmed! Here\'s What Happens Next', score: 90, style: 'Clear & Helpful' }, { subject: 'Thanks for Your Order - Track Your Package Here', score: 88, style: 'Actionable & Grateful' }, { subject: 'Your [Product] is on Its Way!', score: 85, style: 'Exciting & Specific' }], best_subject: 'Order Confirmed! Here\'s What Happens Next', improvement_score: 25, target_audience: 'Customers', tone: 'friendly', click_appeal_score: 90, urgency_score: 60, clarity_score: 95, personalization_suggestions: ['Add product name', 'Include order number'], a_b_test_variants: [{ variant: 'A', subject: 'Order Confirmed! Here\'s What Happens Next', hypothesis: 'Tests clarity and helpfulness' }, { variant: 'B', subject: 'Your [Product] is on Its Way!', hypothesis: 'Tests excitement' }] },
      { email_id: null, original_subject: 'Account Renewal Reminder', optimized_subjects: [{ subject: 'Your Account Expires in [X] Days - Renew Now', score: 92, style: 'Urgent & Clear' }, { subject: 'Don\'t Lose Access: Renew Before [Date]', score: 88, style: 'FOMO & Urgent' }, { subject: 'Keep Your [Product] Benefits - Renew Today', score: 85, style: 'Value-Focused' }], best_subject: 'Your Account Expires in [X] Days - Renew Now', improvement_score: 28, target_audience: 'Existing Customers', tone: 'urgent', click_appeal_score: 92, urgency_score: 95, clarity_score: 90, personalization_suggestions: ['Add specific days remaining', 'Include customer name'], a_b_test_variants: [{ variant: 'A', subject: 'Your Account Expires in [X] Days - Renew Now', hypothesis: 'Tests specificity and urgency' }, { variant: 'B', subject: 'Don\'t Lose Access: Renew Before [Date]', hypothesis: 'Tests loss aversion' }] },
      { email_id: null, original_subject: 'Customer Feedback Request', optimized_subjects: [{ subject: 'Quick Question: How Are We Doing?', score: 85, style: 'Casual & Direct' }, { subject: 'We Value Your Opinion - 2 Min Survey Inside', score: 88, style: 'Time-Specific & Valued' }, { subject: 'Help Us Improve: Share Your Experience', score: 82, style: 'Collaborative' }], best_subject: 'We Value Your Opinion - 2 Min Survey Inside', improvement_score: 35, target_audience: 'Customers', tone: 'friendly', click_appeal_score: 85, urgency_score: 50, clarity_score: 88, personalization_suggestions: ['Add customer name', 'Reference recent interaction'], a_b_test_variants: [{ variant: 'A', subject: 'We Value Your Opinion - 2 Min Survey Inside', hypothesis: 'Tests time commitment clarity' }, { variant: 'B', subject: 'Quick Question: How Are We Doing?', hypothesis: 'Tests conversational tone' }] },
      { email_id: null, original_subject: 'Welcome to Our Platform', optimized_subjects: [{ subject: 'Welcome! Here\'s How to Get Started in 3 Steps', score: 92, style: 'Welcoming & Actionable' }, { subject: 'You\'re In! Let\'s Set Up Your Account', score: 88, style: 'Exciting & Helpful' }, { subject: 'Welcome Aboard - Your Success Starts Here', score: 85, style: 'Warm & Motivating' }], best_subject: 'Welcome! Here\'s How to Get Started in 3 Steps', improvement_score: 30, target_audience: 'New Users', tone: 'friendly', click_appeal_score: 92, urgency_score: 65, clarity_score: 95, personalization_suggestions: ['Add user name', 'Reference sign-up source'], a_b_test_variants: [{ variant: 'A', subject: 'Welcome! Here\'s How to Get Started in 3 Steps', hypothesis: 'Tests actionable guidance' }, { variant: 'B', subject: 'You\'re In! Let\'s Set Up Your Account', hypothesis: 'Tests collaborative language' }] },
      { email_id: null, original_subject: 'Price Drop Alert', optimized_subjects: [{ subject: 'Price Drop: [Product] Now [X]% Off!', score: 90, style: 'Specific & Exciting' }, { subject: 'Good News: The Item You Viewed is on Sale', score: 88, style: 'Personal & Relevant' }, { subject: 'Limited Time: [Product] Price Reduced', score: 85, style: 'Urgent & Direct' }], best_subject: 'Price Drop: [Product] Now [X]% Off!', improvement_score: 28, target_audience: 'Shoppers', tone: 'promotional', click_appeal_score: 92, urgency_score: 85, clarity_score: 90, personalization_suggestions: ['Add specific product name', 'Include exact discount'], a_b_test_variants: [{ variant: 'A', subject: 'Price Drop: [Product] Now [X]% Off!', hypothesis: 'Tests specificity' }, { variant: 'B', subject: 'Good News: The Item You Viewed is on Sale', hypothesis: 'Tests personalization' }] },
      { email_id: null, original_subject: 'Event Reminder', optimized_subjects: [{ subject: 'Tomorrow: Don\'t Miss [Event Name] at [Time]', score: 92, style: 'Urgent & Specific' }, { subject: 'Your Event is Coming Up - [Event] Tomorrow', score: 88, style: 'Personal & Clear' }, { subject: 'See You Tomorrow at [Event Name]!', score: 85, style: 'Warm & Exciting' }], best_subject: 'Tomorrow: Don\'t Miss [Event Name] at [Time]', improvement_score: 25, target_audience: 'Event Attendees', tone: 'friendly', click_appeal_score: 90, urgency_score: 95, clarity_score: 92, personalization_suggestions: ['Add event name', 'Include time and location'], a_b_test_variants: [{ variant: 'A', subject: 'Tomorrow: Don\'t Miss [Event Name] at [Time]', hypothesis: 'Tests urgency and completeness' }, { variant: 'B', subject: 'See You Tomorrow at [Event Name]!', hypothesis: 'Tests warmth' }] }
    ];

    for (const so of subjectOptimizations) {
      await pool.query(
        `INSERT INTO subject_optimizations (user_id, email_id, original_subject, optimized_subjects, best_subject, improvement_score, target_audience, tone, click_appeal_score, urgency_score, clarity_score, personalization_suggestions, a_b_test_variants, ai_confidence, ai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [userId, so.email_id, so.original_subject, JSON.stringify(so.optimized_subjects), so.best_subject, so.improvement_score, so.target_audience, so.tone, so.click_appeal_score, so.urgency_score, so.clarity_score, so.personalization_suggestions, JSON.stringify(so.a_b_test_variants), 91, 'anthropic/claude-haiku-4.5']
      );
    }

    console.log('\n========================================');
    console.log('Database seeded successfully!');
    console.log('========================================');
    console.log('\nDemo credentials:');
    console.log('Email: demo@example.com');
    console.log('Password: demo123');
    console.log('\nSeeded data:');
    console.log('- 18 Emails');
    console.log('- 15 Draft Responses');
    console.log('- 16 Templates');
    console.log('- 16 Contacts');
    console.log('- 15 Labels');
    console.log('- 15 Rules');
    console.log('- 15 Categories');
    console.log('- 15 Analytics Records');
    console.log('- 15 Priority Scores (AI)');
    console.log('- 15 Meetings (AI)');
    console.log('- 15 Follow-up Reminders (AI)');
    console.log('- 15 Template Suggestions (AI)');
    console.log('- 15 Spam Analyses (AI)');
    console.log('- 15 Email Priorities (AI)');
    console.log('- 15 Subject Optimizations (AI)');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
