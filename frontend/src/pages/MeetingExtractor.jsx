import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Edit2, RefreshCw, Mail, Clock, MapPin, Users, CheckSquare, Link, Search, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay, { AIListDisplay, AIKeyValue } from '../components/AIResponseDisplay';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { getMeetings, getMeeting, extractMeeting, deleteMeeting, updateMeeting, getEmails } from '../services/api';

const MeetingExtractor = () => {
  const [meetings, setMeetings] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extractingId, setExtractingId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
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
      const [meetingsData, emailsData] = await Promise.all([
        getMeetings({ page: 1, limit: 100 }),
        getEmails()
      ]);
      setMeetings(Array.isArray(meetingsData) ? meetingsData : (meetingsData?.data || []));
      setEmails(emailsData.emails || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMeetingForEmail = (emailId) => {
    return meetings.find((m) => m.email_id === emailId);
  };

  const handleRowClick = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    const existing = getMeetingForEmail(email.id);
    if (existing) {
      try {
        const data = await getMeeting(existing.id);
        setSelectedMeeting(data);
      } catch (error) {
        console.error('Failed to load meeting:', error);
        setSelectedMeeting(null);
      }
    } else {
      setSelectedMeeting(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedEmail) return;
    setExtractingId(selectedEmail.id);
    setError(null);
    try {
      const result = await extractMeeting(selectedEmail.id);
      await loadData();
      if (result.hasMeeting === false) {
        setError('No meeting details found in this email');
      } else {
        setSelectedMeeting(result.meeting || result);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to extract meeting');
      setError(err.message || 'Failed to extract meeting');
    } finally {
      setExtractingId(null);
    }
  };

  const handleEdit = (meeting) => {
    setEditForm({
      title: meeting.title || '',
      description: meeting.description || '',
      date: meeting.date || '',
      time: meeting.time || '',
      duration_minutes: meeting.duration_minutes || 60,
      location: meeting.location || '',
      meeting_type: meeting.meeting_type || 'video_call',
      is_confirmed: meeting.is_confirmed || false
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateMeeting(selectedMeeting.id, editForm);
      await loadData();
      const data = await getMeeting(selectedMeeting.id);
      setSelectedMeeting(data);
      setShowEditModal(false);
      toast.success('Meeting updated');
    } catch (error) {
      toast.error('Failed to update meeting');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Meeting', message: 'Delete this meeting?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteMeeting(id);
      setSelectedMeeting(null);
      await loadData();
      toast.success('Meeting deleted');
    } catch (error) {
      toast.error('Failed to delete meeting');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMeetingTypeIcon = (type) => {
    const icons = { video_call: '📹', phone_call: '📞', in_person: '🏢', hybrid: '🔄' };
    return icons[type] || '📅';
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
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500 rounded-xl">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Meeting Extractor</h1>
            <p className="text-gray-500">Click an email to extract meeting details with AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
            {meetings.length} extracted
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
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
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
              const existing = getMeetingForEmail(email.id);
              return (
                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(email)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${existing ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {existing ? (
                          <span className="text-lg">{getMeetingTypeIcon(existing.meeting_type)}</span>
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${existing.is_confirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {existing.is_confirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Detail / Extract Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedEmail(null); setSelectedMeeting(null); }} title="Meeting Extraction" size="lg">
        {selectedEmail && (
          <div className="space-y-6">
            {/* Email Info */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
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

            {/* Not yet extracted */}
            {!selectedMeeting && extractingId !== selectedEmail.id && (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-6">{error ? 'Try another email or re-extract' : 'No meeting extracted from this email yet'}</p>
                <button onClick={handleExtract} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                  <Calendar className="w-5 h-5" />
                  Extract Meeting
                </button>
              </div>
            )}

            {/* Extracting */}
            {extractingId === selectedEmail.id && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                <p className="text-blue-600 font-medium">Extracting meeting details...</p>
              </div>
            )}

            {/* Results */}
            {selectedMeeting && extractingId !== selectedEmail.id && (
              <>
                <AIResponseDisplay aiResponse={selectedMeeting.ai_response} title="Extracted Meeting">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <h4 className="font-semibold text-gray-900 mb-3">{selectedMeeting.title || 'Untitled Meeting'}</h4>
                      {selectedMeeting.description && <p className="text-sm text-gray-600 mb-4">{selectedMeeting.description}</p>}
                      <AIKeyValue label="Date" value={formatDate(selectedMeeting.date)} />
                      <AIKeyValue label="Time" value={selectedMeeting.time || 'Not set'} />
                      <AIKeyValue label="Duration" value={selectedMeeting.duration_minutes ? `${selectedMeeting.duration_minutes} minutes` : 'Not set'} />
                      <AIKeyValue label="Location" value={selectedMeeting.location || 'Not set'} />
                      <AIKeyValue label="Type" value={selectedMeeting.meeting_type} />
                      <AIKeyValue label="Confirmed" value={selectedMeeting.is_confirmed} />
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <AIListDisplay items={selectedMeeting.attendees} title="Attendees" icon={Users} emptyText="No attendees" />
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <AIListDisplay items={selectedMeeting.agenda} title="Agenda" icon={CheckSquare} emptyText="No agenda" />
                      </div>
                    </div>
                  </div>

                  {selectedMeeting.calendar_link && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Link className="w-4 h-4" />
                        <a href={selectedMeeting.calendar_link} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">{selectedMeeting.calendar_link}</a>
                      </div>
                    </div>
                  )}

                  <AIListDisplay items={selectedMeeting.action_items} title="Action Items" icon={CheckSquare} emptyText="No action items" />
                </AIResponseDisplay>

                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <button onClick={() => handleDelete(selectedMeeting.id)} className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <div className="flex gap-3">
                    <button onClick={handleExtract} className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm">
                      <RefreshCw className="w-4 h-4" />
                      Re-extract
                    </button>
                    <button onClick={() => handleEdit(selectedMeeting)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
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
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Meeting">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={editForm.date || ''} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input type="time" value={editForm.time || ''} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" value={editForm.duration_minutes || ''} onChange={(e) => setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={editForm.meeting_type || ''} onChange={(e) => setEditForm({ ...editForm, meeting_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="video_call">Video Call</option>
                <option value="phone_call">Phone Call</option>
                <option value="in_person">In Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={editForm.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_confirmed" checked={editForm.is_confirmed || false} onChange={(e) => setEditForm({ ...editForm, is_confirmed: e.target.checked })} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
            <label htmlFor="is_confirmed" className="text-sm text-gray-700">Meeting Confirmed</label>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save Changes</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default MeetingExtractor;
