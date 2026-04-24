import React, { useState } from 'react';
import { Brain, Clock, Zap, ChevronDown, ChevronUp, Sparkles, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const AIResponseDisplay = ({ aiResponse, title = "AI Analysis", children }) => {
  const [expanded, setExpanded] = useState(false);

  if (!aiResponse) return null;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-100 to-blue-100 border-b border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500 rounded-lg">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-purple-800">{title}</span>
            <Sparkles className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="flex items-center gap-4 text-sm">
            {aiResponse.duration && (
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-3.5 h-3.5" />
                <span>{aiResponse.duration}ms</span>
              </div>
            )}
            {aiResponse.model && (
              <div className="flex items-center gap-1 text-gray-600">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs">{aiResponse.model}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {children}
      </div>

      {/* Expandable Raw Response */}
      {aiResponse.content && (
        <div className="border-t border-purple-200">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <span>View Raw AI Response</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="px-4 pb-4">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-60 overflow-y-auto">
                {typeof aiResponse.content === 'string'
                  ? aiResponse.content
                  : JSON.stringify(aiResponse.content, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Score Badge Component
export const ScoreBadge = ({ score, label, colorScheme = 'purple' }) => {
  const colors = {
    purple: score >= 70 ? 'bg-green-100 text-green-800' : score >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="text-center">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${colors[colorScheme]}`}>
        {score}
      </div>
      {label && <p className="text-xs text-gray-500 mt-1">{label}</p>}
    </div>
  );
};

// Status Indicator Component
export const StatusIndicator = ({ status, label }) => {
  const statusConfig = {
    safe: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    danger: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100' },
    critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-200' },
    high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
    medium: { icon: Info, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    low: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' }
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>{label || status}</span>
    </div>
  );
};

// List Display Component
export const AIListDisplay = ({ items, title, icon: Icon, emptyText = "No items" }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-gray-400 text-sm italic">{emptyText}</div>
    );
  }

  return (
    <div>
      {title && (
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4 text-purple-500" />}
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
      )}
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="text-purple-400 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Key-Value Display Component
export const AIKeyValue = ({ label, value, valueColor }) => {
  if (value === null || value === undefined) return null;

  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${valueColor || 'text-gray-900'}`}>
        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
      </span>
    </div>
  );
};

export default AIResponseDisplay;
