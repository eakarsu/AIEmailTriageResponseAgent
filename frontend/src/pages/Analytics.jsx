import React, { useState, useEffect } from 'react';
import { BarChart3, Mail, Send, Brain, Trash2, Edit, Plus, Search } from 'lucide-react';
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
import { getAnalytics, getAnalyticsRecord, getDashboardSummary, createAnalytics, updateAnalytics, deleteAnalytics, bulkDeleteAnalytics } from '../services/api';

const Analytics = () => {
  const [analytics, setAnalytics] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({ emails_received: 0, emails_sent: 0, emails_categorized: 0, ai_responses_generated: 0, avg_response_time: 0, top_category: '' });
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();
  const sortOptions = [{ value: 'date', label: 'Date' }, { value: 'emails_received', label: 'Received' }, { value: 'emails_sent', label: 'Sent' }, { value: 'ai_responses_generated', label: 'AI Responses' }];

  useEffect(() => { loadData(); }, [searchTerm, sortBy, limit, offset]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'date' ? 'desc' : 'desc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      const [analyticsData, summaryData] = await Promise.all([getAnalytics(params), getDashboardSummary()]);
      if (analyticsData?.data) { setAnalytics(analyticsData.data); setTotal(analyticsData.total); }
      else { setAnalytics(Array.isArray(analyticsData) ? analyticsData : []); setTotal(Array.isArray(analyticsData) ? analyticsData.length : 0); }
      setSummary(summaryData);
    } catch (error) { toast.error('Failed to load analytics'); } finally { setLoading(false); }
  };

  const handleRowClick = async (record) => { try { const f = await getAnalyticsRecord(record.id); setSelectedRecord(f); setShowDetailModal(true); } catch { toast.error('Failed to load record'); } };
  const handleCreate = async (e) => { e.preventDefault(); try { await createAnalytics(formData); setShowCreateModal(false); resetForm(); loadData(); toast.success('Record created'); } catch { toast.error('Failed to create record'); } };
  const handleUpdate = async (e) => { e.preventDefault(); try { await updateAnalytics(selectedRecord.id, formData); setShowDetailModal(false); setEditMode(false); loadData(); toast.success('Record updated'); } catch { toast.error('Failed to update record'); } };
  const handleDelete = async (id) => { const ok = await confirm({ title: 'Delete Record', message: 'Delete this analytics record?', variant: 'danger', confirmText: 'Delete' }); if (!ok) return; try { await deleteAnalytics(id); setShowDetailModal(false); loadData(); toast.success('Record deleted'); } catch { toast.error('Failed to delete record'); } };
  const handleBulkDelete = async () => { const ok = await confirm({ title: 'Delete Selected', message: `Delete ${selectedIds.size} records?`, variant: 'danger', confirmText: 'Delete All' }); if (!ok) return; try { await bulkDeleteAnalytics([...selectedIds]); setSelectedIds(new Set()); loadData(); toast.success('Records deleted'); } catch { toast.error('Failed to delete records'); } };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { selectedIds.size === analytics.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(analytics.map(a => a.id))); };
  const handleExport = () => { exportToCSV(analytics, [{ label: 'Date', accessor: r => new Date(r.date).toLocaleDateString() }, { label: 'Received', key: 'emails_received' }, { label: 'Sent', key: 'emails_sent' }, { label: 'Categorized', key: 'emails_categorized' }, { label: 'AI Responses', key: 'ai_responses_generated' }, { label: 'Top Category', key: 'top_category' }], 'analytics'); toast.info('Analytics exported'); };
  const resetForm = () => setFormData({ emails_received: 0, emails_sent: 0, emails_categorized: 0, ai_responses_generated: 0, avg_response_time: 0, top_category: '' });
  const openEditModal = () => { setFormData({ emails_received: selectedRecord.emails_received, emails_sent: selectedRecord.emails_sent, emails_categorized: selectedRecord.emails_categorized, ai_responses_generated: selectedRecord.ai_responses_generated, avg_response_time: selectedRecord.avg_response_time, top_category: selectedRecord.top_category }); setEditMode(true); };

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emails Received</label><input type="number" value={formData.emails_received} onChange={(e) => setFormData({ ...formData, emails_received: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emails Sent</label><input type="number" value={formData.emails_sent} onChange={(e) => setFormData({ ...formData, emails_sent: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Emails Categorized</label><input type="number" value={formData.emails_categorized} onChange={(e) => setFormData({ ...formData, emails_categorized: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">AI Responses</label><input type="number" value={formData.ai_responses_generated} onChange={(e) => setFormData({ ...formData, ai_responses_generated: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Top Category</label><input type="text" value={formData.top_category} onChange={(e) => setFormData({ ...formData, top_category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowCreateModal(false); setEditMode(false); setShowDetailModal(false); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{submitLabel}</button></div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Analytics</h1><p className="text-gray-500">Email statistics and insights</p></div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})</button>}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> Add Record</button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Emails</p><p className="text-2xl font-bold text-gray-900">{summary.totalEmails || 0}</p></div><div className="p-3 bg-blue-100 rounded-lg"><Mail className="w-6 h-6 text-blue-600" /></div></div></div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Unread</p><p className="text-2xl font-bold text-gray-900">{summary.unreadEmails || 0}</p></div><div className="p-3 bg-red-100 rounded-lg"><Mail className="w-6 h-6 text-red-600" /></div></div></div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">AI Drafts</p><p className="text-2xl font-bold text-gray-900">{summary.aiGeneratedDrafts || 0}</p></div><div className="p-3 bg-green-100 rounded-lg"><Brain className="w-6 h-6 text-green-600" /></div></div></div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Drafts</p><p className="text-2xl font-bold text-gray-900">{summary.totalDrafts || 0}</p></div><div className="p-3 bg-purple-100 rounded-lg"><Send className="w-6 h-6 text-purple-600" /></div></div></div>
        </div>
      )}

      {/* Category Distribution */}
      {summary?.byCategory?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Emails by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {summary.byCategory.map((item) => (
              <div key={item.category} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-500">{item.category || 'Uncategorized'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search analytics..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {analytics.length > 0 && <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedIds.size === analytics.length && analytics.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /> Select All</label>}
      </div>

      {loading ? <SkeletonTable rows={6} cols={7} /> : analytics.length === 0 ? (
        <EmptyState icon={BarChart3} title={searchTerm ? 'No records match' : 'No analytics data yet'} description="Add analytics records to track email statistics." actionLabel="Add Record" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedIds.size === analytics.length && analytics.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorized</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Responses</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Top Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.map((record) => (
                    <tr key={record.id} onClick={() => handleRowClick(record)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(record.id)} onChange={(e) => toggleSelect(record.id, e)} className="rounded border-gray-300 text-blue-600" /></td>
                      <td className="px-4 py-4 text-sm text-gray-900">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{record.emails_received}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{record.emails_sent}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{record.emails_categorized}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{record.ai_responses_generated}</td>
                      <td className="px-4 py-4 text-sm"><span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">{record.top_category}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Analytics Record" size="lg">{renderForm(handleCreate, 'Create')}</Modal>
      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setEditMode(false); }} title="Analytics Record Details" size="lg">
        {selectedRecord && !editMode && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold">{new Date(selectedRecord.date).toLocaleDateString()}</h3>
              <div className="flex gap-2"><button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5" /></button><button onClick={() => handleDelete(selectedRecord.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div><p className="text-sm text-gray-500">Received</p><p className="text-lg font-semibold">{selectedRecord.emails_received}</p></div>
              <div><p className="text-sm text-gray-500">Sent</p><p className="text-lg font-semibold">{selectedRecord.emails_sent}</p></div>
              <div><p className="text-sm text-gray-500">Categorized</p><p className="text-lg font-semibold">{selectedRecord.emails_categorized}</p></div>
              <div><p className="text-sm text-gray-500">AI Responses</p><p className="text-lg font-semibold">{selectedRecord.ai_responses_generated}</p></div>
              <div><p className="text-sm text-gray-500">Avg Response Time</p><p className="text-lg font-semibold">{selectedRecord.avg_response_time} min</p></div>
              <div><p className="text-sm text-gray-500">Top Category</p><p className="text-lg font-semibold">{selectedRecord.top_category}</p></div>
            </div>
          </div>
        )}
        {selectedRecord && editMode && renderForm(handleUpdate, 'Save')}
      </Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Analytics;
