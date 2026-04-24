import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit, Send, RefreshCw, Brain, Search } from 'lucide-react';
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
import { getDrafts, getDraft, createDraft, updateDraft, deleteDraft, regenerateDraft, sendDraft, getEmails, bulkDeleteDrafts } from '../services/api';

const Drafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [regeneratingTone, setRegeneratingTone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({ email_id: '', subject: '', body: '', tone: 'professional' });
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();
  const tones = ['professional', 'friendly', 'casual', 'formal', 'empathetic'];
  const sortOptions = [{ value: 'created_at', label: 'Newest' }, { value: 'status', label: 'Status' }, { value: 'tone', label: 'Tone' }];
  const statusColors = { draft: 'bg-yellow-100 text-yellow-800', sent: 'bg-green-100 text-green-800' };

  useEffect(() => { loadDrafts(); }, [searchTerm, statusFilter, sortBy, limit, offset]);
  useEffect(() => { loadEmails(); }, []);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'created_at' ? 'desc' : 'asc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      const data = await getDrafts(params);
      if (data?.data) { setDrafts(data.data); setTotal(data.total); }
      else { setDrafts(Array.isArray(data) ? data : []); setTotal(Array.isArray(data) ? data.length : 0); }
    } catch (error) { toast.error('Failed to load drafts'); } finally { setLoading(false); }
  };

  const loadEmails = async () => { try { const data = await getEmails({ limit: 100 }); setEmails(data.emails || []); } catch { } };

  const handleRowClick = async (draft) => { try { const f = await getDraft(draft.id); setSelectedDraft(f); setShowDetailModal(true); } catch { toast.error('Failed to load draft'); } };
  const handleCreate = async (e) => { e.preventDefault(); try { await createDraft(formData); setShowCreateModal(false); resetForm(); loadDrafts(); toast.success('Draft created'); } catch { toast.error('Failed to create draft'); } };
  const handleUpdate = async (e) => { e.preventDefault(); try { await updateDraft(selectedDraft.id, formData); setShowEditModal(false); loadDrafts(); toast.success('Draft updated'); } catch { toast.error('Failed to update draft'); } };
  const handleDelete = async (id) => { const ok = await confirm({ title: 'Delete Draft', message: 'Delete this draft permanently?', variant: 'danger', confirmText: 'Delete' }); if (!ok) return; try { await deleteDraft(id); setShowDetailModal(false); loadDrafts(); toast.success('Draft deleted'); } catch { toast.error('Failed to delete draft'); } };
  const handleBulkDelete = async () => { const ok = await confirm({ title: 'Delete Selected', message: `Delete ${selectedIds.size} drafts?`, variant: 'danger', confirmText: 'Delete All' }); if (!ok) return; try { await bulkDeleteDrafts([...selectedIds]); setSelectedIds(new Set()); loadDrafts(); toast.success('Drafts deleted'); } catch { toast.error('Failed to delete drafts'); } };

  const handleRegenerate = async (tone) => {
    setRegeneratingTone(tone);
    try {
      const updated = await regenerateDraft(selectedDraft.id, tone);
      setSelectedDraft(updated);
      loadDrafts();
      toast.success(`Draft regenerated with ${tone} tone`);
    } catch { toast.error('Failed to regenerate draft'); } finally { setRegeneratingTone(null); }
  };

  const handleSend = async (id) => {
    const ok = await confirm({ title: 'Send Draft', message: 'Are you sure you want to send this draft?', variant: 'warning', confirmText: 'Send' });
    if (!ok) return;
    try { await sendDraft(id); setShowDetailModal(false); loadDrafts(); toast.success('Draft sent'); } catch { toast.error('Failed to send draft'); }
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { selectedIds.size === drafts.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(drafts.map(d => d.id))); };
  const handleExport = () => { exportToCSV(drafts, [{ label: 'Subject', key: 'subject' }, { label: 'Tone', key: 'tone' }, { label: 'Status', key: 'status' }, { label: 'AI Generated', accessor: d => d.ai_generated ? 'Yes' : 'No' }, { label: 'Created', accessor: d => new Date(d.created_at).toLocaleDateString() }], 'drafts'); toast.info('Drafts exported'); };
  const resetForm = () => setFormData({ email_id: '', subject: '', body: '', tone: 'professional' });
  const openEditModal = () => { setFormData({ email_id: selectedDraft.email_id, subject: selectedDraft.subject, body: selectedDraft.body, tone: selectedDraft.tone }); setShowEditModal(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Draft Responses</h1><p className="text-gray-500">AI-generated and manual draft responses</p></div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})</button>}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> New Draft</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search drafts..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="px-4 py-2 border border-gray-300 rounded-lg"><option value="">All Status</option><option value="draft">Draft</option><option value="sent">Sent</option></select>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {drafts.length > 0 && <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedIds.size === drafts.length && drafts.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /> Select All</label>}
      </div>

      {loading ? <SkeletonTable rows={6} cols={4} /> : drafts.length === 0 ? (
        <EmptyState icon={FileText} title={searchTerm || statusFilter ? 'No drafts match' : 'No drafts yet'} description="Create draft responses or generate them with AI." actionLabel="New Draft" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {drafts.map((draft) => (
              <div key={draft.id} onClick={() => handleRowClick(draft)} className="p-4 hover:bg-gray-50 cursor-pointer flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(draft.id)} onChange={(e) => toggleSelect(draft.id, e)} onClick={(e) => e.stopPropagation()} className="mt-1 rounded border-gray-300 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{draft.subject}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[draft.status]}`}>{draft.status}</span>
                    {draft.ai_generated && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full flex items-center gap-1"><Brain className="w-3 h-3" /> AI</span>}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{draft.body.substring(0, 100)}...</p>
                  {draft.original_subject && <p className="text-xs text-gray-400 mt-1">Reply to: {draft.original_subject}</p>}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(draft.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Draft" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Reply to Email (Optional)</label><select value={formData.email_id} onChange={(e) => setFormData({ ...formData, email_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="">Select an email</option>{emails.map(email => <option key={email.id} value={email.id}>{email.subject}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tone</label><select value={formData.tone} onChange={(e) => setFormData({ ...formData, tone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{tones.map(tone => <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Body</label><textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={8} required /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Draft</button></div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Draft Details" size="xl">
        {selectedDraft && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-sm rounded-full ${statusColors[selectedDraft.status]}`}>{selectedDraft.status}</span>
                <span className="px-2 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">{selectedDraft.tone}</span>
                {selectedDraft.ai_generated && <span className="px-2 py-1 text-sm bg-purple-100 text-purple-800 rounded-full flex items-center gap-1"><Brain className="w-4 h-4" /> AI Generated</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5 text-gray-600" /></button>
                <button onClick={() => handleDelete(selectedDraft.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button>
              </div>
            </div>
            {selectedDraft.original_subject && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Reply to: <span className="text-gray-900">{selectedDraft.original_subject}</span></p>
                <p className="text-sm text-gray-500">From: <span className="text-gray-900">{selectedDraft.from_name} ({selectedDraft.from_email})</span></p>
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedDraft.subject}</h3>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{selectedDraft.body}</div>
            </div>
            {selectedDraft.ai_generated && selectedDraft.status === 'draft' && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Regenerate with Different Tone</h4>
                <div className="flex flex-wrap gap-2">
                  {tones.map(tone => (
                    <button key={tone} onClick={() => handleRegenerate(tone)} disabled={regeneratingTone !== null} className={`flex items-center gap-2 px-3 py-2 rounded-lg disabled:opacity-50 ${selectedDraft.tone === tone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      <RefreshCw className={`w-4 h-4 ${regeneratingTone === tone ? 'animate-spin' : ''}`} />
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedDraft.status === 'draft' && (
              <div className="flex justify-end gap-3 border-t pt-4">
                <button onClick={() => handleSend(selectedDraft.id)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Send className="w-5 h-5" /> Send</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Draft" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Tone</label><select value={formData.tone} onChange={(e) => setFormData({ ...formData, tone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{tones.map(tone => <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Body</label><textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={8} required /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button></div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Drafts;
