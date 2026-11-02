import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FollowUp } from '../types';
import { formatDateIndian } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { 
  CalendarClock, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Phone, 
  MessageCircle, 
  Plus, 
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';

export const FollowUpsView: React.FC = () => {
  const { 
    followUps, 
    language, 
    t, 
    completeFollowUp, 
    rescheduleFollowUp, 
    setFollowUpModalLead,
    setCallModalLead,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');
  const [completeModalItem, setCompleteModalItem] = useState<FollowUp | null>(null);
  const [completionNote, setCompletionNote] = useState('');
  const [rescheduleModalItem, setRescheduleModalItem] = useState<FollowUp | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00 AM');

  const todayStr = new Date().toISOString().split('T')[0];

  const todayList = followUps.filter(f => f.dueDate === todayStr && f.status === 'pending');
  const overdueList = followUps.filter(f => f.dueDate < todayStr && f.status === 'pending');
  const upcomingList = followUps.filter(f => f.dueDate > todayStr && f.status === 'pending');
  const completedList = followUps.filter(f => f.status === 'completed');

  const currentList = 
    activeTab === 'today' ? todayList :
    activeTab === 'overdue' ? overdueList :
    activeTab === 'upcoming' ? upcomingList : completedList;

  const handleConfirmComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalItem) return;
    await completeFollowUp(completeModalItem.id, completionNote);
    setCompleteModalItem(null);
    setCompletionNote('');
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalItem || !newDate) return;
    await rescheduleFollowUp(rescheduleModalItem.id, newDate, newTime);
    setRescheduleModalItem(null);
  };

  const handleWhatsApp = (phone: string, name: string, title: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const greeting = language === 'hi' 
      ? `नमस्ते ${name} जी, लीडफ्लो से संपर्क कर रहे हैं। "${title}" के संदर्भ में क्या हम बात कर सकते हैं?`
      : `Hello ${name}, following up regarding "${title}". Can we speak?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
              {language === 'hi' ? 'दैनिक ग्राहक तगादा' : 'Customer Cadence'}
            </span>
            <span className="text-xs text-[#64748B]">·</span>
            <span className="text-xs font-semibold text-[#0F172A] tabular-nums">
              {todayList.length} {language === 'hi' ? 'आज देय' : 'Due Today'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
            {t.followups.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            {t.followups.subtitle}
          </p>
        </div>

        <button
          onClick={() => setFollowUpModalLead({} as any)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>{t.actions.scheduleFollowUp}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 rounded-lg border border-[#E2E8F0] shadow-xs flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'today' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#475569] hover:bg-[#F8FAFC]'
          }`}
        >
          <span>{t.followups.todayTab}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-[#FEF3C7] text-[#B45309]'}`}>
            {todayList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'overdue' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#475569] hover:bg-[#F8FAFC]'
          }`}
        >
          <span>{t.followups.overdueTab}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'overdue' ? 'bg-white/20 text-white' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
            {overdueList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'upcoming' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#475569] hover:bg-[#F8FAFC]'
          }`}
        >
          <span>{t.followups.upcomingTab}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'upcoming' ? 'bg-white/20 text-white' : 'bg-[#EFF6FF] text-[#1D4ED8]'}`}>
            {upcomingList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'completed' ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#475569] hover:bg-[#F8FAFC]'
          }`}
        >
          <span>{t.followups.completedTab}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-[#F0FDFA] text-[#0D9488]'}`}>
            {completedList.length}
          </span>
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm divide-y divide-[#F1F5F9]">
        {currentList.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#64748B]">
            <CheckCircle2 className="w-8 h-8 text-[#0D9488] mx-auto mb-2" />
            <p className="font-semibold text-sm text-[#0F172A] mb-1">
              {language === 'hi' ? 'कोई कार्य शेष नहीं है' : 'No follow-ups in this section'}
            </p>
          </div>
        ) : (
          currentList.map((flw) => (
            <div key={flw.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#0F172A]">
                    {flw.contactName}
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">({flw.contactPhone})</span>
                  {flw.status === 'completed' ? (
                    <span className="text-xs font-bold text-[#0D9488] bg-[#F0FDFA] px-2 py-0.5 rounded">
                      Completed
                    </span>
                  ) : flw.dueDate < todayStr ? (
                    <span className="text-xs font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded">
                      Due Today
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-[#1E3A8A] mt-1">
                  {flw.title}
                </p>

                <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-2 font-mono">
                  <span>Scheduled: {formatDateIndian(flw.dueDate)} · {flw.dueTime}</span>
                </div>

                {flw.completionNotes && (
                  <p className="text-xs text-[#0D9488] mt-1 italic font-medium">
                    ✓ Outcome: "{flw.completionNotes}"
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setCallModalLead({ name: flw.contactName, phone: flw.contactPhone } as any)}
                  className="p-1.5 px-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  <span>Call</span>
                </button>

                <button
                  onClick={() => handleWhatsApp(flw.contactPhone, flw.contactName, flw.title)}
                  className="p-1.5 px-2.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-xs font-semibold text-white flex items-center gap-1 shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                {flw.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setCompleteModalItem(flw)}
                      className="p-1.5 px-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1D4ED8] text-xs font-semibold text-white flex items-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.actions.complete}</span>
                    </button>

                    <button
                      onClick={() => {
                        setRescheduleModalItem(flw);
                        setNewDate(flw.dueDate);
                        setNewTime(flw.dueTime || '11:00 AM');
                      }}
                      className="p-1.5 px-2 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-semibold text-[#475569]"
                      title="Reschedule"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complete Follow-up Modal */}
      {completeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">
              {t.followups.completeModalTitle}
            </h2>
            <p className="text-xs text-[#64748B]">
              {completeModalItem.contactName} · {completeModalItem.title}
            </p>
            <form onSubmit={handleConfirmComplete} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {language === 'hi' ? 'कॉल / बैठक का निष्कर्ष:' : 'Discussion Outcome Notes:'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={t.followups.outcomePlaceholder}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteModalItem(null)}
                  className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B]"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {t.actions.complete}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">
              {t.followups.rescheduleModalTitle}
            </h2>
            <form onSubmit={handleConfirmReschedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#334155] mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#334155] mb-1">New Time</label>
                <input
                  type="text"
                  placeholder="11:00 AM"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalItem(null)}
                  className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B]"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {t.actions.reschedule}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
