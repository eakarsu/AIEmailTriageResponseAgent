import React, { useEffect, useState } from 'react';
import { Brain, Zap, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { getContacts } from '../services/api';

// Surfaces apply pass 4 backend endpoints:
//   POST /api/ai/inbox-digest
//   POST /api/ai/sales-sequence
// Auth: existing JWT in localStorage('token').

const tools = [
  {
    id: 'inbox-digest',
    label: 'Inbox Digest',
    description: 'Summarise the most important unread emails into a short briefing.',
    icon: Brain,
    color: 'text-indigo-500',
  },
  {
    id: 'sales-sequence',
    label: 'Sales Sequence',
    description: 'Generate a 3-touch outbound follow-up email sequence for a contact.',
    icon: Send,
    color: 'text-emerald-500',
  },
];

const aiPost = async (path, body) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const AIAdvanced = () => {
  const [active, setActive] = useState('inbox-digest');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorBanner, setErrorBanner] = useState('');

  // Inbox digest state
  const [digestLimit, setDigestLimit] = useState(10);

  // Sales sequence state
  const [contacts, setContacts] = useState([]);
  const [contactId, setContactId] = useState('');
  const [goal, setGoal] = useState('');
  const [product, setProduct] = useState('');
  const [tone, setTone] = useState('professional');

  useEffect(() => {
    if (active === 'sales-sequence') {
      getContacts({ page: 1, limit: 100 })
        .then((data) => {
          const list = Array.isArray(data) ? data : (data?.contacts || data?.data || []);
          setContacts(list);
        })
        .catch(() => setContacts([]));
    }
  }, [active]);

  const submit = async () => {
    setLoading(true);
    setErrorBanner('');
    setResult(null);
    try {
      let body = {};
      let endpoint = '';
      if (active === 'inbox-digest') {
        endpoint = '/ai/inbox-digest';
        body = { limit: Number(digestLimit) || 10 };
      } else if (active === 'sales-sequence') {
        if (!contactId || !goal) {
          setErrorBanner('Please select a contact and enter a goal.');
          setLoading(false);
          return;
        }
        endpoint = '/ai/sales-sequence';
        body = { contact_id: Number(contactId), goal, product, tone };
      }
      const { status, data } = await aiPost(endpoint, body);
      if (status === 503) {
        setErrorBanner(data.error || 'AI not configured. Set OPENROUTER_API_KEY on the server to enable this feature.');
      } else if (status >= 400) {
        setErrorBanner(data.error || `Request failed (${status})`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setErrorBanner(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const tool = tools.find((t) => t.id === active);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-500 rounded-xl">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced AI</h1>
          <p className="text-gray-500 dark:text-gray-400">Cross-resource AI tools for inbox digests and outbound sequences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActive(t.id); setResult(null); setErrorBanner(''); }}
              className={`text-left p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-5 h-5 ${t.color}`} />
                <span className="font-semibold text-gray-900 dark:text-white">{t.label}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.description}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" />
          {tool.label}
        </h3>

        {active === 'inbox-digest' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of unread emails to include</label>
            <input
              type="number"
              min="1"
              max="25"
              value={digestLimit}
              onChange={(e) => setDigestLimit(e.target.value)}
              className="w-32 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
            />
          </div>
        )}

        {active === 'sales-sequence' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">-- choose contact --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Book a 30-minute discovery call"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product/Service</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. AI email assistant"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 font-medium"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Generating...' : 'Run AI'}
        </button>
      </div>

      {errorBanner && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Result</h3>
          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900 p-3 rounded-lg max-h-[600px] overflow-auto">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AIAdvanced;
