import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Trash2, Edit, Search } from 'lucide-react';
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
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory, bulkDeleteCategories } from '../services/api';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#6366F1', icon: '', keywords: [] });
  const [keywordInput, setKeywordInput] = useState('');
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6', '#F97316', '#6366F1'];
  const sortOptions = [{ value: 'name', label: 'Name' }, { value: 'email_count', label: 'Email Count' }, { value: 'created_at', label: 'Created' }];

  useEffect(() => { loadCategories(); }, [searchTerm, sortBy, limit, offset]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'email_count' ? 'desc' : 'asc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      const data = await getCategories(params);
      if (data?.data) { setCategories(data.data); setTotal(data.total); }
      else { setCategories(Array.isArray(data) ? data : []); setTotal(Array.isArray(data) ? data.length : 0); }
    } catch (error) { toast.error('Failed to load categories'); } finally { setLoading(false); }
  };

  const handleRowClick = async (cat) => { try { const f = await getCategory(cat.id); setSelectedCategory(f); setShowDetailModal(true); } catch { toast.error('Failed to load category'); } };
  const handleCreate = async (e) => { e.preventDefault(); try { await createCategory(formData); setShowCreateModal(false); resetForm(); loadCategories(); toast.success('Category created'); } catch { toast.error('Failed to create category'); } };
  const handleUpdate = async (e) => { e.preventDefault(); try { await updateCategory(selectedCategory.id, formData); setShowEditModal(false); loadCategories(); toast.success('Category updated'); } catch { toast.error('Failed to update category'); } };
  const handleDelete = async (id) => { const ok = await confirm({ title: 'Delete Category', message: 'Delete this category permanently?', variant: 'danger', confirmText: 'Delete' }); if (!ok) return; try { await deleteCategory(id); setShowDetailModal(false); loadCategories(); toast.success('Category deleted'); } catch { toast.error('Failed to delete category'); } };
  const handleBulkDelete = async () => { const ok = await confirm({ title: 'Delete Selected', message: `Delete ${selectedIds.size} categories?`, variant: 'danger', confirmText: 'Delete All' }); if (!ok) return; try { await bulkDeleteCategories([...selectedIds]); setSelectedIds(new Set()); loadCategories(); toast.success('Categories deleted'); } catch { toast.error('Failed to delete categories'); } };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { selectedIds.size === categories.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(categories.map(c => c.id))); };
  const handleExport = () => { exportToCSV(categories, [{ label: 'Name', key: 'name' }, { label: 'Description', key: 'description' }, { label: 'Keywords', accessor: c => c.keywords?.join(', ') }, { label: 'Email Count', key: 'email_count' }], 'categories'); toast.info('Categories exported'); };
  const addKeyword = () => { if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) { setFormData({ ...formData, keywords: [...formData.keywords, keywordInput.trim()] }); setKeywordInput(''); } };
  const removeKeyword = (kw) => { setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== kw) }); };
  const resetForm = () => { setFormData({ name: '', description: '', color: '#6366F1', icon: '', keywords: [] }); setKeywordInput(''); };
  const openEditModal = () => { setFormData({ ...selectedCategory, keywords: selectedCategory.keywords || [] }); setShowEditModal(true); };

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label><div className="flex gap-2 flex-wrap">{colors.map(color => <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div></div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
        <div className="flex gap-2 mb-2"><input type="text" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add keyword" /><button type="button" onClick={addKeyword} className="px-4 py-2 bg-gray-100 rounded-lg">Add</button></div>
        <div className="flex flex-wrap gap-2">{formData.keywords.map(kw => <span key={kw} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{kw} <button type="button" onClick={() => removeKeyword(kw)}>&times;</button></span>)}</div>
      </div>
      <div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{submitLabel}</button></div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Categories</h1><p className="text-gray-500">Email categorization settings</p></div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})</button>}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> New Category</button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search categories..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {categories.length > 0 && <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedIds.size === categories.length && categories.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /> Select All</label>}
      </div>
      {loading ? <SkeletonGrid count={6} /> : categories.length === 0 ? (
        <EmptyState icon={FolderOpen} title={searchTerm ? 'No categories match' : 'No categories yet'} description="Create categories for email classification." actionLabel="Create Category" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} onClick={() => handleRowClick(category)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md relative">
                <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(category.id)} onChange={(e) => toggleSelect(category.id, e)} className="rounded border-gray-300 text-blue-600" /></div>
                <div className="flex items-center gap-3 pl-7">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: category.color + '20' }}><FolderOpen className="w-5 h-5" style={{ color: category.color }} /></div>
                  <div><span className="font-medium text-gray-900">{category.name}</span><p className="text-xs text-gray-400">{category.email_count || 0} emails</p></div>
                </div>
                {category.description && <p className="text-sm text-gray-500 mt-3 pl-7">{category.description}</p>}
                {category.keywords?.length > 0 && <div className="flex flex-wrap gap-1 mt-3 pl-7">{category.keywords.slice(0, 3).map(kw => <span key={kw} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{kw}</span>)}{category.keywords.length > 3 && <span className="text-xs text-gray-400">+{category.keywords.length - 3}</span>}</div>}
              </div>
            ))}
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Category" size="lg">{renderForm(handleCreate, 'Create')}</Modal>
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Category Details" size="lg">
        {selectedCategory && (<div className="space-y-4"><div className="flex justify-between"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedCategory.color + '20' }}><FolderOpen className="w-6 h-6" style={{ color: selectedCategory.color }} /></div><div><h3 className="text-xl font-semibold text-gray-900">{selectedCategory.name}</h3><p className="text-sm text-gray-400">{selectedCategory.email_count || 0} emails</p></div></div><div className="flex gap-2"><button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5" /></button><button onClick={() => handleDelete(selectedCategory.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button></div></div>{selectedCategory.description && <p className="text-gray-600">{selectedCategory.description}</p>}{selectedCategory.keywords?.length > 0 && <div><h4 className="text-sm font-medium text-gray-700 mb-2">Keywords</h4><div className="flex flex-wrap gap-2">{selectedCategory.keywords.map(kw => <span key={kw} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">{kw}</span>)}</div></div>}</div>)}
      </Modal>
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Category" size="lg">{renderForm(handleUpdate, 'Save')}</Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Categories;
