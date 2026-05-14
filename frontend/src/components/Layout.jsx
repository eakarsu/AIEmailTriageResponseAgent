import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail, FileText, Layout as LayoutIcon, Users, Tag, Filter,
  BarChart3, Settings, FolderOpen, Home, LogOut, Menu, X, Brain,
  Gauge, Calendar, Bell, Shield, Zap, Sparkles, ChevronDown, ChevronUp, UserCog
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(true);

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/emails', label: 'Inbox', icon: Mail },
    { path: '/drafts', label: 'Drafts', icon: FileText },
    { path: '/templates', label: 'Templates', icon: LayoutIcon },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/labels', label: 'Labels', icon: Tag },
    { path: '/rules', label: 'Rules', icon: Filter },
    { path: '/categories', label: 'Categories', icon: FolderOpen },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const adminNavItems = isAdmin ? [
    { path: '/settings', label: 'User Management', icon: UserCog },
  ] : [];

  const aiNavItems = [
    { path: '/priority-scorer', label: 'Priority Scorer', icon: Gauge, color: 'text-purple-500' },
    { path: '/meeting-extractor', label: 'Meeting Extractor', icon: Calendar, color: 'text-blue-500' },
    { path: '/followup-reminder', label: 'Follow-up Reminder', icon: Bell, color: 'text-orange-500' },
    { path: '/template-suggester', label: 'Template Suggester', icon: FileText, color: 'text-teal-500' },
    { path: '/spam-intelligence', label: 'Spam Intelligence', icon: Shield, color: 'text-red-500' },
    { path: '/email-prioritizer', label: 'Email Prioritizer', icon: Zap, color: 'text-indigo-500' },
    { path: '/subject-optimizer', label: 'Subject Optimizer', icon: Sparkles, color: 'text-pink-500' },
    { path: '/ai-advanced', label: 'Advanced AI', icon: Brain, color: 'text-indigo-500' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderNavItem = (item, onClick = () => {}) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => { onClick(); setSidebarOpen(false); }}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <item.icon className={`w-5 h-5 ${item.color || ''}`} />
        <span className="font-medium text-sm">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          <span className="font-bold text-gray-900 dark:text-white">Email Triage</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">AI Email Triage</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Smart Email Management</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1 pb-32">
          {/* Main Navigation */}
          {mainNavItems.slice(0, 1).map((item) => renderNavItem(item))}

          {/* AI Features Section */}
          <div className="pt-3">
            <button
              onClick={() => setAiMenuOpen(!aiMenuOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Features
              </span>
              {aiMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {aiMenuOpen && (
              <div className="ml-2 space-y-1 mt-1">
                {aiNavItems.map((item) => renderNavItem(item))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>

          {/* Rest of Navigation */}
          {mainNavItems.slice(1).map((item) => renderNavItem(item))}

          {/* Admin Section */}
          {adminNavItems.length > 0 && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-3"></div>
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
              {adminNavItems.map((item) => renderNavItem(item))}
            </>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;
