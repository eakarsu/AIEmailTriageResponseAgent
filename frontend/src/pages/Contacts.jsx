import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit, Star, Phone, Building, Mail, Search } from 'lucide-react';
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
import { getContacts, getContact, createContact, updateContact, deleteContact, bulkDeleteContacts } from '../services/api';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({ email: '', name: '', company: '', phone: '', notes: '', is_vip: false, tags: [] });
  const [tagInput, setTagInput] = useState('');

  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'company', label: 'Company' },
    { value: 'created_at', label: 'Created' },
  ];

  useEffect(() => { loadContacts(); }, [searchTerm, sortBy, limit, offset]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const params = { sort: sortBy, order: sortBy === 'created_at' ? 'desc' : 'asc', limit, offset };
      if (searchTerm) params.search = searchTerm;
      const data = await getContacts(params);
      if (data?.data) { setContacts(data.data); setTotal(data.total); }
      else { setContacts(Array.isArray(data) ? data : []); setTotal(Array.isArray(data) ? data.length : 0); }
    } catch (error) { toast.error('Failed to load contacts'); } finally { setLoading(false); }
  };

  const handleRowClick = async (contact) => {
    try { const full = await getContact(contact.id); setSelectedContact(full); setShowDetailModal(true); }
    catch (error) { toast.error('Failed to load contact'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await createContact(formData); setShowCreateModal(false); resetForm(); loadContacts(); toast.success('Contact created'); }
    catch (error) { toast.error('Failed to create contact'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try { await updateContact(selectedContact.id, formData); setShowEditModal(false); loadContacts(); toast.success('Contact updated'); }
    catch (error) { toast.error('Failed to update contact'); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Contact', message: 'Delete this contact permanently?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try { await deleteContact(id); setShowDetailModal(false); loadContacts(); toast.success('Contact deleted'); }
    catch (error) { toast.error('Failed to delete contact'); }
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({ title: 'Delete Selected', message: `Delete ${selectedIds.size} contacts?`, variant: 'danger', confirmText: 'Delete All' });
    if (!ok) return;
    try { await bulkDeleteContacts([...selectedIds]); setSelectedIds(new Set()); loadContacts(); toast.success(`${selectedIds.size} contacts deleted`); }
    catch (error) { toast.error('Failed to delete contacts'); }
  };

  const toggleSelect = (id, e) => { e.stopPropagation(); setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const toggleSelectAll = () => { selectedIds.size === contacts.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(contacts.map(c => c.id))); };

  const handleExport = () => {
    exportToCSV(contacts, [
      { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Company', key: 'company' },
      { label: 'Phone', key: 'phone' }, { label: 'VIP', accessor: c => c.is_vip ? 'Yes' : 'No' },
      { label: 'Tags', accessor: c => c.tags?.join(', ') },
    ], 'contacts');
    toast.info('Contacts exported');
  };

  const addTag = () => { if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) { setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] }); setTagInput(''); } };
  const removeTag = (tag) => { setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) }); };
  const resetForm = () => { setFormData({ email: '', name: '', company: '', phone: '', notes: '', is_vip: false, tags: [] }); setTagInput(''); };
  const openEditModal = () => { setFormData({ ...selectedContact, tags: selectedContact.tags || [] }); setShowEditModal(true); };

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={3} /></div>
      <div className="flex items-center gap-2"><input type="checkbox" checked={formData.is_vip} onChange={(e) => setFormData({ ...formData, is_vip: e.target.checked })} className="rounded" /><span className="text-sm text-gray-700">VIP Contact</span></div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex gap-2 mb-2"><input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add tag" /><button type="button" onClick={addTag} className="px-4 py-2 bg-gray-100 rounded-lg">Add</button></div>
        <div className="flex flex-wrap gap-2">{formData.tags.map(tag => <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{tag} <button type="button" onClick={() => removeTag(tag)}>&times;</button></span>)}</div>
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
        <div><h1 className="text-2xl font-bold text-gray-900">Contacts</h1><p className="text-gray-500">Manage your contacts</p></div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"><Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})</button>}
          <ExportButton onClick={handleExport} />
          <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-5 h-5" /> New Contact</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search contacts..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
        <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} />
        {contacts.length > 0 && <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedIds.size === contacts.length && contacts.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-blue-600" /> Select All</label>}
      </div>

      {loading ? <SkeletonTable rows={6} cols={4} /> : contacts.length === 0 ? (
        <EmptyState icon={Users} title={searchTerm ? 'No contacts match your search' : 'No contacts yet'} description="Add contacts to manage your email relationships." actionLabel="Add Contact" onAction={() => { resetForm(); setShowCreateModal(true); }} />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {contacts.map((contact) => (
              <div key={contact.id} onClick={() => handleRowClick(contact)} className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4">
                <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={(e) => toggleSelect(contact.id, e)} onClick={(e) => e.stopPropagation()} className="rounded border-gray-300 text-blue-600" />
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-blue-600 font-semibold">{contact.name?.charAt(0) || contact.email.charAt(0)}</span></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{contact.name || contact.email}</span>{contact.is_vip && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}</div>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                </div>
                {contact.company && <span className="text-sm text-gray-400">{contact.company}</span>}
              </div>
            ))}
          </div>
          <Pagination total={total} limit={limit} offset={offset} onPageChange={setOffset} onLimitChange={(l) => { setLimit(l); setOffset(0); }} />
        </>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Contact" size="lg">{renderForm(handleCreate, 'Create')}</Modal>
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title="Contact Details" size="lg">
        {selectedContact && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-2xl text-blue-600 font-semibold">{selectedContact.name?.charAt(0) || selectedContact.email.charAt(0)}</span></div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">{selectedContact.name || selectedContact.email}{selectedContact.is_vip && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}</h3>
                  <p className="text-gray-500">{selectedContact.company}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={openEditModal} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-5 h-5" /></button>
                <button onClick={() => handleDelete(selectedContact.id)} className="p-2 hover:bg-red-100 rounded-lg"><Trash2 className="w-5 h-5 text-red-600" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span>{selectedContact.email}</span></div>
              {selectedContact.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{selectedContact.phone}</span></div>}
              {selectedContact.company && <div className="flex items-center gap-2"><Building className="w-4 h-4 text-gray-400" /><span>{selectedContact.company}</span></div>}
            </div>
            {selectedContact.notes && <div><h4 className="font-medium text-gray-700 mb-1">Notes</h4><p className="text-gray-600">{selectedContact.notes}</p></div>}
            {selectedContact.tags?.length > 0 && <div className="flex flex-wrap gap-2">{selectedContact.tags.map(tag => <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">{tag}</span>)}</div>}
          </div>
        )}
      </Modal>
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Contact" size="lg">{renderForm(handleUpdate, 'Save')}</Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default Contacts;
