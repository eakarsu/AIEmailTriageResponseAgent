const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

// Auth
export const login = (email, password) =>
  fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(handleResponse);

export const register = (email, password, name) =>
  fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  }).then(handleResponse);

export const getMe = () =>
  fetch(`${API_BASE}/auth/me`, { headers: getHeaders() }).then(handleResponse);

export const forgotPassword = (email) =>
  fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }).then(handleResponse);

export const resetPassword = (token, newPassword) =>
  fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  }).then(handleResponse);

export const updateProfile = (data) =>
  fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const getUsers = () =>
  fetch(`${API_BASE}/auth/users`, { headers: getHeaders() }).then(handleResponse);

export const updateUserRole = (id, role) =>
  fetch(`${API_BASE}/auth/users/${id}/role`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ role })
  }).then(handleResponse);

// Emails
export const getEmails = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/emails${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getEmail = (id) =>
  fetch(`${API_BASE}/emails/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createEmail = (data) =>
  fetch(`${API_BASE}/emails`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateEmail = (id, data) =>
  fetch(`${API_BASE}/emails/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteEmail = (id) =>
  fetch(`${API_BASE}/emails/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteEmails = (ids) =>
  fetch(`${API_BASE}/emails/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

export const categorizeEmail = (id) =>
  fetch(`${API_BASE}/emails/${id}/categorize`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const prioritizeEmail = (id) =>
  fetch(`${API_BASE}/emails/${id}/prioritize`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const analyzeEmailSentiment = (id) =>
  fetch(`${API_BASE}/emails/${id}/sentiment`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const extractEmailActions = (id) =>
  fetch(`${API_BASE}/emails/${id}/actions`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const summarizeEmail = (id) =>
  fetch(`${API_BASE}/emails/${id}/summarize`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

// Drafts
export const getDrafts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/drafts${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getDraft = (id) =>
  fetch(`${API_BASE}/drafts/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createDraft = (data) =>
  fetch(`${API_BASE}/drafts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const generateDraft = (emailId, tone) =>
  fetch(`${API_BASE}/drafts/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email_id: emailId, tone })
  }).then(handleResponse);

export const updateDraft = (id, data) =>
  fetch(`${API_BASE}/drafts/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteDraft = (id) =>
  fetch(`${API_BASE}/drafts/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteDrafts = (ids) =>
  fetch(`${API_BASE}/drafts/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

export const regenerateDraft = (id, tone) =>
  fetch(`${API_BASE}/drafts/${id}/regenerate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tone })
  }).then(handleResponse);

export const sendDraft = (id) =>
  fetch(`${API_BASE}/drafts/${id}/send`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

// Templates
export const getTemplates = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/templates${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getTemplate = (id) =>
  fetch(`${API_BASE}/templates/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createTemplate = (data) =>
  fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateTemplate = (id, data) =>
  fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteTemplate = (id) =>
  fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteTemplates = (ids) =>
  fetch(`${API_BASE}/templates/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

// Contacts
export const getContacts = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/contacts${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getContact = (id) =>
  fetch(`${API_BASE}/contacts/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createContact = (data) =>
  fetch(`${API_BASE}/contacts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateContact = (id, data) =>
  fetch(`${API_BASE}/contacts/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteContact = (id) =>
  fetch(`${API_BASE}/contacts/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteContacts = (ids) =>
  fetch(`${API_BASE}/contacts/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

// Labels
export const getLabels = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/labels${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getLabel = (id) =>
  fetch(`${API_BASE}/labels/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createLabel = (data) =>
  fetch(`${API_BASE}/labels`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateLabel = (id, data) =>
  fetch(`${API_BASE}/labels/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteLabel = (id) =>
  fetch(`${API_BASE}/labels/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteLabels = (ids) =>
  fetch(`${API_BASE}/labels/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

// Rules
export const getRules = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/rules${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getRule = (id) =>
  fetch(`${API_BASE}/rules/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createRule = (data) =>
  fetch(`${API_BASE}/rules`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateRule = (id, data) =>
  fetch(`${API_BASE}/rules/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteRule = (id) =>
  fetch(`${API_BASE}/rules/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteRules = (ids) =>
  fetch(`${API_BASE}/rules/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

export const toggleRule = (id) =>
  fetch(`${API_BASE}/rules/${id}/toggle`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

// Analytics
export const getAnalytics = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/analytics${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getAnalyticsRecord = (id) =>
  fetch(`${API_BASE}/analytics/${id}`, { headers: getHeaders() }).then(handleResponse);

export const getDashboardSummary = () =>
  fetch(`${API_BASE}/analytics/summary/dashboard`, { headers: getHeaders() }).then(handleResponse);

export const createAnalytics = (data) =>
  fetch(`${API_BASE}/analytics`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateAnalytics = (id, data) =>
  fetch(`${API_BASE}/analytics/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteAnalytics = (id) =>
  fetch(`${API_BASE}/analytics/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteAnalytics = (ids) =>
  fetch(`${API_BASE}/analytics/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

// Settings
export const getSettings = () =>
  fetch(`${API_BASE}/settings`, { headers: getHeaders() }).then(handleResponse);

export const getSettingsById = (id) =>
  fetch(`${API_BASE}/settings/${id}`, { headers: getHeaders() }).then(handleResponse);

export const updateSettings = (data) =>
  fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateSettingsById = (id, data) =>
  fetch(`${API_BASE}/settings/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteSettings = (id) =>
  fetch(`${API_BASE}/settings/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

// Categories
export const getCategories = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/categories${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getCategory = (id) =>
  fetch(`${API_BASE}/categories/${id}`, { headers: getHeaders() }).then(handleResponse);

export const createCategory = (data) =>
  fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateCategory = (id, data) =>
  fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteCategory = (id) =>
  fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

export const bulkDeleteCategories = (ids) =>
  fetch(`${API_BASE}/categories/bulk`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify({ ids })
  }).then(handleResponse);

// ==================== NEW AI FEATURES ====================

// Priority Scores (AI Priority Scorer)
export const getPriorityScores = () =>
  fetch(`${API_BASE}/priority-scores`, { headers: getHeaders() }).then(handleResponse);

export const getPriorityScore = (id) =>
  fetch(`${API_BASE}/priority-scores/${id}`, { headers: getHeaders() }).then(handleResponse);

export const analyzePriority = (emailId) =>
  fetch(`${API_BASE}/priority-scores/analyze/${emailId}`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const createPriorityScore = (data) =>
  fetch(`${API_BASE}/priority-scores`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updatePriorityScore = (id, data) =>
  fetch(`${API_BASE}/priority-scores/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deletePriorityScore = (id) =>
  fetch(`${API_BASE}/priority-scores/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

// Meetings (AI Meeting Extractor)
export const getMeetings = () =>
  fetch(`${API_BASE}/meetings`, { headers: getHeaders() }).then(handleResponse);

export const getMeeting = (id) =>
  fetch(`${API_BASE}/meetings/${id}`, { headers: getHeaders() }).then(handleResponse);

export const extractMeeting = (emailId) =>
  fetch(`${API_BASE}/meetings/extract/${emailId}`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const createMeeting = (data) =>
  fetch(`${API_BASE}/meetings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateMeeting = (id, data) =>
  fetch(`${API_BASE}/meetings/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteMeeting = (id) =>
  fetch(`${API_BASE}/meetings/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

// Follow-ups (AI Follow-up Reminder)
export const getFollowups = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/followups${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getFollowup = (id) =>
  fetch(`${API_BASE}/followups/${id}`, { headers: getHeaders() }).then(handleResponse);

export const suggestFollowup = (emailId) =>
  fetch(`${API_BASE}/followups/suggest/${emailId}`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const createFollowup = (data) =>
  fetch(`${API_BASE}/followups`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateFollowup = (id, data) =>
  fetch(`${API_BASE}/followups/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const completeFollowup = (id) =>
  fetch(`${API_BASE}/followups/${id}/complete`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const snoozeFollowup = (id, snoozedUntil) =>
  fetch(`${API_BASE}/followups/${id}/snooze`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ snoozed_until: snoozedUntil })
  }).then(handleResponse);

export const deleteFollowup = (id) =>
  fetch(`${API_BASE}/followups/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

// Template Suggestions (AI Template Suggester)
export const getTemplateSuggestions = () =>
  fetch(`${API_BASE}/template-suggestions`, { headers: getHeaders() }).then(handleResponse);

export const getTemplateSuggestion = (id) =>
  fetch(`${API_BASE}/template-suggestions/${id}`, { headers: getHeaders() }).then(handleResponse);

export const suggestTemplate = (emailId) =>
  fetch(`${API_BASE}/template-suggestions/suggest/${emailId}`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const useTemplateSuggestion = (id) =>
  fetch(`${API_BASE}/template-suggestions/${id}/use`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const createTemplateSuggestion = (data) =>
  fetch(`${API_BASE}/template-suggestions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateTemplateSuggestion = (id, data) =>
  fetch(`${API_BASE}/template-suggestions/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteTemplateSuggestion = (id) =>
  fetch(`${API_BASE}/template-suggestions/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

// Spam Analysis (AI Spam Intelligence)
export const getSpamAnalyses = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/spam-analysis${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getSpamAnalysis = (id) =>
  fetch(`${API_BASE}/spam-analysis/${id}`, { headers: getHeaders() }).then(handleResponse);

export const analyzeSpam = (emailId) =>
  fetch(`${API_BASE}/spam-analysis/analyze/${emailId}`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const getSpamStats = () =>
  fetch(`${API_BASE}/spam-analysis/stats/summary`, { headers: getHeaders() }).then(handleResponse);

export const createSpamAnalysis = (data) =>
  fetch(`${API_BASE}/spam-analysis`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateSpamAnalysis = (id, data) =>
  fetch(`${API_BASE}/spam-analysis/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteSpamAnalysis = (id) =>
  fetch(`${API_BASE}/spam-analysis/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

// Email Priorities (AI Email Prioritizer - Productivity)
export const getEmailPriorities = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return fetch(`${API_BASE}/email-priorities${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
};

export const getEmailPriority = (id) =>
  fetch(`${API_BASE}/email-priorities/${id}`, { headers: getHeaders() }).then(handleResponse);

export const analyzeProductivity = (emailId) =>
  fetch(`${API_BASE}/email-priorities/analyze/${emailId}`, {
    method: 'POST',
    headers: getHeaders()
  }).then(handleResponse);

export const getProductivityStats = () =>
  fetch(`${API_BASE}/email-priorities/stats/summary`, { headers: getHeaders() }).then(handleResponse);

export const createEmailPriority = (data) =>
  fetch(`${API_BASE}/email-priorities`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateEmailPriority = (id, data) =>
  fetch(`${API_BASE}/email-priorities/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteEmailPriority = (id) =>
  fetch(`${API_BASE}/email-priorities/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);

// Subject Optimizations (AI Email Subject Optimizer - Marketing)
export const getSubjectOptimizations = () =>
  fetch(`${API_BASE}/subject-optimizations`, { headers: getHeaders() }).then(handleResponse);

export const getSubjectOptimization = (id) =>
  fetch(`${API_BASE}/subject-optimizations/${id}`, { headers: getHeaders() }).then(handleResponse);

export const optimizeSubject = (data) =>
  fetch(`${API_BASE}/subject-optimizations/optimize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const optimizeEmailSubject = (emailId, data = {}) =>
  fetch(`${API_BASE}/subject-optimizations/optimize/${emailId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const createSubjectOptimization = (data) =>
  fetch(`${API_BASE}/subject-optimizations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const updateSubjectOptimization = (id, data) =>
  fetch(`${API_BASE}/subject-optimizations/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  }).then(handleResponse);

export const deleteSubjectOptimization = (id) =>
  fetch(`${API_BASE}/subject-optimizations/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  }).then(handleResponse);
