import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Check, RefreshCw, Mail, Star, Target, Search, Inbox } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay, { ScoreBadge, AIListDisplay, AIKeyValue } from '../components/AIResponseDisplay';
import { useToast } from '../context/ToastContext';
import useConfirm from '../hooks/useConfirm';
import { getTemplateSuggestions, getTemplateSuggestion, suggestTemplate, deleteTemplateSuggestion, useTemplateSuggestion, getEmails, getTemplates } from '../services/api';

const TemplateSuggester = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [emails, setEmails] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestingId, setSuggestingId] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const toast = useToast();
  const { isOpen, options, confirm, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [suggestionsData, emailsData, templatesData] = await Promise.all([
        getTemplateSuggestions(),
        getEmails(),
        getTemplates()
      ]);
      setSuggestions(Array.isArray(suggestionsData) ? suggestionsData : []);
      setEmails(emailsData.emails || []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestionForEmail = (emailId) => {
    return suggestions.find((s) => s.email_id === emailId);
  };

  const handleRowClick = async (email) => {
    setSelectedEmail(email);
    setShowModal(true);
    const existing = getSuggestionForEmail(email.id);
    if (existing) {
      try {
        const data = await getTemplateSuggestion(existing.id);
        setSelectedSuggestion(data);
      } catch (error) {
        console.error('Failed to load suggestion:', error);
        setSelectedSuggestion(null);
      }
    } else {
      setSelectedSuggestion(null);
    }
  };

  const handleSuggest = async () => {
    if (!selectedEmail) return;
    setSuggestingId(selectedEmail.id);
    setError(null);
    try {
      const result = await suggestTemplate(selectedEmail.id);
      await loadData();
      if (!result.suggestion) {
        setError(result.message || 'No suitable template found for this email');
      } else {
        setSelectedSuggestion(result.suggestion);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to suggest template');
      setError(err.message || 'Failed to suggest template');
    } finally {
      setSuggestingId(null);
    }
  };

  const handleUse = async (id) => {
    try {
      await useTemplateSuggestion(id);
      await loadData();
      const data = await getTemplateSuggestion(id);
      setSelectedSuggestion(data);
    } catch (error) {
      console.error('Failed to mark as used:', error);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Delete Suggestion', message: 'Delete this suggestion?', variant: 'danger', confirmText: 'Delete' });
    if (!ok) return;
    try {
      await deleteTemplateSuggestion(id);
      setSelectedSuggestion(null);
      await loadData();
      toast.success('Suggestion deleted');
    } catch (error) {
      toast.error('Failed to delete suggestion');
    }
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
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-500 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Template Suggester</h1>
            <p className="text-gray-500">Click an email to get AI-powered template recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full font-medium">
            {suggestions.length} suggestions
          </span>
          <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-full font-medium">
            {templates.length} templates
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total Suggestions</p>
          <p className="text-2xl font-bold text-gray-900">{suggestions.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Templates Used</p>
          <p className="text-2xl font-bold text-green-600">{suggestions.filter(s => s.was_used).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Available Templates</p>
          <p className="text-2xl font-bold text-teal-600">{templates.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search emails by subject, sender..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
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
              const existing = getSuggestionForEmail(email.id);
              return (
                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleRowClick(email)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${existing ? (existing.was_used ? 'bg-green-100' : 'bg-teal-100') : 'bg-gray-100'}`}>
                        {existing ? (
                          existing.was_used ? <Check className="w-5 h-5 text-green-600" /> : <FileText className="w-5 h-5 text-teal-600" />
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
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-sm font-medium">{existing.match_score || 0}%</span>
                        </div>
                        {existing.was_used && <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Used</span>}
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
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedEmail(null); setSelectedSuggestion(null); }} title="Template Suggestion" size="lg">
        {selectedEmail && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-100">
              <div className="flex items-center gap-2 text-teal-600 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <h3 className="font-semibold text-gray-900">{selectedEmail.subject || 'No Subject'}</h3>
              <p className="text-sm text-gray-500 mt-1">From: {selectedEmail.from_name || selectedEmail.from_email}</p>
            </div>

            {templates.length === 0 && !selectedSuggestion && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">No templates available. Create some templates first to get suggestions.</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">{error}</div>
            )}

            {!selectedSuggestion && suggestingId !== selectedEmail.id && templates.length > 0 && (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-6">{error ? 'Try another email or re-analyze' : 'No template suggested for this email yet'}</p>
                <button onClick={handleSuggest} className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium">
                  <FileText className="w-5 h-5" />
                  Find Template
                </button>
              </div>
            )}

            {suggestingId === selectedEmail.id && (
              <div className="text-center py-8">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 text-teal-500 animate-spin" />
                <p className="text-teal-600 font-medium">Finding best template...</p>
              </div>
            )}

            {selectedSuggestion && suggestingId !== selectedEmail.id && (
              <>
                <AIResponseDisplay aiResponse={selectedSuggestion.ai_response} title="Template Match Analysis">
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <ScoreBadge score={selectedSuggestion.match_score || 0} label="Match Score" />
                    <div className="text-center col-span-2">
                      <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                        <h4 className="font-semibold text-teal-800">{selectedSuggestion.suggested_template_name || selectedSuggestion.template_name}</h4>
                        <p className="text-sm text-teal-600 mt-1">Recommended Template</p>
                      </div>
                    </div>
                  </div>

                  {selectedSuggestion.template_subject && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100 mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Template Preview</h4>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm font-medium text-gray-900 mb-2">Subject: {selectedSuggestion.template_subject}</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedSuggestion.template_body}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <AIListDisplay items={selectedSuggestion.match_reasons} title="Why This Template" icon={Target} emptyText="No match reasons" />
                    <AIListDisplay items={selectedSuggestion.customization_suggestions} title="Customization Tips" icon={FileText} emptyText="No customization tips" />
                  </div>

                  {selectedSuggestion.alternative_templates && (
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Alternative Templates</h4>
                      <div className="space-y-2">
                        {(typeof selectedSuggestion.alternative_templates === 'string' ? JSON.parse(selectedSuggestion.alternative_templates) : selectedSuggestion.alternative_templates).map((alt, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{alt.name}</span>
                            <span className="text-sm font-medium text-teal-600">{alt.score}% match</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AIResponseDisplay>

                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <button onClick={() => handleDelete(selectedSuggestion.id)} className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 text-sm">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <div className="flex gap-3">
                    <button onClick={handleSuggest} className="flex items-center gap-2 px-4 py-2 border border-teal-200 text-teal-600 rounded-lg hover:bg-teal-50 text-sm">
                      <RefreshCw className="w-4 h-4" />
                      Re-analyze
                    </button>
                    {!selectedSuggestion.was_used && (
                      <button onClick={() => handleUse(selectedSuggestion.id)} className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm">
                        <Check className="w-4 h-4" />
                        Use This Template
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog isOpen={isOpen} onConfirm={handleConfirm} onCancel={handleCancel} {...options} />
    </div>
  );
};

export default TemplateSuggester;
