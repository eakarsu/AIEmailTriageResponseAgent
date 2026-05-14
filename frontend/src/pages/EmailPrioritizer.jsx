import React, { useState, useEffect } from 'react';
import { Zap, Trash2, Edit2, RefreshCw, Mail, Clock, Users, Layers, Search, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay, { ScoreBadge, AIListDisplay, AIKeyValue } from '../components/AIResponseDisplay';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { getEmailPriorities, getEmailPriority, analyzeProductivity, deleteEmailPriority, updateEmailPriority, getEmails } from '../services/api';

const EmailPrioritizer = () => {
  const [priorities, setPriorities] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prioritiesData, emailsData] = await Promise.all([
        getEmailPriorities({ page: 1, limit: 100 }),
        getEmails()
      ]);
      setPriorities(Array.isArray(prioritiesData) ? prioritiesData : (prioritiesData?.data || []));
      setEmails(emailsData.emails || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityForEmail = (emailId) => {
    return priorities.find((p) => p.email_id === emailId);
  };

  const handleRowClick = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    const existing = getPriorityForEmail(email.id);
    if (existing) {
      try {
        const data = await getEmailPriority(existing.id);
        setSelectedPriority(data);
      } catch (error) {
        console.error('Failed to load priority:', error);
        setSelectedPriority(null);
      }
    } else {
      setSelectedPriority(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedEmail) return;
    setAnalyzingId(selectedEmail.id);
    setError(null);
    try {
      const result = await analyzeProductivity(selectedEmail.id);
      await loadData();
      setSelectedPriority(result);
    } catch (err) {
      toast.error(err.message || 'Failed to analyze productivity');
      setError(err.message || 'Failed to analyze productivity');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleEdit = (priority) => {
    setEditForm({
      productivity_score: priority.productivity_score || 50,
      action_type: priority.action_type || 'none',
      estimated_time_minutes: priority.estimated_time_minutes || 5,
      best_time_to_handle: priority.best_time_to_handle || 'anytime',
      batching_category: priority.batching_category || 'none',
      focus_level_required: priority.focus_level_required || 'low'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateEmailPriority(selectedPriority.id, editForm);
      await loadData();
      const data = await getEmailPriority(selectedPriority.id);
      setSelectedPriority(data);
      setShowEditModal(false);
      toast.success('Analysis updated');
    } catch (error) {
      toast.error('Failed to update analysis');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Analysis', message: 'Delete this productivity analysis?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteEmailPriority(id);
      setSelectedPriority(null);
      await loadData();
      toast.success('Analysis deleted');
    } catch (error) {
      toast.error('Failed to delete analysis');
    }
  };

  const getBatchingColor = (category) => {
    const colors = { quick_replies: 'bg-green-100 text-green-700', deep_work: 'bg-purple-100 text-purple-700', meetings: 'bg-blue-100 text-blue-700', admin: 'bg-gray-100 text-gray-700', reading: 'bg-yellow-100 text-yellow-700', none: 'bg-gray-100 text-gray-500' };
    return colors[category] || colors.none;
  };

  const getActionIcon = (action) => {
    const icons = { reply: '↩️', forward: '➡️', archive: '📁', delegate: '👥', schedule: '📅', read_later: '📖', none: '⏸️' };
    return icons[action] || '📧';
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
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500 rounded-xl">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Email Prioritizer</h1>
            <p className="text-gray-500">Click an email to analyze productivity priority</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
            {priorities.length} analyzed
          </span>
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full font-medium">
            {emails.length} emails
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search emails by subject, sender..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm" />
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
              const existing = getPriorityForEmail(email.id);
              return (
                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(email)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${existing ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                        {existing ? (
                          <span className="text-lg">{getActionIcon(existing.action_type)}</span>
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
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          existing.productivity_score >= 70 ? 'bg-green-100 text-green-700' :
                          existing.productivity_score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>{existing.productivity_score}</div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getBatchingColor(existing.batching_category)}`}>
                          {existing.batching_category?.replace('_', ' ') || 'None'}
                        </span>
                        {existing.action_required && (
                          <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Action</span>
                        )}
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
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedEmail(null); setSelectedPriority(null); }} title="Productivity Analysis" size="lg">
        {selectedEmail && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <h3 className="font-semibold text-gray-900">{selectedEmail.subject || 'No Subject'}</h3>
              <p className="text-sm text-gray-500 mt-1">From: {selectedEmail.from_name || selectedEmail.from_email}</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
            )}

            {!selectedPriority && analyzingId !== selectedEmail.id && (
              <div className="text-center py-8">
                <Zap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-6">This email has not been analyzed yet</p>
                <button onClick={handleAnalyze} className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium">
                  <Zap className="w-5 h-5" />
                  Analyze Productivity
                </button>
              </div>
            )}

            {analyzingId === selectedEmail.id && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-indigo-500 animate-spin" />
                <p className="text-indigo-600 font-medium">Analyzing productivity...</p>
              </div>
            )}

            {selectedPriority && analyzingId !== selectedEmail.id && (
              <>
                <AIResponseDisplay aiResponse={selectedPriority.ai_response} title="Productivity Insights">
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <ScoreBadge score={selectedPriority.productivity_score || 0} label="Productivity Score" />
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center text-3xl">{getActionIcon(selectedPriority.action_type)}</div>
                      <p className="text-xs text-gray-500 mt-1">{selectedPriority.action_type?.replace('_', ' ')}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-600">{selectedPriority.estimated_time_minutes || 0}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Est. Minutes</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIKeyValue label="Action Required" value={selectedPriority.action_required} />
                      <AIKeyValue label="Best Time" value={selectedPriority.best_time_to_handle} />
                      <AIKeyValue label="Focus Level" value={selectedPriority.focus_level_required} />
                      <AIKeyValue label="Batching" value={selectedPriority.batching_category?.replace('_', ' ')} />
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      {selectedPriority.delegation_suggestion && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium text-gray-700">Delegation</span>
                          </div>
                          <p className="text-sm text-gray-600">{selectedPriority.delegation_suggestion}</p>
                        </div>
                      )}
                      <AIListDisplay items={selectedPriority.dependencies} title="Dependencies" icon={Layers} emptyText="No dependencies" />
                    </div>
                  </div>

                  {selectedPriority.deadline && (
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Deadline: {new Date(selectedPriority.deadline).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </AIResponseDisplay>

                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <button onClick={() => handleDelete(selectedPriority.id)} className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <div className="flex gap-3">
                    <button onClick={handleAnalyze} className="flex items-center gap-2 px-4 py-2 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 text-sm">
                      <RefreshCw className="w-4 h-4" />
                      Re-analyze
                    </button>
                    <button onClick={() => handleEdit(selectedPriority)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm">
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Productivity Analysis">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Productivity Score</label>
              <input type="number" min="0" max="100" value={editForm.productivity_score || ''} onChange={(e) => setEditForm({ ...editForm, productivity_score: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Time (min)</label>
              <input type="number" min="0" value={editForm.estimated_time_minutes || ''} onChange={(e) => setEditForm({ ...editForm, estimated_time_minutes: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select value={editForm.action_type || ''} onChange={(e) => setEditForm({ ...editForm, action_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="none">None</option>
                <option value="reply">Reply</option>
                <option value="forward">Forward</option>
                <option value="archive">Archive</option>
                <option value="delegate">Delegate</option>
                <option value="schedule">Schedule</option>
                <option value="read_later">Read Later</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Best Time</label>
              <select value={editForm.best_time_to_handle || ''} onChange={(e) => setEditForm({ ...editForm, best_time_to_handle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="anytime">Anytime</option>
                <option value="morning">Morning</option>
                <option value="midday">Midday</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batching Category</label>
              <select value={editForm.batching_category || ''} onChange={(e) => setEditForm({ ...editForm, batching_category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="none">None</option>
                <option value="quick_replies">Quick Replies</option>
                <option value="deep_work">Deep Work</option>
                <option value="meetings">Meetings</option>
                <option value="admin">Admin</option>
                <option value="reading">Reading</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Focus Level</label>
              <select value={editForm.focus_level_required || ''} onChange={(e) => setEditForm({ ...editForm, focus_level_required: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveEdit} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">Save Changes</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default EmailPrioritizer;
