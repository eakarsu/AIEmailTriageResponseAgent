import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, FileText, Layout, Users, Tag, Filter,
  BarChart3, Settings, FolderOpen, Brain,
  ArrowUp, Gauge, Calendar, Bell, Shield,
  Zap, Sparkles
} from 'lucide-react';
import { getDashboardSummary } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // AI Features Cards
  const aiFeatureCards = [
    {
      title: 'AI Priority Scorer',
      description: 'Deep AI analysis of email priorities',
      icon: Gauge,
      color: 'bg-purple-500',
      path: '/priority-scorer',
      badge: 'AI'
    },
    {
      title: 'AI Meeting Extractor',
      description: 'Extract meeting details from emails',
      icon: Calendar,
      color: 'bg-blue-500',
      path: '/meeting-extractor',
      badge: 'AI'
    },
    {
      title: 'AI Follow-up Reminder',
      description: 'Smart follow-up suggestions',
      icon: Bell,
      color: 'bg-orange-500',
      path: '/followup-reminder',
      badge: 'AI'
    },
    {
      title: 'AI Template Suggester',
      description: 'Match emails to templates with AI',
      icon: FileText,
      color: 'bg-teal-500',
      path: '/template-suggester',
      badge: 'AI'
    },
    {
      title: 'AI Spam Intelligence',
      description: 'Advanced spam & threat detection',
      icon: Shield,
      color: 'bg-red-500',
      path: '/spam-intelligence',
      badge: 'AI'
    },
    {
      title: 'AI Email Prioritizer',
      description: 'Productivity-focused prioritization',
      icon: Zap,
      color: 'bg-indigo-500',
      path: '/email-prioritizer',
      badge: 'Productivity'
    },
    {
      title: 'AI Subject Optimizer',
      description: 'Marketing-optimized subject lines',
      icon: Sparkles,
      color: 'bg-gradient-to-r from-pink-500 to-rose-500',
      path: '/subject-optimizer',
      badge: 'Marketing'
    }
  ];

  // Standard Features Cards
  const standardFeatureCards = [
    {
      title: 'Inbox',
      description: 'View and manage all your emails',
      icon: Mail,
      color: 'bg-blue-500',
      path: '/emails',
      stat: summary?.totalEmails || 0,
      statLabel: 'Total Emails'
    },
    {
      title: 'Draft Responses',
      description: 'AI-generated response drafts',
      icon: FileText,
      color: 'bg-green-500',
      path: '/drafts',
      stat: summary?.totalDrafts || 0,
      statLabel: 'Drafts'
    },
    {
      title: 'Templates',
      description: 'Reusable email templates',
      icon: Layout,
      color: 'bg-purple-500',
      path: '/templates',
      stat: null,
      statLabel: 'Templates'
    },
    {
      title: 'Contacts',
      description: 'Manage your contacts',
      icon: Users,
      color: 'bg-pink-500',
      path: '/contacts',
      stat: null,
      statLabel: 'Contacts'
    },
    {
      title: 'Labels',
      description: 'Organize with labels',
      icon: Tag,
      color: 'bg-yellow-500',
      path: '/labels',
      stat: null,
      statLabel: 'Labels'
    },
    {
      title: 'Rules',
      description: 'Automation rules',
      icon: Filter,
      color: 'bg-indigo-500',
      path: '/rules',
      stat: null,
      statLabel: 'Active Rules'
    },
    {
      title: 'Categories',
      description: 'Email categories',
      icon: FolderOpen,
      color: 'bg-teal-500',
      path: '/categories',
      stat: null,
      statLabel: 'Categories'
    },
    {
      title: 'Analytics',
      description: 'Email statistics',
      icon: BarChart3,
      color: 'bg-orange-500',
      path: '/analytics',
      stat: null,
      statLabel: 'Reports'
    },
    {
      title: 'Settings',
      description: 'App configuration',
      icon: Settings,
      color: 'bg-gray-500',
      path: '/settings',
      stat: null,
      statLabel: ''
    }
  ];

  const priorityColors = {
    1: 'bg-red-500',
    2: 'bg-orange-500',
    3: 'bg-yellow-500',
    4: 'bg-green-500',
    5: 'bg-gray-500'
  };

  const priorityLabels = {
    1: 'Critical',
    2: 'High',
    3: 'Normal',
    4: 'Low',
    5: 'Very Low'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Emails</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalEmails || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unread</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.unreadEmails || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <ArrowUp className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">AI Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.aiGeneratedDrafts || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Brain className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Drafts</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalDrafts || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Priority Distribution */}
      {summary?.byPriority && summary.byPriority.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="flex gap-4 flex-wrap">
            {summary.byPriority.map((item) => (
              <div key={item.priority} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${priorityColors[item.priority]}`}></div>
                <span className="text-sm text-gray-600">
                  {priorityLabels[item.priority]}: {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Distribution */}
      {summary?.byCategory && summary.byCategory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Emails by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {summary.byCategory.map((item) => (
              <div key={item.category} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-500">{item.category || 'Uncategorized'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Features */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          AI-Powered Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {aiFeatureCards.map((card) => (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 ${card.color} rounded-xl group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{card.title}</h3>
                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full shrink-0">
                      {card.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Features */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {standardFeatureCards.map((card) => (
            <div
              key={card.path}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 ${card.color} rounded-lg`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{card.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                  {card.stat !== null && (
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      {card.stat} <span className="text-sm font-normal text-gray-500">{card.statLabel}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
