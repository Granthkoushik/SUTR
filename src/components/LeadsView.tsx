import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lead, LeadStatus, Priority } from '../types';
import { formatIndianCurrency, formatDateIndian } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { 
  Search, 
  Phone, 
  MessageCircle, 
  UserCheck, 
  Clock, 
  Plus, 
  Archive, 
  ArchiveRestore, 
  Trash2, 
  Edit3, 
  FileText, 
  History,
  X,
  ChevronRight
} from 'lucide-react';
import { ApiClient } from '../api/client';

export const LeadsView: React.FC = () => {
  const { 
    leads, 
    language, 
    t, 
    updateLead, 
    archiveLead, 
    deleteLead, 
    setIsAddLeadModalOpen, 
    setFollowUpModalLead, 
    setConvertModalLead, 
    setCallModalLead,
    session,
    showToast
  } = useApp();

  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Detail & Interaction Drawer
  const [activeDetailLead, setActiveDetailLead] = useState<Lead | null>(null);
  const [interactionHistory, setInteractionHistory] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Lead>>({});

  const stageTabs: { id: string; label: string }[] = [
    { id: 'all', label: t.leads.all },
    { id: 'New', label: t.leads.new },
    { id: 'Contacted', label: t.leads.contacted },
    { id: 'Interested', label: t.leads.interested },
    { id: 'Follow-up', label: t.leads.followup },
    { id: 'Converted', label: t.leads.converted },
    { id: 'Lost', label: t.leads.lost },
  ];

  const filteredLeads = leads.filter(lead => {
    if (showArchived) {
      if (!lead.isArchived) return false;
    } else {
      if (lead.isArchived) return false;
    }

    const matchesStage = selectedStage === 'all' || lead.status === selectedStage;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchFilter.toLowerCase()) ||
      lead.requirement.toLowerCase().includes(searchFilter.toLowerCase()) ||
      lead.source.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesStage && matchesPriority && matchesSearch;
  });

  const handleOpenDetail = async (lead: Lead) => {
    setActiveDetailLead(lead);
    setIsEditing(false);
    setEditFormData(lead);
    if (session) {
      try {
        const history = await ApiClient.getInteractions(session.user.businessId, session.token, lead.id);
        setInteractionHistory(history);
      } catch {
        setInteractionHistory([]);
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeDetailLead || !session) return;
    try {
      const added = await ApiClient.addInteraction(session.user.businessId, session.token, {
        entityType: 'lead',
        entityId: activeDetailLead.id,
        interactionType: 'note',
        summary: newNote.trim(),
      });
      setInteractionHistory(prev => [added, ...prev]);
      setNewNote('');
      showToast(language === 'hi' ? 'टिप्पणी जोड़ी गई' : 'Note added to interaction log');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDetailLead) return;
    try {
      const updated = await updateLead(activeDetailLead.id, editFormData);
      setActiveDetailLead(updated);
      setIsEditing(false);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const greeting = language === 'hi'
      ? `नमस्ते ${name} जी, लीडफ्लो से संपर्क करने हेतु धन्यवाद। क्या हम आपकी आवश्यकता पर चर्चा कर सकते हैं?`
      : `Hello ${name}, thank you for contacting us. Can we discuss your requirement?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
              {language === 'hi' ? 'व्यापारिक पूछताछ' : 'Business Pipeline'}
            </span>
            <span className="text-xs text-[#64748B]">·</span>
            <span className="text-xs font-semibold text-[#0F172A] tabular-nums">
              {filteredLeads.length} {language === 'hi' ? 'लीड्स' : 'Leads'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
            {t.leads.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            {t.leads.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              showArchived ? 'bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1]' : 'border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? (language === 'hi' ? 'सक्रिय लीड्स' : 'Active Leads') : t.leads.archived}</span>
          </button>

          <button
            onClick={() => setIsAddLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.addLead}</span>
          </button>
        </div>
      </div>

      {/* Pipeline Status Filter Tabs */}
      <div className="bg-white p-1.5 rounded-lg border border-[#E2E8F0] shadow-xs flex items-center gap-1 overflow-x-auto">
        {stageTabs.map((tab) => {
          const isActive = selectedStage === tab.id;
          const count = tab.id === 'all' 
            ? leads.filter(l => !l.isArchived).length
            : leads.filter(l => l.status === tab.id && !l.isArchived).length;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStage(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#1E3A8A] text-white shadow-xs'
                  : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E2E8F0]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.actions.search}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-[#E2E8F0] rounded-lg bg-white text-[#334155] outline-hidden focus:border-[#1D4ED8]"
          >
            <option value="all">{language === 'hi' ? 'सभी प्राथमिकता' : 'All Priority'}</option>
            <option value="High">{language === 'hi' ? 'उच्च (High)' : 'High Priority'}</option>
            <option value="Medium">{language === 'hi' ? 'मध्यम (Medium)' : 'Medium Priority'}</option>
            <option value="Low">{language === 'hi' ? 'सामान्य (Low)' : 'Low Priority'}</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            <p className="font-semibold text-sm text-[#0F172A] mb-1">
              {language === 'hi' ? 'कोई लीड नहीं मिला' : 'No leads found matching criteria'}
            </p>
            <p>{language === 'hi' ? 'खोज या फ़िल्टर बदलें अथवा नया लीड जोड़ें।' : 'Try adjusting filters or create a new lead.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] font-bold">
                  <th className="py-3 px-4">{t.leads.name}</th>
                  <th className="py-3 px-4">{t.leads.requirement}</th>
                  <th className="py-3 px-4">{t.leads.status}</th>
                  <th className="py-3 px-4">{t.leads.source}</th>
                  <th className="py-3 px-4 text-right">{t.leads.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                    {/* Name & Contact */}
                    <td className="py-3.5 px-4 align-top">
                      <div>
                        <button
                          onClick={() => handleOpenDetail(lead)}
                          className="font-bold text-[#0F172A] hover:text-[#1D4ED8] text-left text-sm"
                        >
                          {lead.name}
                        </button>
                        <div className="text-xs text-[#64748B] font-mono mt-0.5">
                          {lead.phone}
                        </div>
                        {lead.email && (
                          <div className="text-[11px] text-[#64748B] mt-0.5 truncate max-w-xs">
                            {lead.email}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Requirement & Budget */}
                    <td className="py-3.5 px-4 align-top max-w-xs">
                      <p className="font-medium text-[#0F172A] line-clamp-2">
                        {lead.requirement}
                      </p>
                      {lead.budget > 0 && (
                        <div className="text-xs font-bold text-[#1E3A8A] tabular-nums mt-1">
                          {formatIndianCurrency(lead.budget)}
                        </div>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="space-y-1">
                        <select
                          value={lead.status}
                          onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                          className="px-2 py-1 text-xs font-semibold rounded border border-[#E2E8F0] bg-white text-[#0F172A] outline-hidden cursor-pointer"
                        >
                          <option value="New">{t.leads.new}</option>
                          <option value="Contacted">{t.leads.contacted}</option>
                          <option value="Interested">{t.leads.interested}</option>
                          <option value="Follow-up">{t.leads.followup}</option>
                          <option value="Converted">{t.leads.converted}</option>
                          <option value="Lost">{t.leads.lost}</option>
                        </select>
                        <div>
                          <StatusBadge status={lead.status} />
                        </div>
                      </div>
                    </td>

                    {/* Source & Date */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="font-semibold text-[#475569]">
                        {lead.source}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        {formatDateIndian(lead.createdAt)}
                      </div>
                    </td>

                    {/* Quick Action Buttons */}
                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setCallModalLead(lead)}
                          className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]"
                          title="Call"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#1E3A8A]" />
                        </button>

                        <button
                          onClick={() => handleWhatsApp(lead.phone, lead.name)}
                          className="p-1.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setFollowUpModalLead(lead)}
                          className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#6D28D9]"
                          title="Schedule Follow-up"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        {lead.status !== 'Converted' && (
                          <button
                            onClick={() => setConvertModalLead(lead)}
                            className="p-1.5 px-2 rounded-lg bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center gap-1 shadow-2xs"
                            title="Convert to Customer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">{language === 'hi' ? 'ग्राहक बनाएं' : 'Convert'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenDetail(lead)}
                          className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#475569]"
                          title="View History & Notes"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => archiveLead(lead.id, !lead.isArchived)}
                          className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
                          title={lead.isArchived ? 'Unarchive' : 'Archive'}
                        >
                          {lead.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lead Detail & Interaction History Drawer */}
      {activeDetailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-5">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <span className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
                  {language === 'hi' ? 'लीड विवरण एवं बातचीत इतिहास' : 'Lead Details & Interaction History'}
                </span>
                <h2 className="text-xl font-bold text-[#0F172A] mt-0.5">
                  {activeDetailLead.name}
                </h2>
              </div>
              <button
                onClick={() => setActiveDetailLead(null)}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCallModalLead(activeDetailLead)}
                className="flex-1 py-2 px-3 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] font-semibold text-xs text-[#0F172A] flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>{t.actions.callNow}</span>
              </button>
              <button
                onClick={() => handleWhatsApp(activeDetailLead.phone, activeDetailLead.name)}
                className="flex-1 py-2 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] font-semibold text-xs text-white flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => setFollowUpModalLead(activeDetailLead)}
                className="flex-1 py-2 px-3 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] hover:bg-[#EDE9FE] font-semibold text-xs text-[#6D28D9] flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>{t.actions.scheduleFollowUp}</span>
              </button>
            </div>

            {/* Edit / View Form */}
            <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569]">
                  {language === 'hi' ? 'बुनियादी जानकारी' : 'Basic Contact Details'}
                </span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isEditing ? t.actions.cancel : t.actions.edit}</span>
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#334155] mb-1">Name</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#334155] mb-1">Phone</label>
                      <input
                        type="text"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#334155] mb-1">Budget (₹)</label>
                      <input
                        type="number"
                        value={editFormData.budget || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, budget: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#334155] mb-1">Requirement</label>
                    <textarea
                      rows={2}
                      value={editFormData.requirement || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, requirement: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-[#1E3A8A] text-white rounded font-semibold hover:bg-[#1D4ED8]"
                  >
                    {t.actions.save}
                  </button>
                </form>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Mobile:</span>
                    <span className="font-mono font-bold text-[#0F172A]">{activeDetailLead.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Requirement:</span>
                    <span className="font-semibold text-[#0F172A] text-right max-w-xs">{activeDetailLead.requirement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Source:</span>
                    <span className="font-medium text-[#0F172A]">{activeDetailLead.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Budget:</span>
                    <span className="font-bold text-[#0D9488] tabular-nums">{formatIndianCurrency(activeDetailLead.budget)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Add New Interaction Note */}
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                {t.leads.addNote}
              </label>
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder={language === 'hi' ? 'ग्राहक से क्या बात हुई लिखें...' : 'Type call outcome, quotation update, or notes...'}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E3A8A] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8]"
                >
                  {language === 'hi' ? 'जोड़ें' : 'Add'}
                </button>
              </form>
            </div>

            {/* Interaction History Feed */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#1E3A8A]" />
                <span>{t.leads.interactionHistory}</span>
              </h3>

              {interactionHistory.length === 0 ? (
                <p className="text-xs text-[#64748B] py-3 text-center">No interactions recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {interactionHistory.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs">
                      <div className="flex items-center justify-between font-bold text-[#0F172A]">
                        <span className="uppercase text-[10px] text-[#1E3A8A] bg-[#EFF6FF] px-1.5 py-0.5 rounded">
                          {item.interactionType}
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          {new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[#334155] mt-1 font-medium">{item.summary}</p>
                      {item.details && <p className="text-[#64748B] text-[11px] mt-0.5 italic">{item.details}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
