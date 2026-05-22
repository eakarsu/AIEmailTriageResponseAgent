import React, { useEffect, useState } from 'react';
import { Reply, Plus, Trash2, Save, Loader2, CheckCircle, Circle, ChevronLeft, ChevronRight, Eye, Zap } from 'lucide-react';

const API = '/api/custom-views';
const CATEGORIES = ['', 'urgent', 'informational', 'sales', 'spam'];

const headers = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const emptyTemplate = () => ({
  name: '',
  trigger: { category: '', from_domain: '', keywords: '' },
  body: 'Hi {{sender_name}},\n\nThanks for your message about "{{subject}}". I will respond shortly.\n\n{{my_name}}',
  active: false,
});

const STEPS = [
  { key: 'trigger',  title: 'Trigger condition' },
  { key: 'template', title: 'Template body' },
  { key: 'preview',  title: 'Preview' },
  { key: 'activate', title: 'Activate' },
];

const AutoReplyBuilder = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/auto-replies`, { headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setTemplates(data.templates || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startNew = () => { setEditing(emptyTemplate()); setStep(0); setPreview(null); };
  const startEdit = (t) => { setEditing(JSON.parse(JSON.stringify(t))); setStep(0); setPreview(null); };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const isNew = !editing.id;
      const url = isNew ? `${API}/auto-replies` : `${API}/auto-replies/${editing.id}`;
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: headers(),
        body: JSON.stringify(editing),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete template?')) return;
    try {
      const r = await fetch(`${API}/auto-replies/${id}`, { method: 'DELETE', headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const runPreview = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/auto-replies/preview`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ body: editing.body, vars: {} }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setPreview(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Advance through steps. When entering preview step, fetch preview.
  const next = async () => {
    if (step === STEPS.length - 1) return save();
    const target = step + 1;
    setStep(target);
    if (STEPS[target].key === 'preview') await runPreview();
  };
  const prev = () => setStep(Math.max(0, step - 1));

  return (
    <div data-testid="auto-reply-builder" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Reply className="w-5 h-5 text-blue-600" /> Auto-reply Builder
          </h2>
          <p className="text-sm text-gray-500">
            Multi-step: trigger condition → template body with {'{{vars}}'} → preview → activate.
          </p>
        </div>
        <button onClick={startNew}
          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New template
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading ? (
          <div className="col-span-2 flex items-center gap-2 text-gray-500 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="col-span-2 text-center text-gray-400 py-10 text-sm">No templates yet.</div>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{t.name}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.active ? 'active' : 'inactive'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {t.trigger?.category && <span className="mr-2">category: <b>{t.trigger.category}</b></span>}
                {t.trigger?.from_domain && <span className="mr-2">from: <b>{t.trigger.from_domain}</b></span>}
                {t.trigger?.keywords && <span>keywords: <b>{t.trigger.keywords}</b></span>}
              </div>
              <div className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap">{t.body}</div>
              <div className="flex gap-2 pt-1 border-t">
                <button onClick={() => startEdit(t)} className="text-blue-600 text-xs hover:underline">Edit</button>
                <button onClick={() => remove(t.id)} className="text-red-600 text-xs hover:underline flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <div data-testid="auto-reply-wizard" className="bg-white border border-blue-200 rounded-lg p-4">
          {/* Stepper */}
          <ol className="flex items-center gap-3 mb-4">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-1 text-sm">
                {i < step
                  ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                  : i === step
                    ? <Circle className="w-4 h-4 text-blue-500 fill-blue-100" />
                    : <Circle className="w-4 h-4 text-gray-300" />}
                <span className={i === step ? 'font-semibold text-gray-900' : 'text-gray-500'}>
                  {i + 1}. {s.title}
                </span>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />}
              </li>
            ))}
          </ol>

          {/* Step content */}
          {STEPS[step].key === 'trigger' && (
            <div className="space-y-3">
              <label className="text-sm block">
                <span className="text-gray-600">Template name</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 border rounded" placeholder="VIP acknowledge" />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="text-sm">
                  <span className="text-gray-600">When category equals</span>
                  <select value={editing.trigger.category}
                    onChange={(e) => setEditing({ ...editing, trigger: { ...editing.trigger, category: e.target.value } })}
                    className="mt-1 w-full px-2 py-1.5 border rounded">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c || '(any)'}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-600">From domain contains</span>
                  <input value={editing.trigger.from_domain}
                    onChange={(e) => setEditing({ ...editing, trigger: { ...editing.trigger, from_domain: e.target.value } })}
                    className="mt-1 w-full px-2 py-1.5 border rounded font-mono" placeholder="acme.com" />
                </label>
                <label className="text-sm">
                  <span className="text-gray-600">Keywords (comma)</span>
                  <input value={editing.trigger.keywords}
                    onChange={(e) => setEditing({ ...editing, trigger: { ...editing.trigger, keywords: e.target.value } })}
                    className="mt-1 w-full px-2 py-1.5 border rounded" placeholder="renewal, demo" />
                </label>
              </div>
            </div>
          )}

          {STEPS[step].key === 'template' && (
            <div className="space-y-2">
              <span className="text-sm text-gray-600">
                Body — use <code>{'{{sender_name}}'}</code>, <code>{'{{subject}}'}</code>, <code>{'{{return_date}}'}</code>, <code>{'{{my_name}}'}</code>, <code>{'{{received_at}}'}</code>.
              </span>
              <textarea value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                rows={10}
                className="w-full font-mono text-sm px-3 py-2 border rounded"
              />
            </div>
          )}

          {STEPS[step].key === 'preview' && (
            <div className="space-y-2">
              <button onClick={runPreview}
                className="flex items-center gap-1 text-sm px-3 py-1.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Re-render preview
              </button>
              <pre data-testid="auto-reply-preview"
                className="whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-3 text-sm">
                {preview?.rendered || '(loading preview...)'}
              </pre>
              {preview?.vars && (
                <div className="text-xs text-gray-500">
                  Sample vars: {Object.entries(preview.vars).map(([k, v]) => `${k}=${v}`).join('  ·  ')}
                </div>
              )}
            </div>
          )}

          {STEPS[step].key === 'activate' && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                <Zap className="w-4 h-4 text-amber-500" />
                Activate this template — incoming emails matching the trigger will receive this auto-reply.
              </label>
              <div className="text-xs text-gray-500">
                Click <b>Save</b> below to persist. You can deactivate at any time from the list.
              </div>
            </div>
          )}

          <div className="flex justify-between mt-4 pt-3 border-t">
            <button onClick={prev} disabled={step === 0}
              className="flex items-center gap-1 text-sm px-3 py-1.5 border rounded disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(null); setPreview(null); }}
                className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={next} disabled={busy || (step === 0 && !editing.name)}
                className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {step === STEPS.length - 1 ? (
                  <>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</>
                ) : (
                  <>Next <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoReplyBuilder;
