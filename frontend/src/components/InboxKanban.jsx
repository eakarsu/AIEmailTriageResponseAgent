import React, { useEffect, useState } from 'react';
import { Mail, AlertTriangle, Info, DollarSign, ShieldOff, Loader2, RefreshCw } from 'lucide-react';

const API = '/api/custom-views';

const COLUMN_META = {
  urgent:        { label: 'Urgent',        icon: AlertTriangle, color: 'border-red-400',     header: 'bg-red-50 text-red-700',     dot: 'bg-red-500'    },
  informational: { label: 'Informational', icon: Info,          color: 'border-blue-400',    header: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-500'   },
  sales:         { label: 'Sales',         icon: DollarSign,    color: 'border-emerald-400', header: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  spam:          { label: 'Spam',          icon: ShieldOff,     color: 'border-gray-400',    header: 'bg-gray-100 text-gray-700',  dot: 'bg-gray-400'   },
};

const headers = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
};

const InboxKanban = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragId, setDragId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/kanban`, { headers: headers() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e.message || 'Failed to load kanban');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const moveEmail = async (emailId, category) => {
    try {
      const r = await fetch(`${API}/kanban/${emailId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ category }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      setError(e.message || 'Move failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading kanban...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Error: {error}
        <button onClick={load} className="ml-3 underline">Retry</button>
      </div>
    );
  }

  return (
    <div data-testid="inbox-kanban" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" /> Inbox Kanban
          </h2>
          <p className="text-sm text-gray-500">
            {data?.total ?? 0} emails across {data?.columns?.length ?? 0} triage columns. Drag cards between columns.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1 text-sm px-3 py-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(data?.columns || []).map((col) => {
          const meta = COLUMN_META[col.key] || COLUMN_META.informational;
          const Icon = meta.icon;
          return (
            <div
              key={col.key}
              data-testid={`kanban-column-${col.key}`}
              className={`bg-white border-2 ${meta.color} rounded-lg flex flex-col min-h-[360px]`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { moveEmail(dragId, col.key); setDragId(null); } }}
            >
              <div className={`px-3 py-2 rounded-t-md ${meta.header} flex items-center justify-between`}>
                <span className="flex items-center gap-2 font-semibold">
                  <Icon className="w-4 h-4" /> {meta.label}
                </span>
                <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full">{col.count}</span>
              </div>
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {col.emails.length === 0 && (
                  <div className="text-xs text-gray-400 italic text-center py-6">No emails</div>
                )}
                {col.emails.map((e) => (
                  <div
                    key={e.id}
                    draggable
                    onDragStart={() => setDragId(e.id)}
                    className="p-2 bg-gray-50 hover:bg-white border border-gray-200 rounded cursor-move shadow-sm"
                    data-testid={`kanban-card-${e.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`}></span>
                      <span className="text-xs text-gray-500 truncate flex-1">{e.from}</span>
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">{e.priority}</span>
                    </div>
                    <div className="font-medium text-sm text-gray-900 truncate">{e.subject}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{e.preview}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InboxKanban;
