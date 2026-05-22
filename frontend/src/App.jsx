import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Emails from './pages/Emails';
import Drafts from './pages/Drafts';
import Templates from './pages/Templates';
import Contacts from './pages/Contacts';
import Labels from './pages/Labels';
import Rules from './pages/Rules';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

// New AI Feature Pages
import PriorityScorer from './pages/PriorityScorer';
import MeetingExtractor from './pages/MeetingExtractor';
import FollowupReminder from './pages/FollowupReminder';
import TemplateSuggester from './pages/TemplateSuggester';
import SpamIntelligence from './pages/SpamIntelligence';
import EmailPrioritizer from './pages/EmailPrioritizer';
import SubjectOptimizer from './pages/SubjectOptimizer';
import AIAdvanced from './pages/AIAdvanced';

import Batch03Features from './pages/Batch03Features';
import CustomViewsPage from './pages/CustomViewsPage';
import SlaReplyBreachMonitor from './pages/SlaReplyBreachMonitor';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <Router>
            <Routes>
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

          <Route path="/batch03" element={<Batch03Features />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/emails" element={<ProtectedRoute><ErrorBoundary><Emails /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/drafts" element={<ProtectedRoute><ErrorBoundary><Drafts /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute><ErrorBoundary><Templates /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><ErrorBoundary><Contacts /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/labels" element={<ProtectedRoute><ErrorBoundary><Labels /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/rules" element={<ProtectedRoute><ErrorBoundary><Rules /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><ErrorBoundary><Categories /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><ErrorBoundary><Analytics /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><ErrorBoundary><Settings /></ErrorBoundary></ProtectedRoute>} />

              {/* New AI Feature Routes */}
              <Route path="/priority-scorer" element={<ProtectedRoute><ErrorBoundary><PriorityScorer /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/meeting-extractor" element={<ProtectedRoute><ErrorBoundary><MeetingExtractor /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/followup-reminder" element={<ProtectedRoute><ErrorBoundary><FollowupReminder /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/template-suggester" element={<ProtectedRoute><ErrorBoundary><TemplateSuggester /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/spam-intelligence" element={<ProtectedRoute><ErrorBoundary><SpamIntelligence /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/email-prioritizer" element={<ProtectedRoute><ErrorBoundary><EmailPrioritizer /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/subject-optimizer" element={<ProtectedRoute><ErrorBoundary><SubjectOptimizer /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/ai-advanced" element={<ProtectedRoute><ErrorBoundary><AIAdvanced /></ErrorBoundary></ProtectedRoute>} />

              {/* Custom Views (Inbox Views) */}
              <Route path="/inbox-views" element={<ProtectedRoute><ErrorBoundary><CustomViewsPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="/sla-reply-breach-monitor" element={<ProtectedRoute><ErrorBoundary><SlaReplyBreachMonitor /></ErrorBoundary></ProtectedRoute>} />
            </Routes>
          </Router>
          <ToastContainer />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
