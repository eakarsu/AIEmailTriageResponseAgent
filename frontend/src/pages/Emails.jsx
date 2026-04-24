import React, { useState, useEffect } from 'react';
import {
  Mail, Plus, Search, Star, Trash2, Edit, Brain,
  Tag, ArrowUp, RefreshCw, Send, MessageSquare,
  CheckSquare, FileText, Hash
} from 'lucide-react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortSelect from '../components/SortSelect';
import ExportButton from '../components/ExportButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonTable } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { exportToCSV } from '../utils/export';
import {
  getEmails, getEmail, createEmail, updateEmail, deleteEmail, bulkDeleteEmails,
  categorizeEmail, prioritizeEmail, generateDraft,
  analyzeEmailSentiment, extractEmailActions, summarizeEmail, getLabels
} from '../services/api';

const Emails = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('received_at');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [aiLoading, setAiLoading] = useState({});
  const [labels, setLabels] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [actionItems, setActionItems] = useState(null);
  const [summary, setSummary] = useState(null);
  const [formData, setFormData] = useState({ from_email: '', from_name: '', to_email: 'demo@example.com', subject: '', body: '', labels: [] });
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();
  const sortOptions = [{ value: 'received_at', label: 'Newest' }, { value: 'priority', label: 'Priority' }, { value: 'from_email', label: 'From' }];
  const categories = ['Sales', 'Support', 'Marketing', 'HR', 'Finance', 'Technical', 'General', 'Urgent', 'Partnership'];
  const priorityColors = { 1: 'bg-red-100 text-red-800', 2: 'bg-orange-100 text-orange-800', 3: 'bg-yellow-100 text-yellow-800', 4: 'bg-green-100 text-green-800', 5: 'bg-gray-100 text-gray-800' };
  const priorityLabels = { 1: 'Critical', 2: 'High', 3: 'Normal', 4: 'Low', 5: 'Very Low' };

  useEffect(() => { loadEmails(); }, [searchTerm, categoryFilter, statusFilter, sortBy, limit, offset]);
  useEffect(() => { loadLabels(); }, []);

  const loadLabels = async () => { try { const data = await getLabels(); setLabels(Array.isArray(data) ? data : data?.data || []); } catch { } };

  const loadEmails = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'received_at' ? 'desc' : 'asc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await getEmails(params);
      setEmails(data.emails || []);
      setTotal(data.total || 0);
    } catch (error) { toast.error('Failed to load emails'); } finally { setLoading(false); }
  };

  const handleRowClick = async (email) => {
    try {
      clearAiResults();
      const fullEmail = await getEmail(email.id);
      setSelectedEmail(fullEmail);
      if (fullEmail.sentiment) setSentiment({ sentiment: fullEmail.sentiment, confidence: fullEmail.sentiment_confidence, tone: fullEmail.sentiment_tone });
      if (fullEmail.action_items) setActionItems(typeof fullEmail.action_items === 'string' ? JSON.parse(fullEmail.action_items) : fullEmail.action_items);
      if (fullEmail.summary) setSummary(fullEmail.summary);
      setShowDetailModal(true);
      if (fullEmail.status === 'unread') { await updateEmail(email.id, { status: 'read' }); loadEmails(); }
    } catch { toast.error('Failed to load email'); }
  };

  const handleCreate = async (e) => { e.preventDefault(); try { await createEmail(formData); setShowCreateModal(false); resetForm(); loadEmails(); toast.success('Email created'); } catch { toast.error('Failed to create email'); } };
  const handleUpdate = async (e) => { e.preventDefault(); try { await updateEmail(selectedEmail.id, formData); setShowEditModal(false); loadEmails(); toast.success('Email updated'); } catch { toast.error('Failed to update email'); } };
  const handleDelete = async (id) => { const ok = await confirm({ title: 'Delete Email', message: 'Delete this email permanently?', variant: 'danger', confirmText: 'Delete' }); if (!ok) return; try { await deleteEmail(id); setShowDetailModal(false); loadEmails(); toast.success('Email deleted'); } catch { toast.error('Failed to delete email'); } };
  const handleBulkDelete = async () => { const ok = await confirm({ title: 'Delete Selected', message: `Delete ${selectedIds.size} emails?`, variant: 'danger', confirmText: 'Delete All' }); if (!ok) return; try { await bulkDeleteEmails([...selectedIds]); setSelectedIds(new Set()); loadEmails(); toast.success('Emails deleted'); } catch { toast.error('Failed to delete emails'); } };

  const handleStar = async (email, e) => { e.stopPropagation(); try { await updateEmail(email.id, { is_starred: !email.is_starred }); loadEmails(); } catch { toast.error('Failed to star email'); } };

  const handleAICategorize = async (id) => {
    setAiLoading(prev => ({ ...prev, [`cat-${id}`]: true }));
    try {
      const result = await categorizeEmail(id);
      loadEmails();
      if (selectedEmail?.id === id) { const updated = await getEmail(id); setSelectedEmail(updated); }
      toast.success(`Email categorized as "${result.category}"`);
    } catch { toast.error('Failed to categorize email'); } finally { setAiLoading(prev => ({ ...prev, [`cat-${id}`]: false })); }
  };

  const handleAIPrioritize = async (id) => {
    setAiLoading(prev => ({ ...prev, [`pri-${id}`]: true }));
    try {
      const result = await prioritizeEmail(id);
      loadEmails();
      if (selectedEmail?.id === id) { const updated = await getEmail(id); setSelectedEmail(updated); }
      toast.success(`Priority set to "${priorityLabels[result.priority]}"`);
    } catch { toast.error('Failed to prioritize email'); } finally { setAiLoading(prev => ({ ...prev, [`pri-${id}`]: false })); }
  };

  const handleGenerateDraft = async (id) => {
    setAiLoading(prev => ({ ...prev, [`draft-${id}`]: true }));
    try { await generateDraft(id, 'professional'); toast.success('Draft response generated! Check the Drafts page.'); } catch { toast.error('Failed to generate draft'); } finally { setAiLoading(prev => ({ ...prev, [`draft-${id}`]: false })); }
  };

  const handleSentiment = async (id) => {
    setAiLoading(prev => ({ ...prev, [`sent-${id}`]: true }));
    setSentiment(null);
    try { const result = await analyzeEmailSentiment(id); setSentiment(result); toast.success(`Sentiment: ${result.sentiment} (${result.confidence}% confidence)`); } catch { toast.error('Failed to analyze sentiment'); } finally { setAiLoading(prev => ({ ...prev, [`sent-${id}`]: false })); }
  };

  const handleExtractActions = async (id) => {
    setAiLoading(prev => ({ ...prev, [`act-${id}`]: true }));
    setActionItems(null);
    try { const result = await extractEmailActions(id); setActionItems(result); toast.success(`Found ${result.actionItems?.length || 0} action items`); } catch { toast.error('Failed to extract actions'); } finally { setAiLoading(prev => ({ ...prev, [`act-${id}`]: false })); }
  };

  const handleSummarize = async (id) => {
    setAiLoading(prev => ({ ...prev, [`sum-${id}`]: true }));
    setSummary(null);
    try { const result = await summarizeEmail(id); setSummary(result.summary); toast.success('Email summarized'); } catch { toast.error('Failed to summarize'); } finally { setAiLoading(prev => ({ ...prev, [`sum-${id}`]: false })); }
  };

  const handleLabelToggle = async (labelName) => {
    const currentLabels = selectedEmail.labels || [];
    const newLabels = currentLabels.includes(labelName) ? currentLabels.filter(l => l !== labelName) : [...currentLabels, labelName];
    try { await updateEmail(selectedEmail.id, { labels: newLabels }); const updated = await getEmail(selectedEmail.id); setSelectedEmail(updated); loadEmails(); } catch { toast.error('Failed to update labels'); }
  };

  const clearAiResults = () => { setSentiment(null); setActionItems(null); setSummary(null); };
  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { selectedIds.size === emails.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(emails.map(e => e.id))); };
  const handleExport = () => { exportToCSV(emails, [{ label: 'From', key: 'from_email' }, { label: 'Subject', key: 'subject' }, { label: 'Category', key: 'category' }, { label: 'Priority', accessor: e => priorityLabels[e.priority] }, { label: 'Status', key: 'status' }, { label: 'Date', accessor: e => new Date(e.received_at).toLocaleDateString() }], 'emails'); toast.info('Emails exported'); };
  const resetForm = () => setFormData({ from_email: '', from_name: '', to_email: 'demo@example.com', subject: '', body: '', labels: [] });
  const openEditModal = () => { setFormData({ from_email: selectedEmail.from_email, from_name: selectedEmail.from_name, to_email: selectedEmail.to_email, subject: selectedEmail.subject, body: selectedEmail.body, labels: selectedEmail.labels || [] }); setShowEditModal(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Inbox</h1><p className="text-gray-500">Manage your emails with AI assistance</p></div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})</button>}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> New Email</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search emails..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setOffset(0); }} className="px-4 py-2 border border-gray-300 rounded-lg"><option value="">All Categories</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="px-4 py-2 border border-gray-300 rounded-lg"><option value="">All Status</option><option value="unread">Unread</option><option value="read">Read</option><option value="replied">Replied</option></select>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {emails.length > 0 && <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedIds.size === emails.length && emails.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /> Select All</label>}
      </div>

      {loading ? <SkeletonTable rows={8} cols={5} /> : emails.length === 0 ? (
        <EmptyState icon={Mail} title={searchTerm || categoryFilter || statusFilter ? 'No emails match' : 'No emails yet'} description="Create or receive emails to get started." actionLabel="New Email" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {emails.map((email) => (
              <div key={email.id} onClick={() => handleRowClick(email)} className={`p-4 hover:bg-gray-50 cursor-pointer ${email.status === 'unread' ? 'bg-blue-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selectedIds.has(email.id)} onChange={(e) => toggleSelect(email.id, e)} onClick={(e) => e.stopPropagation()} className="mt-1 rounded border-gray-300 text-blue-600" />
                  <button onClick={(e) => handleStar(email, e)} className="mt-1"><Star className={`w-5 h-5 ${email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} /></button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${email.status === 'unread' ? 'text-gray-900' : 'text-gray-600'}`}>{email.from_name || email.from_email}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[email.priority]}`}>{priorityLabels[email.priority]}</span>
                      {email.category && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">{email.category}</span>}
                      {email.labels?.slice(0, 2).map(labelName => { const label = labels.find(l => l.name === labelName); return <span key={labelName} className="px-2 py-0.5 text-xs rounded-full text-white" style={{ backgroundColor: label?.color || '#6b7280' }}>{labelName}</span>; })}
                      {email.labels?.length > 2 && <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">+{email.labels.length - 2}</span>}
                    </div>
                    <p className={`text-sm ${email.status === 'unread' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{email.subject}</p>
                    <p className="text-sm text-gray-500 truncate mt-1">{email.body.substring(0, 100)}...</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(email.received_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}

      {/* Create Email Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Email" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">From Email</label><input type="email" value={formData.from_email} onChange={(e) => setFormData({ ...formData, from_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">From Name</label><input type="text" value={formData.from_name} onChange={(e) => setFormData({ ...formData, from_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Body</label><textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={6} required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Labels</label>
            <div className="flex flex-wrap gap-2">
              {labels.map(label => { const isActive = formData.labels.includes(label.name); return <button key={label.id} type="button" onClick={() => { const newLabels = isActive ? formData.labels.filter(l => l !== label.name) : [...formData.labels, label.name]; setFormData({ ...formData, labels: newLabels }); }} className={`px-3 py-1 text-sm rounded-full ${isActive ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} style={isActive ? { backgroundColor: label.color } : {}}>{label.name}</button>; })}
              {labels.length === 0 && <span className="text-sm text-gray-500">No labels available</span>}
            </div>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Email</button></div>
        </form>
      </Modal>

      {/* Email Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); clearAiResults(); }} title="Email Details" size="xl">
        {selectedEmail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 text-sm rounded-full ${priorityColors[selectedEmail.priority]}`}>{priorityLabels[selectedEmail.priority]}</span>
                {selectedEmail.category && <span className="px-2 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">{selectedEmail.category}</span>}
                <span className={`px-2 py-1 text-sm rounded-full ${selectedEmail.status === 'unread' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{selectedEmail.status}</span>
                {selectedEmail.labels?.map(labelName => { const label = labels.find(l => l.name === labelName); return <span key={labelName} className="px-2 py-1 text-sm rounded-full text-white" style={{ backgroundColor: label?.color || '#6b7280' }}>{labelName}</span>; })}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5 text-gray-600" /></button>
                <button onClick={() => handleDelete(selectedEmail.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">From:</span><span className="ml-2 text-gray-900">{selectedEmail.from_name} ({selectedEmail.from_email})</span></div>
                <div><span className="text-gray-500">To:</span><span className="ml-2 text-gray-900">{selectedEmail.to_email}</span></div>
                <div><span className="text-gray-500">Date:</span><span className="ml-2 text-gray-900">{new Date(selectedEmail.received_at).toLocaleString()}</span></div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedEmail.subject}</h3>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">{selectedEmail.body}</div>
            </div>

            {selectedEmail.priority_reason && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800"><strong>Priority Reason:</strong> {selectedEmail.priority_reason}</p>
              </div>
            )}

            {/* Labels */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><Hash className="w-4 h-4" /> Labels</h4>
              <div className="flex flex-wrap gap-2">
                {labels.map(label => { const isActive = (selectedEmail.labels || []).includes(label.name); return <button key={label.id} onClick={() => handleLabelToggle(label.name)} className={`px-3 py-1 text-sm rounded-full ${isActive ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} style={isActive ? { backgroundColor: label.color } : {}}>{label.name}</button>; })}
                {labels.length === 0 && <span className="text-sm text-gray-500">No labels available. Create labels in the Labels page.</span>}
              </div>
            </div>

            {/* AI Actions */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">AI Actions</h4>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleAICategorize(selectedEmail.id)} disabled={aiLoading[`cat-${selectedEmail.id}`]} className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50">
                  {aiLoading[`cat-${selectedEmail.id}`] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />} Re-categorize
                </button>
                <button onClick={() => handleAIPrioritize(selectedEmail.id)} disabled={aiLoading[`pri-${selectedEmail.id}`]} className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50">
                  {aiLoading[`pri-${selectedEmail.id}`] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />} Re-prioritize
                </button>
                <button onClick={() => handleGenerateDraft(selectedEmail.id)} disabled={aiLoading[`draft-${selectedEmail.id}`]} className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50">
                  {aiLoading[`draft-${selectedEmail.id}`] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Generate Draft
                </button>
                <button onClick={() => handleSentiment(selectedEmail.id)} disabled={aiLoading[`sent-${selectedEmail.id}`]} className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50">
                  {aiLoading[`sent-${selectedEmail.id}`] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} Analyze Sentiment
                </button>
                <button onClick={() => handleExtractActions(selectedEmail.id)} disabled={aiLoading[`act-${selectedEmail.id}`]} className="flex items-center gap-2 px-3 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 disabled:opacity-50">
                  {aiLoading[`act-${selectedEmail.id}`] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />} Extract Actions
                </button>
                <button onClick={() => handleSummarize(selectedEmail.id)} disabled={aiLoading[`sum-${selectedEmail.id}`]} className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50">
                  {aiLoading[`sum-${selectedEmail.id}`] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Summarize
                </button>
              </div>
            </div>

            {/* AI Results */}
            {(sentiment || actionItems || summary) && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-700">AI Analysis Results</h4>
                {sentiment && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Sentiment Analysis</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div><span className="text-blue-600">Sentiment:</span><span className={`ml-2 px-2 py-0.5 rounded-full text-white ${sentiment.sentiment === 'positive' ? 'bg-green-500' : sentiment.sentiment === 'negative' ? 'bg-red-500' : 'bg-gray-500'}`}>{sentiment.sentiment}</span></div>
                      <div><span className="text-blue-600">Confidence:</span><span className="ml-2 text-blue-800">{sentiment.confidence}%</span></div>
                      <div><span className="text-blue-600">Tone:</span><span className="ml-2 text-blue-800">{sentiment.tone}</span></div>
                    </div>
                  </div>
                )}
                {actionItems && (
                  <div className="bg-teal-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-teal-800 mb-2 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Action Items {actionItems.hasUrgentAction && <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">Urgent</span>}</h5>
                    {actionItems.actionItems?.length > 0 ? (
                      <ul className="space-y-1 text-sm text-teal-800">{actionItems.actionItems.map((item, idx) => <li key={idx} className="flex items-start gap-2"><span className="text-teal-500">•</span>{item}</li>)}</ul>
                    ) : <p className="text-sm text-teal-700">No action items found.</p>}
                    {actionItems.deadlines?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-teal-200"><span className="text-sm font-medium text-teal-700">Deadlines:</span><ul className="text-sm text-teal-800 mt-1">{actionItems.deadlines.map((deadline, idx) => <li key={idx}>• {deadline}</li>)}</ul></div>
                    )}
                  </div>
                )}
                {summary && (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-indigo-800 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Summary</h5>
                    <p className="text-sm text-indigo-800">{summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Email" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Body</label><textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={6} required /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button></div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Emails;
