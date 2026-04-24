import React, { useState, useEffect } from 'react';
import { Layout, Plus, Trash2, Edit, Copy, Search } from 'lucide-react';
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
import { getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, bulkDeleteTemplates } from '../services/api';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('usage_count');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();

  const [formData, setFormData] = useState({ name: '', subject: '', body: '', category: '', tags: [] });
  const [tagInput, setTagInput] = useState('');
  const categories = ['General', 'Support', 'Sales', 'Finance', 'HR', 'Technical', 'Partnership'];

  const sortOptions = [
    { value: 'usage_count', label: 'Most Used' },
    { value: 'name', label: 'Name' },
    { value: 'created_at', label: 'Created' },
  ];

  useEffect(() => { loadTemplates(); }, [searchTerm, categoryFilter, sortBy, limit, offset]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'name' ? 'asc' : 'desc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      const data = await getTemplates(params);
      if (data && data.data) {
        setTemplates(data.data);
        setTotal(data.total);
      } else {
        setTemplates(Array.isArray(data) ? data : []);
        setTotal(Array.isArray(data) ? data.length : 0);
      }
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (template) => {
    try {
      const full = await getTemplate(template.id);
      setSelectedTemplate(full);
      setShowDetailModal(true);
    } catch (error) {
      toast.error('Failed to load template details');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createTemplate(formData);
      setShowCreateModal(false);
      resetForm();
      loadTemplates();
      toast.success('Template created successfully');
    } catch (error) {
      toast.error('Failed to create template');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateTemplate(selectedTemplate.id, formData);
      setShowEditModal(false);
      loadTemplates();
      toast.success('Template updated successfully');
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Template', message: 'Are you sure you want to delete this template? This cannot be undone.', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteTemplate(id);
      setShowDetailModal(false);
      setSelectedTemplate(null);
      loadTemplates();
      toast.success('Template deleted');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({ title: 'Delete Selected Templates', message: `Delete ${selectedIds.size} selected templates? This cannot be undone.`, variant: 'danger', confirmText: 'Delete All' });
    if (!ok) return;
    try {
      await bulkDeleteTemplates([...selectedIds]);
      setSelectedIds(new Set());
      loadTemplates();
      toast.success(`${selectedIds.size} templates deleted`);
    } catch (error) {
      toast.error('Failed to delete templates');
    }
  };

  const handleCopy = (template) => {
    navigator.clipboard.writeText(template.body);
    toast.success('Template copied to clipboard');
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === templates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(templates.map(t => t.id)));
    }
  };

  const handleExport = () => {
    exportToCSV(templates, [
      { label: 'Name', key: 'name' },
      { label: 'Subject', key: 'subject' },
      { label: 'Category', key: 'category' },
      { label: 'Tags', accessor: t => t.tags?.join(', ') },
      { label: 'Usage', key: 'usage_count' },
    ], 'templates');
    toast.info('Templates exported');
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const resetForm = () => {
    setFormData({ name: '', subject: '', body: '', category: '', tags: [] });
    setTagInput('');
  };

  const openEditModal = () => {
    setFormData({
      name: selectedTemplate.name,
      subject: selectedTemplate.subject,
      body: selectedTemplate.body,
      category: selectedTemplate.category,
      tags: selectedTemplate.tags || []
    });
    setShowEditModal(true);
  };

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
          <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Select category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
        <textarea value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={8} placeholder='Use [Name], [Date], etc. for placeholders' required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex gap-2 mb-2">
          <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Add a tag" />
          <button type="button" onClick={addTag} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">&times;</button>
            </span>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{submitLabel}</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500">Reusable email templates</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
            </button>
          )}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" /> New Template
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search templates..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setOffset(0); }} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
          <option value="">All Categories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {templates.length > 0 && (
          <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={selectedIds.size === templates.length && templates.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" />
            Select All
          </label>
        )}
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : templates.length === 0 ? (
        <EmptyState icon={Layout} title={searchTerm || categoryFilter ? 'No templates match your search' : 'No templates yet'} description="Create reusable email templates to save time." actionLabel="Create Template" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} onClick={() => handleRowClick(template)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all relative">
                <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(template.id)} onChange={(e) => toggleSelect(template.id, e)} className="rounded border-gray-300 text-blue-600" />
                </div>
                <div className="flex items-start justify-between mb-2 pl-7">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  {template.category && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">{template.category}</span>}
                </div>
                <p className="text-sm text-gray-500 mb-2 pl-7">{template.subject}</p>
                <p className="text-sm text-gray-400 truncate pl-7">{template.body?.substring(0, 80)}...</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {template.tags?.slice(0, 2).map(tag => <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{tag}</span>)}
                  </div>
                  <span className="text-xs text-gray-400">Used {template.usage_count}x</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Template" size="lg">
        {renderForm(handleCreate, 'Create Template')}
      </Modal>

      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Template Details" size="lg">
        {selectedTemplate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedTemplate.category && <span className="px-2 py-1 text-sm bg-purple-100 text-purple-800 rounded-full">{selectedTemplate.category}</span>}
                <span className="text-sm text-gray-500">Used {selectedTemplate.usage_count} times</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleCopy(selectedTemplate)} className="p-2 hover:bg-gray-100 rounded-lg"><Copy className="w-5 h-5 text-gray-600" /></button>
                <button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5 text-gray-600" /></button>
                <button onClick={() => handleDelete(selectedTemplate.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h3>
              {selectedTemplate.subject && <p className="text-sm text-gray-500 mt-1">Subject: {selectedTemplate.subject}</p>}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{selectedTemplate.body}</pre>
            </div>
            {selectedTemplate.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map(tag => <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">{tag}</span>)}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Template" size="lg">
        {renderForm(handleUpdate, 'Save Changes')}
      </Modal>

      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Templates;
