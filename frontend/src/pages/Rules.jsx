import React, { useState, useEffect } from 'react';
import { Filter, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Search } from 'lucide-react';
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
import { getRules, getRule, createRule, updateRule, deleteRule, toggleRule, bulkDeleteRules } from '../services/api';

const Rules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [sortBy, setSortBy] = useState('priority');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({ name: '', description: '', condition_field: 'subject', condition_operator: 'contains', condition_value: '', action_type: 'categorize', action_value: '', priority: 1 });
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();
  const conditionFields = ['subject', 'body', 'from_email', 'to_email'];
  const conditionOperators = ['contains', 'equals', 'starts_with', 'ends_with'];
  const actionTypes = ['categorize', 'label', 'star', 'priority', 'archive'];
  const sortOptions = [{ value: 'priority', label: 'Priority' }, { value: 'name', label: 'Name' }, { value: 'times_applied', label: 'Applied' }, { value: 'created_at', label: 'Created' }];

  useEffect(() => { loadRules(); }, [searchTerm, activeFilter, sortBy, limit, offset]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'times_applied' ? 'desc' : 'asc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      if (activeFilter) params.is_active = activeFilter;
      const data = await getRules(params);
      if (data?.data) { setRules(data.data); setTotal(data.total); }
      else { setRules(Array.isArray(data) ? data : []); setTotal(Array.isArray(data) ? data.length : 0); }
    } catch (error) { toast.error('Failed to load rules'); } finally { setLoading(false); }
  };

  const handleRowClick = async (rule) => { try { const f = await getRule(rule.id); setSelectedRule(f); setShowDetailModal(true); } catch { toast.error('Failed to load rule'); } };
  const handleCreate = async (e) => { e.preventDefault(); try { await createRule(formData); setShowCreateModal(false); resetForm(); loadRules(); toast.success('Rule created'); } catch { toast.error('Failed to create rule'); } };
  const handleUpdate = async (e) => { e.preventDefault(); try { await updateRule(selectedRule.id, formData); setShowEditModal(false); loadRules(); toast.success('Rule updated'); } catch { toast.error('Failed to update rule'); } };
  const handleDelete = async (id) => { const ok = await confirm({ title: 'Delete Rule', message: 'Delete this rule permanently?', variant: 'danger', confirmText: 'Delete' }); if (!ok) return; try { await deleteRule(id); setShowDetailModal(false); loadRules(); toast.success('Rule deleted'); } catch { toast.error('Failed to delete rule'); } };
  const handleBulkDelete = async () => { const ok = await confirm({ title: 'Delete Selected', message: `Delete ${selectedIds.size} rules?`, variant: 'danger', confirmText: 'Delete All' }); if (!ok) return; try { await bulkDeleteRules([...selectedIds]); setSelectedIds(new Set()); loadRules(); toast.success('Rules deleted'); } catch { toast.error('Failed to delete rules'); } };
  const handleToggle = async (id, e) => { e.stopPropagation(); try { await toggleRule(id); loadRules(); toast.success('Rule toggled'); } catch { toast.error('Failed to toggle rule'); } };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { selectedIds.size === rules.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(rules.map(r => r.id))); };
  const handleExport = () => { exportToCSV(rules, [{ label: 'Name', key: 'name' }, { label: 'Condition', accessor: r => `${r.condition_field} ${r.condition_operator} ${r.condition_value}` }, { label: 'Action', accessor: r => `${r.action_type}: ${r.action_value}` }, { label: 'Priority', key: 'priority' }, { label: 'Active', accessor: r => r.is_active ? 'Yes' : 'No' }], 'rules'); toast.info('Rules exported'); };
  const resetForm = () => setFormData({ name: '', description: '', condition_field: 'subject', condition_operator: 'contains', condition_value: '', action_type: 'categorize', action_value: '', priority: 1 });
  const openEditModal = () => { setFormData({ ...selectedRule }); setShowEditModal(true); };

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">If Field</label><select value={formData.condition_field} onChange={(e) => setFormData({ ...formData, condition_field: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{conditionFields.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Operator</label><select value={formData.condition_operator} onChange={(e) => setFormData({ ...formData, condition_operator: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{conditionOperators.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Value</label><input type="text" value={formData.condition_value} onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Then Action</label><select value={formData.action_type} onChange={(e) => setFormData({ ...formData, action_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">{actionTypes.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Action Value</label><input type="text" value={formData.action_value} onChange={(e) => setFormData({ ...formData, action_value: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
      </div>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{submitLabel}</button></div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Rules</h1><p className="text-gray-500">Automate email processing</p></div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})</button>}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> New Rule</button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search rules..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
        <select value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setOffset(0); }} className="px-4 py-2 border border-gray-300 rounded-lg"><option value="">All Status</option><option value="true">Active</option><option value="false">Inactive</option></select>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {rules.length > 0 && <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedIds.size === rules.length && rules.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /> Select All</label>}
      </div>
      {loading ? <SkeletonTable rows={6} cols={4} /> : rules.length === 0 ? (
        <EmptyState icon={Filter} title={searchTerm || activeFilter ? 'No rules match' : 'No rules yet'} description="Create automation rules for email processing." actionLabel="Create Rule" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {rules.map((rule) => (
              <div key={rule.id} onClick={() => handleRowClick(rule)} className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.has(rule.id)} onChange={(e) => toggleSelect(rule.id, e)} onClick={(e) => e.stopPropagation()} className="rounded border-gray-300 text-blue-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{rule.name}</span><span className={`px-2 py-0.5 text-xs rounded-full ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{rule.is_active ? 'Active' : 'Inactive'}</span></div>
                  <p className="text-sm text-gray-500 mt-1">If {rule.condition_field} {rule.condition_operator} "{rule.condition_value}" → {rule.action_type}: {rule.action_value}</p>
                </div>
                <button onClick={(e) => handleToggle(rule.id, e)} className="p-2 hover:bg-gray-100 rounded-lg">{rule.is_active ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}</button>
              </div>
            ))}
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Rule" size="lg">{renderForm(handleCreate, 'Create')}</Modal>
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Rule Details" size="lg">
        {selectedRule && (<div className="space-y-4"><div className="flex justify-between"><div><h3 className="text-xl font-semibold text-gray-900">{selectedRule.name}</h3><span className={`px-2 py-0.5 text-xs rounded-full ${selectedRule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{selectedRule.is_active ? 'Active' : 'Inactive'}</span></div><div className="flex gap-2"><button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5" /></button><button onClick={() => handleDelete(selectedRule.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button></div></div>{selectedRule.description && <p className="text-gray-600">{selectedRule.description}</p>}<div className="bg-gray-50 rounded-lg p-4"><p className="text-sm"><strong>Condition:</strong> If {selectedRule.condition_field} {selectedRule.condition_operator} "{selectedRule.condition_value}"</p><p className="text-sm mt-2"><strong>Action:</strong> {selectedRule.action_type}: {selectedRule.action_value}</p></div><p className="text-sm text-gray-400">Applied {selectedRule.times_applied || 0} times</p></div>)}
      </Modal>
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Rule" size="lg">{renderForm(handleUpdate, 'Save')}</Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Rules;
