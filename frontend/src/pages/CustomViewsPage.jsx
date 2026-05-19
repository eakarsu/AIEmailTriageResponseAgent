import React, { useState } from 'react';
import { LayoutGrid, Clock, Filter, Reply } from 'lucide-react';
import InboxKanban from '../components/InboxKanban';
import ResponseHeatmap from '../components/ResponseHeatmap';
import TriageRulesEditor from '../components/TriageRulesEditor';
import AutoReplyBuilder from '../components/AutoReplyBuilder';

const TABS = [
  { key: 'kanban',    label: 'Inbox Kanban',   icon: LayoutGrid, Component: InboxKanban   },
  { key: 'heatmap',   label: 'Response Heatmap', icon: Clock,      Component: ResponseHeatmap },
  { key: 'rules',     label: 'Triage Rules',   icon: Filter,     Component: TriageRulesEditor },
  { key: 'replies',   label: 'Auto-reply Builder', icon: Reply,    Component: AutoReplyBuilder },
];

const CustomViewsPage = () => {
  const [active, setActive] = useState('kanban');
  const Active = TABS.find((t) => t.key === active)?.Component || TABS[0].Component;

  return (
    <div data-testid="custom-views-page" className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbox Views</h1>
        <p className="text-sm text-gray-500">
          Four custom triage tools: kanban board, response-time heatmap, rule editor, and auto-reply builder.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              data-testid={`tab-${t.key}`}
              className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px transition ${
                active === t.key
                  ? 'border-blue-600 text-blue-700 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <Active />
      </div>
    </div>
  );
};

export default CustomViewsPage;
