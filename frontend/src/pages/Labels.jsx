import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit, Search } from 'lucide-react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortSelect from '../components/SortSelect';
import ExportButton from '../components/ExportButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { exportToCSV } from '../utils/export';
import { getLabels, getLabel, createLabel, updateLabel, deleteLabel, bulkDeleteLabels } from '../services/api';

const Labels = () => {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6', description: '' });
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6', '#F97316', '#6366F1'];
  const sortOptions = [{ value: 'name', label: 'Name' }, { value: 'email_count', label: 'Email Count' }, { value: 'created_at', label: 'Created' }];

  useEffect(() => { loadLabels(); }, [searchTerm, sortBy, limit, offset]);

  const loadLabels = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'email_count' ? 'desc' : 'asc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      const data = await getLabels(params);
      if (data?.data) { setLabels(data.data); setTotal(data.total); }
      else { setLabels(Array.isArray(data) ? data : []); setTotal(Array.isArray(data) ? data.length : 0); }
    } catch (error) { toast.error('Failed to load labels'); } finally { setLoading(false); }
  };

  const handleRowClick = async (label) => { try { const f = await getLabel(label.id); setSelectedLabel(f); setShowDetailModal(true); } catch { toast.error('Failed to load label'); } };
  const handleCreate = async (e) => { e.preventDefault(); try { await createLabel(formData); setShowCreateModal(false); resetForm(); loadLabels(); toast.success('Label created'); } catch { toast.error('Failed to create label'); } };
  const handleUpdate = async (e) => { e.preventDefault(); try { await updateLabel(selectedLabel.id, formData); setShowEditModal(false); loadLabels(); toast.success('Label updated'); } catch { toast.error('Failed to update label'); } };
  const handleDelete = async (id) => { const ok = await confirm({ title: 'Delete Label', message: 'Delete this label permanently?', variant: 'danger', confirmText: 'Delete' }); if (!ok) return; try { await deleteLabel(id); setShowDetailModal(false); loadLabels(); toast.success('Label deleted'); } catch { toast.error('Failed to delete label'); } };
  const handleBulkDelete = async () => { const ok = await confirm({ title: 'Delete Selected', message: `Delete ${selectedIds.size} labels?`, variant: 'danger', confirmText: 'Delete All' }); if (!ok) return; try { await bulkDeleteLabels([...selectedIds]); setSelectedIds(new Set()); loadLabels(); toast.success('Labels deleted'); } catch { toast.error('Failed to delete labels'); } };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { selectedIds.size === labels.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(labels.map(l => l.id))); };
  const handleExport = () => { exportToCSV(labels, [{ label: 'Name', key: 'name' }, { label: 'Color', key: 'color' }, { label: 'Description', key: 'description' }, { label: 'Email Count', key: 'email_count' }], 'labels'); toast.info('Labels exported'); };
  const resetForm = () => setFormData({ name: '', color: '#3B82F6', description: '' });
  const openEditModal = () => { setFormData({ name: selectedLabel.name, color: selectedLabel.color, description: selectedLabel.description }); setShowEditModal(true); };

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label><div className="flex gap-2 flex-wrap">{colors.map(color => <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} /></div>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{submitLabel}</button></div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Labels</h1><p className="text-gray-500">Organize emails with labels</p></div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})</button>}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> New Label</button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search labels..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {labels.length > 0 && <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedIds.size === labels.length && labels.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /> Select All</label>}
      </div>
      {loading ? <SkeletonGrid count={6} /> : labels.length === 0 ? (
        <EmptyState icon={Tag} title={searchTerm ? 'No labels match' : 'No labels yet'} description="Create labels to organize your emails." actionLabel="Create Label" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labels.map((label) => (
              <div key={label.id} onClick={() => handleRowClick(label)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md relative">
                <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(label.id)} onChange={(e) => toggleSelect(label.id, e)} className="rounded border-gray-300 text-blue-600" /></div>
                <div className="flex items-center gap-3 pl-7"><div className="w-4 h-4 rounded-full" style={{ backgroundColor: label.color }}></div><span className="font-medium text-gray-900">{label.name}</span></div>
                {label.description && <p className="text-sm text-gray-500 mt-2 pl-7">{label.description}</p>}
                <p className="text-xs text-gray-400 mt-2 pl-7">{label.email_count || 0} emails</p>
              </div>
            ))}
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Label">{renderForm(handleCreate, 'Create')}</Modal>
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Label Details">
        {selectedLabel && (<div className="space-y-4"><div className="flex justify-between"><div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full" style={{ backgroundColor: selectedLabel.color }}></div><h3 className="text-xl font-semibold text-gray-900">{selectedLabel.name}</h3></div><div className="flex gap-2"><button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5" /></button><button onClick={() => handleDelete(selectedLabel.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button></div></div>{selectedLabel.description && <p className="text-gray-600">{selectedLabel.description}</p>}<p className="text-sm text-gray-400">{selectedLabel.email_count || 0} emails with this label</p></div>)}
      </Modal>
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Label">{renderForm(handleUpdate, 'Save')}</Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Labels;
