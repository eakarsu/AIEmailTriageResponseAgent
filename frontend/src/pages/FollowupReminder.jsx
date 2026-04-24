import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Edit2, Check, Clock, AlertCircle, RefreshCw, Mail, Calendar, Pause, Search, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay, { AIListDisplay, AIKeyValue } from '../components/AIResponseDisplay';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { getFollowups, getFollowup, suggestFollowup, deleteFollowup, updateFollowup, completeFollowup, snoozeFollowup, getEmails } from '../services/api';

const FollowupReminder = () => {
  const [followups, setFollowups] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestingId, setSuggestingId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [snoozeDate, setSnoozeDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [followupsData, emailsData] = await Promise.all([
        getFollowups(),
        getEmails()
      ]);
      setFollowups(Array.isArray(followupsData) ? followupsData : []);
      setEmails(emailsData.emails || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFollowupForEmail = (emailId) => {
    return followups.find((f) => f.email_id === emailId);
  };

  const handleRowClick = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    const existing = getFollowupForEmail(email.id);
    if (existing) {
      try {
        const data = await getFollowup(existing.id);
        setSelectedFollowup(data);
      } catch (error) {
        console.error('Failed to load followup:', error);
        setSelectedFollowup(null);
      }
    } else {
      setSelectedFollowup(null);
    }
  };

  const handleSuggest = async () => {
    if (!selectedEmail) return;
    setSuggestingId(selectedEmail.id);
    setError(null);
    try {
      const result = await suggestFollowup(selectedEmail.id);
      await loadData();
      if (result.needsFollowUp === false) {
        setError('No follow-up needed for this email');
      } else {
        setSelectedFollowup(result.followup || result);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to suggest follow-up');
      setError(err.message || 'Failed to suggest follow-up');
    } finally {
      setSuggestingId(null);
    }
  };

  const handleComplete = async (id) => {
    try {
      await completeFollowup(id);
      await loadData();
      const data = await getFollowup(id);
      setSelectedFollowup(data);
    } catch (error) {
      console.error('Failed to complete:', error);
    }
  };

  const handleSnooze = async () => {
    if (!snoozeDate || !selectedFollowup) return;
    try {
      await snoozeFollowup(selectedFollowup.id, snoozeDate);
      await loadData();
      const data = await getFollowup(selectedFollowup.id);
      setSelectedFollowup(data);
      setShowSnoozeModal(false);
    } catch (error) {
      console.error('Failed to snooze:', error);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Follow-up', message: 'Delete this follow-up?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteFollowup(id);
      setSelectedFollowup(null);
      await loadData();
      toast.success('Follow-up deleted');
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  };

  const handleEdit = (followup) => {
    setEditForm({
      reminder_type: followup.reminder_type || '',
      reminder_date: followup.reminder_date ? followup.reminder_date.split('T')[0] : '',
      reason: followup.reason || '',
      priority: followup.priority || 'medium',
      suggested_action: followup.suggested_action || '',
      notes: followup.notes || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateFollowup(selectedFollowup.id, editForm);
      await loadData();
      const data = await getFollowup(selectedFollowup.id);
      setSelectedFollowup(data);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = { high: 'bg-red-100 text-red-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = { pending: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', snoozed: 'bg-purple-100 text-purple-700' };
    return colors[status] || colors.pending;
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500 rounded-xl">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Follow-up Reminder</h1>
            <p className="text-gray-500">Click an email to get AI-suggested follow-up reminders</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full font-medium">
            {followups.length} follow-ups
          </span>
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full font-medium">
            {emails.length} emails
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search emails by subject, sender..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm" />
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
              const existing = getFollowupForEmail(email.id);
              return (
                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(email)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        existing ? (existing.status === 'completed' ? 'bg-green-100' : existing.status === 'snoozed' ? 'bg-purple-100' : 'bg-orange-100') : 'bg-gray-100'
                      }`}>
                        {existing ? (
                          existing.status === 'completed' ? <Check className="w-5 h-5 text-green-600" /> :
                          existing.status === 'snoozed' ? <Pause className="w-5 h-5 text-purple-600" /> :
                          <Bell className="w-5 h-5 text-orange-600" />
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(existing.priority)}`}>{existing.priority}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(existing.status)}`}>{existing.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Detail / Suggest Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedEmail(null); setSelectedFollowup(null); }} title="Follow-up Analysis" size="lg">
        {selectedEmail && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-100">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <h3 className="font-semibold text-gray-900">{selectedEmail.subject || 'No Subject'}</h3>
              <p className="text-sm text-gray-500 mt-1">From: {selectedEmail.from_name || selectedEmail.from_email}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
            )}

            {!selectedFollowup && suggestingId !== selectedEmail.id && (
              <div className="text-center py-8">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-6">{error ? 'Try another email or re-analyze' : 'No follow-up suggested for this email yet'}</p>
                <button onClick={handleSuggest} className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                  <Bell className="w-5 h-5" />
                  Suggest Follow-up
                </button>
              </div>
            )}

            {suggestingId === selectedEmail.id && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-orange-500 animate-spin" />
                <p className="text-orange-600 font-medium">Analyzing for follow-up...</p>
              </div>
            )}

            {selectedFollowup && suggestingId !== selectedEmail.id && (
              <>
                <AIResponseDisplay aiResponse={selectedFollowup.ai_response} title="Follow-up Analysis">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <AIKeyValue label="Reminder Type" value={selectedFollowup.reminder_type} />
                      <AIKeyValue label="Reminder Date" value={formatDate(selectedFollowup.reminder_date)} />
                      <AIKeyValue label="Priority" value={selectedFollowup.priority} />
                      <AIKeyValue label="Status" value={selectedFollowup.status} />
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">Reason</span>
                      </div>
                      <p className="text-sm text-gray-600">{selectedFollowup.reason}</p>
                    </div>
                  </div>

                  {selectedFollowup.suggested_action && (
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-medium text-orange-800 mb-2">Suggested Action</h4>
                      <p className="text-sm text-orange-700">{selectedFollowup.suggested_action}</p>
                    </div>
                  )}

                  {selectedFollowup.notes && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600">{selectedFollowup.notes}</p>
                    </div>
                  )}
                </AIResponseDisplay>

                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <button onClick={() => handleDelete(selectedFollowup.id)} className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <div className="flex gap-3">
                    <button onClick={handleSuggest} className="flex items-center gap-2 px-4 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 text-sm">
                      <RefreshCw className="w-4 h-4" />
                      Re-analyze
                    </button>
                    {selectedFollowup.status === 'pending' && (
                      <>
                        <button onClick={() => { setSnoozeDate(''); setShowSnoozeModal(true); }} className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 text-sm">
                          <Pause className="w-4 h-4" />
                          Snooze
                        </button>
                        <button onClick={() => handleComplete(selectedFollowup.id)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                          <Check className="w-4 h-4" />
                          Complete
                        </button>
                      </>
                    )}
                    <button onClick={() => handleEdit(selectedFollowup)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">
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

      {/* Snooze Modal */}
      <Modal isOpen={showSnoozeModal} onClose={() => setShowSnoozeModal(false)} title="Snooze Follow-up">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Snooze Until</label>
            <input type="datetime-local" value={snoozeDate} onChange={(e) => setSnoozeDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowSnoozeModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSnooze} disabled={!snoozeDate} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              <Pause className="w-5 h-5" />
              Snooze
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Follow-up">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Type</label>
            <select value={editForm.reminder_type || ''} onChange={(e) => setEditForm({ ...editForm, reminder_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
              <option value="response_needed">Response Needed</option>
              <option value="action_pending">Action Pending</option>
              <option value="check_in">Check In</option>
              <option value="deadline">Deadline</option>
              <option value="info_request">Info Request</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Date</label>
              <input type="datetime-local" value={editForm.reminder_date || ''} onChange={(e) => setEditForm({ ...editForm, reminder_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={editForm.priority || ''} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea value={editForm.reason || ''} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveEdit} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">Save Changes</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default FollowupReminder;
