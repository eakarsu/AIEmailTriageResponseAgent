import React, { useState, useEffect } from 'react';
import { Shield, Trash2, RefreshCw, Mail, AlertTriangle, CheckCircle, XCircle, Link2, Search, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay, { ScoreBadge, AIListDisplay, AIKeyValue } from '../components/AIResponseDisplay';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { getSpamAnalyses, getSpamAnalysis, analyzeSpam, deleteSpamAnalysis, getSpamStats, getEmails } from '../services/api';

const SpamIntelligence = () => {
  const [analyses, setAnalyses] = useState([]);
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
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
      const [analysesData, emailsData, statsData] = await Promise.all([
        getSpamAnalyses({ page: 1, limit: 100 }),
        getEmails(),
        getSpamStats()
      ]);
      setAnalyses(Array.isArray(analysesData) ? analysesData : (analysesData?.data || []));
      setEmails(emailsData.emails || []);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAnalysisForEmail = (emailId) => {
    return analyses.find((a) => a.email_id === emailId);
  };

  const handleRowClick = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    const existing = getAnalysisForEmail(email.id);
    if (existing) {
      try {
        const data = await getSpamAnalysis(existing.id);
        setSelectedAnalysis(data);
      } catch (error) {
        console.error('Failed to load analysis:', error);
        setSelectedAnalysis(null);
      }
    } else {
      setSelectedAnalysis(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedEmail) return;
    setAnalyzingId(selectedEmail.id);
    setError(null);
    try {
      const result = await analyzeSpam(selectedEmail.id);
      await loadData();
      setSelectedAnalysis(result);
    } catch (err) {
      toast.error(err.message || 'Failed to analyze for spam');
      setError(err.message || 'Failed to analyze for spam');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Analysis', message: 'Delete this spam analysis?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteSpamAnalysis(id);
      setSelectedAnalysis(null);
      await loadData();
      toast.success('Spam analysis deleted');
    } catch (error) {
      toast.error('Failed to delete analysis');
    }
  };

  const getRiskColor = (level) => {
    const colors = { critical: 'bg-red-500 text-white', high: 'bg-orange-500 text-white', medium: 'bg-yellow-500 text-white', low: 'bg-green-500 text-white', safe: 'bg-blue-500 text-white' };
    return colors[level] || colors.medium;
  };

  const getRecommendationColor = (rec) => {
    const colors = { allow: 'text-green-600 bg-green-100', review: 'text-yellow-600 bg-yellow-100', quarantine: 'text-orange-600 bg-orange-100', block: 'text-red-600 bg-red-100', delete: 'text-red-700 bg-red-200' };
    return colors[rec] || colors.review;
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
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Spam Intelligence</h1>
            <p className="text-gray-500">Click an email to analyze for spam & threats</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full font-medium">
            {analyses.length} analyzed
          </span>
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full font-medium">
            {emails.length} emails
          </span>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Total Analyzed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_analyzed || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-gray-500">Safe</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.safe_count || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-gray-500">Spam</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.spam_count || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-500">Avg Spam Score</p>
            <p className="text-2xl font-bold text-orange-600">{Math.round(stats.avg_spam_score || 0)}%</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search emails by subject, sender..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm" />
      </div>

      {/* Email List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredEmails.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-gray-600">{searchQuery ? 'No emails match your search' : 'No emails found'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEmails.map((email) => {
              const existing = getAnalysisForEmail(email.id);
              return (
                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(email)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${existing ? (existing.is_spam ? 'bg-red-100' : 'bg-green-100') : 'bg-gray-100'}`}>
                        {existing ? (
                          existing.is_spam ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Mail className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 truncate">{email.subject || 'No Subject'}</h3>
                        <p className="text-sm text-gray-500 truncate">
                          {email.from_name || email.from_email}
                          {email.received_at && <span className="ml-2 text-gray-400">{new Date(email.received_at).toLocaleDateString()}</span>}
                        </p>
                      </div>
                    </div>
                    {existing && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(existing.risk_level)}`}>{existing.risk_level}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${existing.spam_score >= 70 ? 'bg-red-100 text-red-700' : existing.spam_score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{existing.spam_score}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Detail / Analyze Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedEmail(null); setSelectedAnalysis(null); }} title="Spam Analysis" size="lg">
        {selectedEmail && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-red-100">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <h3 className="font-semibold text-gray-900">{selectedEmail.subject || 'No Subject'}</h3>
              <p className="text-sm text-gray-500 mt-1">From: {selectedEmail.from_name || selectedEmail.from_email}</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
            )}

            {!selectedAnalysis && analyzingId !== selectedEmail.id && (
              <div className="text-center py-8">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-6">This email has not been analyzed for spam yet</p>
                <button onClick={handleAnalyze} className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium">
                  <Shield className="w-5 h-5" />
                  Analyze for Threats
                </button>
              </div>
            )}

            {analyzingId === selectedEmail.id && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-red-500 animate-spin" />
                <p className="text-red-600 font-medium">Analyzing for threats...</p>
              </div>
            )}

            {selectedAnalysis && analyzingId !== selectedEmail.id && (
              <>
                <AIResponseDisplay aiResponse={selectedAnalysis.ai_response} title="Spam Intelligence Report">
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <ScoreBadge score={selectedAnalysis.spam_score} label="Spam Score" />
                    <ScoreBadge score={selectedAnalysis.phishing_probability} label="Phishing Risk" />
                    <ScoreBadge score={selectedAnalysis.malware_risk} label="Malware Risk" />
                    <div className="text-center">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-lg font-bold ${getRiskColor(selectedAnalysis.risk_level)}`}>
                        {selectedAnalysis.risk_level?.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Risk Level</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIKeyValue label="Is Spam" value={selectedAnalysis.is_spam ? 'Yes' : 'No'} valueColor={selectedAnalysis.is_spam ? 'text-red-600' : 'text-green-600'} />
                      <AIKeyValue label="Spam Type" value={selectedAnalysis.spam_type} />
                      <AIKeyValue label="Sender Reputation" value={selectedAnalysis.sender_reputation} />
                      <div className="mt-3">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getRecommendationColor(selectedAnalysis.recommendation)}`}>
                          Recommendation: {selectedAnalysis.recommendation}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIListDisplay items={selectedAnalysis.indicators} title="Threat Indicators" icon={AlertTriangle} emptyText="No indicators found" />
                    </div>
                  </div>

                  {selectedAnalysis.link_analysis && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Link2 className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-gray-700">Link Analysis</span>
                      </div>
                      {(() => {
                        const linkData = typeof selectedAnalysis.link_analysis === 'string' ? JSON.parse(selectedAnalysis.link_analysis) : selectedAnalysis.link_analysis;
                        return (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-lg font-bold text-gray-900">{linkData.totalLinks || 0}</p>
                              <p className="text-xs text-gray-500">Total Links</p>
                            </div>
                            <div className="text-center p-2 bg-red-50 rounded">
                              <p className="text-lg font-bold text-red-600">{linkData.suspiciousLinks || 0}</p>
                              <p className="text-xs text-gray-500">Suspicious</p>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <p className="text-lg font-bold text-green-600">{linkData.safeLinks || 0}</p>
                              <p className="text-xs text-gray-500">Safe</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </AIResponseDisplay>

                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <button onClick={() => handleDelete(selectedAnalysis.id)} className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button onClick={handleAnalyze} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
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

export default SpamIntelligence;
