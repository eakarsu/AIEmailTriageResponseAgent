const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.replace(/"/g, '');
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.replace(/"/g, '') || 'anthropic/claude-3-5-sonnet-20241022';

// Debug: Log config on startup
console.log('OpenRouter Config:', {
  hasApiKey: !!OPENROUTER_API_KEY,
  apiKeyPrefix: OPENROUTER_API_KEY?.substring(0, 15) + '...',
  baseUrl: OPENROUTER_BASE_URL,
  model: OPENROUTER_MODEL
});

// parseAIJson - 3-strategy AI JSON response parser
// Strategy 1: direct JSON.parse on trimmed content
// Strategy 2: strip markdown code fences (```json ... ```), then parse
// Strategy 3: brace-matching extraction of first complete JSON object/array
const parseAIJson = (content) => {
  if (content == null) throw new Error('parseAIJson: empty content');
  const raw = String(content).trim();

  // Strategy 1: direct parse
  try {
    return JSON.parse(raw);
  } catch (_) {}

  // Strategy 2: strip markdown code fences
  let cleaned = raw;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```[\s\S]*$/, '');
    try {
      return JSON.parse(cleaned.trim());
    } catch (_) {}
  } else {
    // Sometimes fences appear inline
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch (_) {}
    }
  }

  // Strategy 3: brace-matching extraction
  const objStart = cleaned.indexOf('{');
  const arrStart = cleaned.indexOf('[');
  let start = -1;
  let openCh, closeCh;
  if (objStart !== -1 && (arrStart === -1 || objStart < arrStart)) {
    start = objStart; openCh = '{'; closeCh = '}';
  } else if (arrStart !== -1) {
    start = arrStart; openCh = '['; closeCh = ']';
  }
  if (start === -1) throw new Error('parseAIJson: no JSON object/array found');

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.substring(start, i + 1));
      }
    }
  }
  throw new Error('parseAIJson: unbalanced braces');
};

// Backward-compatible alias
const cleanJsonResponse = parseAIJson;

const callOpenRouter = async (messages, model = OPENROUTER_MODEL) => {
  console.log('Calling OpenRouter with model:', model);
  const startTime = Date.now();

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Email Triage Agent'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter API error response:', error);
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log(`OpenRouter API success in ${duration}ms`);

    return {
      content: data.choices[0].message.content,
      model: model,
      usage: data.usage,
      duration: duration
    };
  } catch (error) {
    console.error('OpenRouter API call failed:', error.message);
    throw error;
  }
};

const categorizeEmail = async (subject, body, customCategories = null) => {
  const defaultCategories = ['Sales', 'Support', 'Marketing', 'HR', 'Finance', 'Technical', 'General', 'Spam', 'Urgent', 'Partnership'];

  let categoryPrompt;

  if (customCategories && customCategories.length > 0) {
    const categoryDescriptions = customCategories.map(cat => {
      const keywords = cat.keywords && cat.keywords.length > 0
        ? ` (keywords: ${cat.keywords.join(', ')})`
        : '';
      const desc = cat.description ? ` - ${cat.description}` : '';
      return `${cat.name}${desc}${keywords}`;
    }).join('\n');

    categoryPrompt = `You are an email categorization assistant. Categorize the email into one of these categories based on their descriptions and keywords:

${categoryDescriptions}

Match the email content against the keywords and descriptions. Respond with ONLY the category name, nothing else.`;
  } else {
    categoryPrompt = `You are an email categorization assistant. Categorize the email into one of these categories: ${defaultCategories.join(', ')}.
      Respond with ONLY the category name, nothing else.`;
  }

  const messages = [
    { role: 'system', content: categoryPrompt },
    { role: 'user', content: `Subject: ${subject}\n\nBody: ${body}` }
  ];

  try {
    const result = await callOpenRouter(messages);
    return { category: result.content.trim(), aiResponse: result };
  } catch (error) {
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();
    const combined = lowerSubject + ' ' + lowerBody;

    let category = 'General';
    if (combined.includes('urgent') || combined.includes('asap')) category = 'Urgent';
    else if (combined.includes('invoice') || combined.includes('payment')) category = 'Finance';
    else if (combined.includes('sale') || combined.includes('discount')) category = 'Sales';
    else if (combined.includes('help') || combined.includes('issue')) category = 'Support';

    return { category, aiResponse: null };
  }
};

const prioritizeEmail = async (subject, body, fromEmail) => {
  const messages = [
    {
      role: 'system',
      content: `You are an email priority assistant. Analyze the email and assign a priority score from 1-5:
      1 = Critical/Urgent - needs immediate attention
      2 = High - important, respond within hours
      3 = Normal - respond within a day
      4 = Low - can wait a few days
      5 = Very Low - informational, no response needed

      Respond in JSON format: {"priority": <number>, "reason": "<brief explanation>"}`
    },
    { role: 'user', content: `From: ${fromEmail}\nSubject: ${subject}\n\nBody: ${body}` }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return { ...parsed, aiResponse: result };
  } catch (error) {
    const combined = (subject + ' ' + body).toLowerCase();
    let priority = 3, reason = 'Standard email';

    if (combined.includes('urgent') || combined.includes('asap')) {
      priority = 1; reason = 'Contains urgent keywords';
    } else if (combined.includes('important') || combined.includes('deadline')) {
      priority = 2; reason = 'Contains high priority keywords';
    }

    return { priority, reason, aiResponse: null };
  }
};

const generateDraftResponse = async (subject, body, fromName, tone = 'professional') => {
  const toneDescriptions = {
    professional: 'formal and professional',
    friendly: 'warm and friendly but still professional',
    casual: 'casual and conversational',
    formal: 'very formal and business-like',
    empathetic: 'understanding and empathetic'
  };

  const messages = [
    {
      role: 'system',
      content: `You are an email response assistant. Generate a ${toneDescriptions[tone] || 'professional'} email response.
      Keep it concise but complete. Include appropriate greeting and sign-off.
      Do not include subject line in the response body.`
    },
    {
      role: 'user',
      content: `Please draft a response to this email:\n\nFrom: ${fromName}\nSubject: ${subject}\n\n${body}\n\nGenerate a ${tone} response.`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    return {
      subject: `Re: ${subject}`,
      body: result.content.trim(),
      aiResponse: result
    };
  } catch (error) {
    return {
      subject: `Re: ${subject}`,
      body: `Dear ${fromName || 'Colleague'},\n\nThank you for your email regarding "${subject}".\n\nI have received your message and will review it carefully. I will get back to you with a detailed response as soon as possible.\n\nBest regards`,
      aiResponse: null
    };
  }
};

const suggestTemplateResponse = async (emailContent, templates) => {
  if (!templates || templates.length === 0) {
    return { suggestion: null, aiResponse: null };
  }

  const messages = [
    {
      role: 'system',
      content: `You are an assistant that matches emails to response templates.
      Given an email and a list of templates, suggest the most appropriate template to use.

      Respond in JSON format:
      {
        "templateId": <number or null>,
        "templateName": "<name>",
        "matchScore": <0-100>,
        "matchReasons": ["reason1", "reason2"],
        "customizations": ["suggestion1", "suggestion2"],
        "alternatives": [{"id": <num>, "name": "<name>", "score": <score>}]
      }`
    },
    {
      role: 'user',
      content: `Email content: ${emailContent}\n\nAvailable templates:\n${templates.map(t => `ID: ${t.id} - Name: ${t.name} - Category: ${t.category} - Subject: ${t.subject}`).join('\n')}`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return { suggestion: parsed, aiResponse: result };
  } catch (error) {
    return { suggestion: null, aiResponse: null };
  }
};

const analyzeEmailSentiment = async (body) => {
  const messages = [
    {
      role: 'system',
      content: `Analyze the sentiment of the email. Respond in JSON format:
      {"sentiment": "positive|neutral|negative", "confidence": <0-100>, "tone": "<brief description>", "emotions": ["emotion1", "emotion2"]}`
    },
    { role: 'user', content: body }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return { ...parsed, aiResponse: result };
  } catch (error) {
    return { sentiment: 'neutral', confidence: 50, tone: 'Unable to analyze', aiResponse: null };
  }
};

const extractActionItems = async (body) => {
  const messages = [
    {
      role: 'system',
      content: `Extract action items from the email. Respond in JSON format:
      {"actionItems": ["item1", "item2", ...], "deadlines": ["deadline1", ...], "hasUrgentAction": boolean, "assignees": ["person1", ...]}`
    },
    { role: 'user', content: body }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return { ...parsed, aiResponse: result };
  } catch (error) {
    return { actionItems: [], deadlines: [], hasUrgentAction: false, aiResponse: null };
  }
};

const summarizeEmail = async (body) => {
  const messages = [
    {
      role: 'system',
      content: 'Summarize the email in 2-3 sentences. Be concise and capture the main points.'
    },
    { role: 'user', content: body }
  ];

  try {
    const result = await callOpenRouter(messages);
    return { summary: result.content.trim(), aiResponse: result };
  } catch (error) {
    return { summary: body.substring(0, 200) + '...', aiResponse: null };
  }
};

// ==================== NEW AI FEATURES ====================

// AI Priority Scorer - Deep priority analysis
const scorePriority = async (email) => {
  const messages = [
    {
      role: 'system',
      content: `You are an AI priority scoring expert. Analyze the email thoroughly and provide a comprehensive priority assessment.

      Respond in JSON format:
      {
        "score": <1-100>,
        "urgencyLevel": "critical|high|medium|low|minimal",
        "impactScore": <1-100>,
        "timeSensitivity": "immediate|today|this_week|this_month|no_deadline",
        "senderImportance": "vip|important|regular|unknown|low",
        "keywordsFound": ["keyword1", "keyword2"],
        "reasoning": "<detailed explanation>",
        "recommendations": ["action1", "action2", "action3"],
        "riskIfDelayed": "<what happens if not addressed>"
      }`
    },
    {
      role: 'user',
      content: `Analyze this email for priority scoring:\n\nFrom: ${email.from_email} (${email.from_name || 'Unknown'})\nTo: ${email.to_email}\nSubject: ${email.subject}\n\nBody:\n${email.body}`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return {
      ...parsed,
      aiConfidence: 85,
      aiModel: OPENROUTER_MODEL,
      aiResponse: result
    };
  } catch (error) {
    console.error('Priority scoring failed:', error.message);
    return {
      score: 50,
      urgencyLevel: 'medium',
      impactScore: 50,
      timeSensitivity: 'this_week',
      senderImportance: 'regular',
      keywordsFound: [],
      reasoning: 'Unable to analyze - using default priority',
      recommendations: ['Review email manually'],
      aiConfidence: 0,
      aiModel: OPENROUTER_MODEL,
      aiResponse: null
    };
  }
};

// AI Meeting Extractor - Extract meeting details from emails
const extractMeeting = async (email) => {
  const messages = [
    {
      role: 'system',
      content: `You are an AI meeting extraction specialist. Analyze the email and extract any meeting information.

      Respond in JSON format:
      {
        "hasMeeting": true/false,
        "title": "<meeting title>",
        "description": "<meeting description>",
        "date": "<YYYY-MM-DD or null>",
        "time": "<HH:MM or null>",
        "durationMinutes": <number or null>,
        "location": "<physical location or virtual platform>",
        "meetingType": "in_person|video_call|phone_call|hybrid",
        "attendees": ["attendee1", "attendee2"],
        "agenda": ["item1", "item2"],
        "actionItems": ["action1", "action2"],
        "calendarLink": "<link if present or null>",
        "isConfirmed": true/false,
        "requiresResponse": true/false,
        "conflictCheck": "<any mentioned conflicts>"
      }`
    },
    {
      role: 'user',
      content: `Extract meeting information from this email:\n\nFrom: ${email.from_email} (${email.from_name || 'Unknown'})\nSubject: ${email.subject}\n\nBody:\n${email.body}`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return {
      ...parsed,
      aiConfidence: parsed.hasMeeting ? 90 : 95,
      aiModel: OPENROUTER_MODEL,
      aiResponse: result
    };
  } catch (error) {
    console.error('Meeting extraction failed:', error.message);
    return {
      hasMeeting: false,
      title: null,
      description: null,
      date: null,
      time: null,
      durationMinutes: null,
      location: null,
      meetingType: null,
      attendees: [],
      agenda: [],
      actionItems: [],
      calendarLink: null,
      isConfirmed: false,
      aiConfidence: 0,
      aiModel: OPENROUTER_MODEL,
      aiResponse: null
    };
  }
};

// AI Follow-up Reminder - Suggest follow-up actions
const suggestFollowUp = async (email) => {
  const messages = [
    {
      role: 'system',
      content: `You are an AI follow-up reminder specialist. Analyze the email and determine if a follow-up is needed.

      Respond in JSON format:
      {
        "needsFollowUp": true/false,
        "reminderType": "response_needed|action_pending|check_in|deadline|info_request|none",
        "suggestedDate": "<YYYY-MM-DD>",
        "suggestedTime": "<HH:MM>",
        "reason": "<why follow-up is needed>",
        "priority": "high|medium|low",
        "suggestedAction": "<what action to take>",
        "context": "<relevant context for the follow-up>",
        "stakeholders": ["person1", "person2"],
        "riskIfMissed": "<consequences of not following up>"
      }`
    },
    {
      role: 'user',
      content: `Analyze this email for follow-up needs:\n\nFrom: ${email.from_email} (${email.from_name || 'Unknown'})\nSubject: ${email.subject}\nReceived: ${email.received_at || 'Unknown'}\n\nBody:\n${email.body}`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return {
      ...parsed,
      aiConfidence: 88,
      aiModel: OPENROUTER_MODEL,
      aiResponse: result
    };
  } catch (error) {
    console.error('Follow-up suggestion failed:', error.message);
    return {
      needsFollowUp: false,
      reminderType: 'none',
      suggestedDate: null,
      suggestedTime: null,
      reason: 'Unable to analyze',
      priority: 'low',
      suggestedAction: null,
      aiConfidence: 0,
      aiModel: OPENROUTER_MODEL,
      aiResponse: null
    };
  }
};

// AI Spam Intelligence - Advanced spam analysis
const analyzeSpam = async (email) => {
  const messages = [
    {
      role: 'system',
      content: `You are an AI spam and security intelligence specialist. Analyze the email for spam indicators and security threats.

      Respond in JSON format:
      {
        "spamScore": <0-100>,
        "isSpam": true/false,
        "spamType": "promotional|phishing|scam|malware|legitimate|unknown",
        "riskLevel": "critical|high|medium|low|safe",
        "indicators": ["indicator1", "indicator2"],
        "phishingProbability": <0-100>,
        "malwareRisk": <0-100>,
        "senderReputation": "trusted|neutral|suspicious|blacklisted|unknown",
        "linkAnalysis": {
          "totalLinks": <number>,
          "suspiciousLinks": <number>,
          "safeLinks": <number>,
          "details": ["link analysis detail1", "detail2"]
        },
        "recommendation": "allow|review|quarantine|block|delete",
        "warningFlags": ["flag1", "flag2"],
        "safetyTips": ["tip1", "tip2"]
      }`
    },
    {
      role: 'user',
      content: `Analyze this email for spam and security threats:\n\nFrom: ${email.from_email} (${email.from_name || 'Unknown'})\nTo: ${email.to_email}\nSubject: ${email.subject}\n\nBody:\n${email.body}`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return {
      ...parsed,
      aiConfidence: 92,
      aiModel: OPENROUTER_MODEL,
      aiResponse: result
    };
  } catch (error) {
    console.error('Spam analysis failed:', error.message);
    return {
      spamScore: 0,
      isSpam: false,
      spamType: 'unknown',
      riskLevel: 'low',
      indicators: [],
      phishingProbability: 0,
      malwareRisk: 0,
      senderReputation: 'unknown',
      linkAnalysis: { totalLinks: 0, suspiciousLinks: 0, safeLinks: 0, details: [] },
      recommendation: 'review',
      aiConfidence: 0,
      aiModel: OPENROUTER_MODEL,
      aiResponse: null
    };
  }
};

// AI Email Prioritizer (Productivity) - Productivity-focused prioritization
const prioritizeForProductivity = async (email) => {
  const messages = [
    {
      role: 'system',
      content: `You are an AI productivity specialist. Analyze the email and provide productivity-focused prioritization to help the user manage their time effectively.

      Respond in JSON format:
      {
        "productivityScore": <1-100>,
        "actionRequired": true/false,
        "actionType": "reply|forward|archive|delegate|schedule|read_later|none",
        "estimatedTimeMinutes": <number>,
        "bestTimeToHandle": "morning|midday|afternoon|evening|anytime",
        "delegationSuggestion": "<who to delegate to or null>",
        "batchingCategory": "quick_replies|deep_work|meetings|admin|reading|none",
        "focusLevelRequired": "high|medium|low",
        "deadline": "<YYYY-MM-DD HH:MM or null>",
        "dependencies": ["dependency1", "dependency2"],
        "productivityTips": ["tip1", "tip2"],
        "energyLevel": "high_energy|medium_energy|low_energy",
        "contextSwitchCost": "high|medium|low"
      }`
    },
    {
      role: 'user',
      content: `Analyze this email for productivity prioritization:\n\nFrom: ${email.from_email} (${email.from_name || 'Unknown'})\nSubject: ${email.subject}\nReceived: ${email.received_at || 'Unknown'}\n\nBody:\n${email.body}`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return {
      ...parsed,
      aiConfidence: 87,
      aiModel: OPENROUTER_MODEL,
      aiResponse: result
    };
  } catch (error) {
    console.error('Productivity prioritization failed:', error.message);
    return {
      productivityScore: 50,
      actionRequired: false,
      actionType: 'none',
      estimatedTimeMinutes: 5,
      bestTimeToHandle: 'anytime',
      delegationSuggestion: null,
      batchingCategory: 'none',
      focusLevelRequired: 'low',
      deadline: null,
      dependencies: [],
      aiConfidence: 0,
      aiModel: OPENROUTER_MODEL,
      aiResponse: null
    };
  }
};

// AI Email Subject Optimizer (Marketing) - Optimize email subjects for marketing
const optimizeSubject = async (subject, context = {}) => {
  const messages = [
    {
      role: 'system',
      content: `You are an AI email marketing specialist. Optimize the given email subject line for better engagement and click rates.

      Respond in JSON format:
      {
        "originalSubject": "<original>",
        "optimizedSubjects": [
          {"subject": "<option1>", "score": <1-100>, "style": "<style description>"},
          {"subject": "<option2>", "score": <1-100>, "style": "<style description>"},
          {"subject": "<option3>", "score": <1-100>, "style": "<style description>"}
        ],
        "bestSubject": "<recommended best option>",
        "improvementScore": <0-100>,
        "targetAudience": "<identified audience>",
        "tone": "<tone analysis>",
        "clickAppealScore": <1-100>,
        "urgencyScore": <1-100>,
        "clarityScore": <1-100>,
        "personalizationSuggestions": ["suggestion1", "suggestion2"],
        "abTestVariants": [
          {"variant": "A", "subject": "<subject>", "hypothesis": "<what it tests>"},
          {"variant": "B", "subject": "<subject>", "hypothesis": "<what it tests>"}
        ],
        "avoidedPitfalls": ["pitfall1", "pitfall2"],
        "industryBestPractices": ["practice1", "practice2"]
      }`
    },
    {
      role: 'user',
      content: `Optimize this email subject line:\n\nOriginal Subject: ${subject}\n\nContext:\n- Target Audience: ${context.targetAudience || 'General'}\n- Purpose: ${context.purpose || 'Communication'}\n- Tone Preference: ${context.tone || 'Professional'}\n- Industry: ${context.industry || 'General'}`
    }
  ];

  try {
    const result = await callOpenRouter(messages);
    const parsed = cleanJsonResponse(result.content);
    return {
      ...parsed,
      aiConfidence: 91,
      aiModel: OPENROUTER_MODEL,
      aiResponse: result
    };
  } catch (error) {
    console.error('Subject optimization failed:', error.message);
    return {
      originalSubject: subject,
      optimizedSubjects: [],
      bestSubject: subject,
      improvementScore: 0,
      targetAudience: 'Unknown',
      tone: 'Unknown',
      clickAppealScore: 50,
      urgencyScore: 50,
      clarityScore: 50,
      personalizationSuggestions: [],
      abTestVariants: [],
      aiConfidence: 0,
      aiModel: OPENROUTER_MODEL,
      aiResponse: null
    };
  }
};

module.exports = {
  categorizeEmail,
  prioritizeEmail,
  generateDraftResponse,
  suggestTemplateResponse,
  analyzeEmailSentiment,
  extractActionItems,
  summarizeEmail,
  callOpenRouter,
  parseAIJson,
  cleanJsonResponse,
  // New AI features
  scorePriority,
  extractMeeting,
  suggestFollowUp,
  analyzeSpam,
  prioritizeForProductivity,
  optimizeSubject
};
