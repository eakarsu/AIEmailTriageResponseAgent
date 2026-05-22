import React, { useEffect, useState } from 'react';
import { Filter, Plus, Trash2, Save, Beaker, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

const API = '/api/custom-views';
const CATEGORIES = ['urgent', 'informational', 'sales', 'spam'];
const PRIORITIES = ['high', 'medium', 'low'];

const headers = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const emptyRule = () => ({
  name: '',
  from_domain: '',
  subject_regex: '',
  category: 'informational',
  priority: 'medium',
  active: true,
});

const TriageRulesEditor = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);          // either {} (new) or existing rule
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/rules`, { headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRules(data.rules || []);
    } catch (e) {
      setError(e.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !editing.id;
      const url = isNew ? `${API}/rules` : `${API}/rules/${editing.id}`;
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
      setTestResult(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      const r = await fetch(`${API}/rules/${id}`, { method: 'DELETE', headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleActive = async (rule) => {
    try {
      const r = await fetch(`${API}/rules/${rule.id}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ active: !rule.active }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const testRule = async () => {
    if (!editing) return;
    setTesting(true);
    try {
      const r = await fetch(`${API}/rules/test`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(editing),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setTestResult(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div data-testid="triage-rules-editor" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" /> Triage Rules
          </h2>
          <p className="text-sm text-gray-500">
            Map from-domain / subject-regex matches to category + priority. Test against sample inbox before saving.
          </p>
        </div>
        <button
          onClick={() => { setEditing(emptyRule()); setTestResult(null); }}
          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New rule
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">No rules yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">From domain</th>
                <th className="text-left px-3 py-2">Subject regex</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Priority</th>
                <th className="text-left px-3 py-2">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">{r.from_domain || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 font-mono text-xs">{r.subject_regex || '—'}</td>
                  <td className="px-3 py-2">{r.category}</td>
                  <td className="px-3 py-2 uppercase text-xs">{r.priority}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => toggleActive(r)} className="text-gray-700">
                      {r.active ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                  </td>
                  <td className="px-3 py-2 flex gap-2 justify-end">
                    <button onClick={() => { setEditing({ ...r }); setTestResult(null); }} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => remove(r.id)} className="text-red-600 hover:underline text-xs">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div data-testid="rule-editor-panel" className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-gray-800">{editing.id ? 'Edit rule' : 'New rule'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-gray-600">Name</span>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 border rounded" placeholder="Escalate VIP" />
            </label>
            <label className="text-sm">
              <span className="text-gray-600">From domain (substring match)</span>
              <input value={editing.from_domain} onChange={(e) => setEditing({ ...editing, from_domain: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 border rounded font-mono" placeholder="bigcorp.com" />
            </label>
            <label className="text-sm">
              <span className="text-gray-600">Subject regex (case-insensitive)</span>
              <input value={editing.subject_regex} onChange={(e) => setEditing({ ...editing, subject_regex: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 border rounded font-mono" placeholder="URGENT|outage" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                <span className="text-gray-600">Category</span>
                <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 border rounded">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-gray-600">Priority</span>
                <select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })}
                  className="mt-1 w-full px-2 py-1.5 border rounded">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={!!editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              Active
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <button onClick={testRule} disabled={testing}
              className="flex items-center gap-1 text-sm px-3 py-1.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Beaker className="w-4 h-4" />}
              Test against sample inbox
            </button>
            <button onClick={save} disabled={saving || !editing.name}
              className="flex items-center gap-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button onClick={() => { setEditing(null); setTestResult(null); }}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">
              Cancel
            </button>
          </div>

          {testResult && (
            <div data-testid="rule-test-result" className="mt-3 border border-amber-200 bg-amber-50 rounded p-3 text-sm">
              <div className="font-semibold mb-2">
                Matches: {testResult.match_count} / {testResult.sample_size}
              </div>
              {testResult.matches.length === 0 ? (
                <div className="text-gray-500">No emails matched.</div>
              ) : (
                <ul className="space-y-1 max-h-40 overflow-auto">
                  {testResult.matches.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        <span className="text-gray-500 font-mono">{m.from}</span> — {m.subject}
                      </span>
                      <span className="text-xs text-gray-400">(now: {m.current_category})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TriageRulesEditor;
