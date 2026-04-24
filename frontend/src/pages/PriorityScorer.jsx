import React, { useState, useEffect } from 'react';
import { Gauge, Trash2, RefreshCw, Mail, AlertCircle, Target, Lightbulb, Search, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay, { ScoreBadge, StatusIndicator, AIListDisplay, AIKeyValue } from '../components/AIResponseDisplay';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { getPriorityScores, getPriorityScore, analyzePriority, deletePriorityScore, getEmails } from '../services/api';

const PriorityScorer = () => {
  const [scores, setScores] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [scoresData, emailsData] = await Promise.all([
        getPriorityScores(),
        getEmails()
      ]);
      setScores(Array.isArray(scoresData) ? scoresData : []);
      setEmails(emailsData.emails || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreForEmail = (emailId) => {
    return scores.find((s) => s.email_id === emailId);
  };

  const handleRowClick = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    const existing = getScoreForEmail(email.id);
    if (existing) {
      try {
        const data = await getPriorityScore(existing.id);
        setSelectedScore(data);
      } catch (error) {
        console.error('Failed to load score:', error);
        setSelectedScore(null);
      }
    } else {
      setSelectedScore(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedEmail) return;
    setAnalyzingId(selectedEmail.id);
    setError(null);
    try {
      const result = await analyzePriority(selectedEmail.id);
      await loadData();
      setSelectedScore(result);
    } catch (err) {
      toast.error(err.message || 'Failed to analyze priority');
      setError(err.message || 'Failed to analyze priority');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Score', message: 'Delete this priority score?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deletePriorityScore(id);
      setSelectedScore(null);
      await loadData();
      toast.success('Priority score deleted');
    } catch (error) {
      toast.error('Failed to delete score');
    }
  };

  const getScoreStyle = (score) => {
    if (score >= 70) return 'bg-red-50 text-red-700';
    if (score >= 40) return 'bg-amber-50 text-amber-700';
    return 'bg-emerald-50 text-emerald-700';
  };

  const getUrgencyColor = (level) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
      minimal: 'bg-gray-100 text-gray-800'
    };
    return colors[level] || colors.medium;
  };

  const filteredEmails = emails.filter((email) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (email.subject || '').toLowerCase().includes(q) ||
      (email.from_email || '').toLowerCase().includes(q) ||
      (email.from_name || '').toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500 rounded-xl">
            <Gauge className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Priority Scorer</h1>
            <p className="text-gray-500">Click an email to analyze its priority with AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">
            {scores.length} analyzed
          </span>
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full font-medium">
            {emails.length} emails
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search emails by subject, sender..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Email List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredEmails.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-gray-600">
              {searchQuery ? 'No emails match your search' : 'No emails found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEmails.map((email) => {
              const existingScore = getScoreForEmail(email.id);
              return (
                <div
                  key={email.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(email)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        existingScore ? getScoreStyle(existingScore.score) : 'bg-gray-100 text-gray-400'
                      }`}>
                        {existingScore ? (
                          <span className="text-sm font-bold">{existingScore.score}</span>
                        ) : (
                          <Mail className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{email.subject || 'No Subject'}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {email.from_name || email.from_email}
                          {email.received_at && (
                            <span className="ml-2 text-gray-400">{new Date(email.received_at).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {existingScore && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getUrgencyColor(existingScore.urgency_level)}`}>
                        {existingScore.urgency_level}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Detail / Analyze Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedEmail(null); setSelectedScore(null); }} title="Priority Analysis" size="lg">
        {selectedEmail && (
          <div className="space-y-6">
            {/* Email Info */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <h3 className="font-semibold text-gray-900">{selectedEmail.subject || 'No Subject'}</h3>
              <p className="text-sm text-gray-500 mt-1">From: {selectedEmail.from_name || selectedEmail.from_email}</p>
              {selectedEmail.received_at && (
                <p className="text-xs text-gray-400 mt-1">{new Date(selectedEmail.received_at).toLocaleString()}</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {/* Not yet analyzed */}
            {!selectedScore && analyzingId !== selectedEmail.id && (
              <div className="text-center py-8">
                <Gauge className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-6">This email has not been analyzed yet</p>
                <button
                  onClick={handleAnalyze}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                >
                  <Gauge className="w-5 h-5" />
                  Analyze Priority
                </button>
              </div>
            )}

            {/* Analyzing */}
            {analyzingId === selectedEmail.id && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
                <p className="text-purple-600 font-medium">Analyzing priority...</p>
              </div>
            )}

            {/* Results */}
            {selectedScore && analyzingId !== selectedEmail.id && (
              <>
                <AIResponseDisplay aiResponse={selectedScore.ai_response} title="Priority Analysis">
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <ScoreBadge score={selectedScore.score} label="Priority Score" />
                    <ScoreBadge score={selectedScore.impact_score || 0} label="Impact Score" />
                    <div className="text-center">
                      <StatusIndicator status={selectedScore.urgency_level} label={selectedScore.urgency_level} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIKeyValue label="Time Sensitivity" value={selectedScore.time_sensitivity} />
                      <AIKeyValue label="Sender Importance" value={selectedScore.sender_importance} />
                      <AIKeyValue label="AI Confidence" value={`${selectedScore.ai_confidence}%`} />
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIListDisplay items={selectedScore.keywords_found} title="Keywords Found" icon={Target} emptyText="No keywords detected" />
                    </div>
                  </div>

                  {selectedScore.reasoning && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">Reasoning</span>
                      </div>
                      <p className="text-gray-600">{selectedScore.reasoning}</p>
                    </div>
                  )}

                  <AIListDisplay items={selectedScore.recommendations} title="Recommendations" icon={Lightbulb} emptyText="No recommendations" />
                </AIResponseDisplay>

                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleDelete(selectedScore.id)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-analyze
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default PriorityScorer;
