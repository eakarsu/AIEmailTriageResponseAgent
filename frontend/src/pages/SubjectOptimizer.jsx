import React, { useState, useEffect } from 'react';
import { Sparkles, Trash2, RefreshCw, Mail, Lightbulb, Copy, CheckCircle, Search, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay, { ScoreBadge, AIListDisplay, AIKeyValue } from '../components/AIResponseDisplay';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { getSubjectOptimizations, getSubjectOptimization, optimizeEmailSubject, deleteSubjectOptimization, getEmails } from '../services/api';

const SubjectOptimizer = () => {
  const [optimizations, setOptimizations] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizingId, setOptimizingId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedOptimization, setSelectedOptimization] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [optimizationsData, emailsData] = await Promise.all([
        getSubjectOptimizations(),
        getEmails()
      ]);
      setOptimizations(Array.isArray(optimizationsData) ? optimizationsData : []);
      setEmails(emailsData.emails || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOptimizationForEmail = (emailId) => {
    return optimizations.find((o) => o.email_id === emailId);
  };

  const handleRowClick = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    const existing = getOptimizationForEmail(email.id);
    if (existing) {
      try {
        const data = await getSubjectOptimization(existing.id);
        setSelectedOptimization(data);
      } catch (error) {
        console.error('Failed to load optimization:', error);
        setSelectedOptimization(null);
      }
    } else {
      setSelectedOptimization(null);
    }
  };

  const handleOptimize = async () => {
    if (!selectedEmail) return;
    setOptimizingId(selectedEmail.id);
    setError(null);
    try {
      const result = await optimizeEmailSubject(selectedEmail.id);
      await loadData();
      setSelectedOptimization(result);
    } catch (err) {
      toast.error(err.message || 'Failed to optimize subject');
      setError(err.message || 'Failed to optimize subject');
    } finally {
      setOptimizingId(null);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Optimization', message: 'Delete this optimization?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteSubjectOptimization(id);
      setSelectedOptimization(null);
      await loadData();
      toast.success('Optimization deleted');
    } catch (error) {
      toast.error('Failed to delete optimization');
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const parseOptimizedSubjects = (data) => {
    if (!data) return [];
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return data;
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
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Subject Optimizer</h1>
            <p className="text-gray-500">Click an email to optimize its subject line</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full font-medium">
            {optimizations.length} optimized
          </span>
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full font-medium">
            {emails.length} emails
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search emails by subject, sender..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm" />
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
              const existing = getOptimizationForEmail(email.id);
              return (
                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(email)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${existing ? 'bg-pink-100' : 'bg-gray-100'}`}>
                        {existing ? (
                          <Sparkles className="w-5 h-5 text-pink-600" />
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        existing.improvement_score >= 70 ? 'bg-green-100 text-green-700' :
                        existing.improvement_score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                      }`}>+{existing.improvement_score || 0}%</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Detail / Optimize Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedEmail(null); setSelectedOptimization(null); }} title="Subject Optimization" size="lg">
        {selectedEmail && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-100">
              <div className="flex items-center gap-2 text-pink-600 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <h3 className="font-semibold text-gray-900">{selectedEmail.subject || 'No Subject'}</h3>
              <p className="text-sm text-gray-500 mt-1">From: {selectedEmail.from_name || selectedEmail.from_email}</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
            )}

            {!selectedOptimization && optimizingId !== selectedEmail.id && (
              <div className="text-center py-8">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-6">Subject line has not been optimized yet</p>
                <button onClick={handleOptimize} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-colors font-medium">
                  <Sparkles className="w-5 h-5" />
                  Optimize Subject
                </button>
              </div>
            )}

            {optimizingId === selectedEmail.id && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-pink-500 animate-spin" />
                <p className="text-pink-600 font-medium">Optimizing subject line...</p>
              </div>
            )}

            {selectedOptimization && optimizingId !== selectedEmail.id && (
              <>
                {/* Original vs Best */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-2">ORIGINAL</p>
                    <p className="text-gray-700">{selectedOptimization.original_subject}</p>
                  </div>
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-200">
                    <p className="text-xs text-pink-600 mb-2">BEST OPTIMIZED</p>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{selectedOptimization.best_subject}</p>
                      <button onClick={() => handleCopy(selectedOptimization.best_subject, 'best')} className="p-1.5 text-gray-400 hover:text-pink-500 transition-colors">
                        {copiedIndex === 'best' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <AIResponseDisplay aiResponse={selectedOptimization.ai_response} title="Optimization Analysis">
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <ScoreBadge score={selectedOptimization.improvement_score || 0} label="Improvement" />
                    <ScoreBadge score={selectedOptimization.click_appeal_score || 0} label="Click Appeal" />
                    <ScoreBadge score={selectedOptimization.urgency_score || 0} label="Urgency" />
                    <ScoreBadge score={selectedOptimization.clarity_score || 0} label="Clarity" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIKeyValue label="Target Audience" value={selectedOptimization.target_audience || 'General'} />
                      <AIKeyValue label="Tone" value={selectedOptimization.tone || 'Professional'} />
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIListDisplay items={selectedOptimization.personalization_suggestions} title="Personalization Tips" icon={Lightbulb} emptyText="No tips" />
                    </div>
                  </div>

                  {/* All Optimized Subjects */}
                  <div className="bg-white rounded-lg p-4 border border-gray-100 mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">All Optimized Versions</h4>
                    <div className="space-y-2">
                      {parseOptimizedSubjects(selectedOptimization.optimized_subjects).map((opt, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-gray-900">{opt.subject}</p>
                            <p className="text-xs text-gray-500 mt-1">{opt.style}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-pink-600">{opt.score}%</span>
                            <button onClick={() => handleCopy(opt.subject, idx)} className="p-1.5 text-gray-400 hover:text-pink-500 transition-colors">
                              {copiedIndex === idx ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedOptimization.a_b_test_variants && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">A/B Test Variants</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {(typeof selectedOptimization.a_b_test_variants === 'string' ? JSON.parse(selectedOptimization.a_b_test_variants) : selectedOptimization.a_b_test_variants).map((variant, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center text-sm font-medium">{variant.variant}</span>
                              <span className="text-sm font-medium text-gray-700">{variant.subject}</span>
                            </div>
                            <p className="text-xs text-gray-500">{variant.hypothesis}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AIResponseDisplay>

                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <button onClick={() => handleDelete(selectedOptimization.id)} className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button onClick={handleOptimize} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 text-sm">
                    <RefreshCw className="w-4 h-4" />
                    Re-optimize
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

export default SubjectOptimizer;
