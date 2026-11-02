import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Clock, Calendar, User, Phone, Check } from 'lucide-react';

export const ScheduleFollowUpModal: React.FC = () => {
  const { followUpModalLead, setFollowUpModalLead, scheduleFollowUp, language, t } = useApp();

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [dueTime, setDueTime] = useState('11:00 AM');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('high');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (followUpModalLead) {
      setContactName(followUpModalLead.name || '');
      setContactPhone(followUpModalLead.phone || '');
      setTitle(followUpModalLead.requirement ? `Call regarding ${followUpModalLead.requirement.substring(0, 35)}` : 'Customer follow-up callback');
    }
  }, [followUpModalLead]);

  if (!followUpModalLead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || !title.trim() || !dueDate) return;

    await scheduleFollowUp({
      leadId: (followUpModalLead as any).status !== 'Active' ? followUpModalLead.id : undefined,
      customerId: (followUpModalLead as any).status === 'Active' ? followUpModalLead.id : undefined,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      title: title.trim(),
      dueDate,
      dueTime,
      priority,
      notes: notes.trim(),
    });

    setFollowUpModalLead(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                {t.followups.scheduleModalTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={() => setFollowUpModalLead(null)}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-[#334155] mb-1">Contact Name *</label>
            <input
              type="text"
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#334155] mb-1">Phone *</label>
            <input
              type="text"
              required
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#334155] mb-1">Title / Purpose *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quotation discussion callback"
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#334155] mb-1">Due Time</label>
              <input
                type="text"
                placeholder="11:00 AM"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#334155] mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A]"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFollowUpModalLead(null)}
              className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B]"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              {t.actions.scheduleFollowUp}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
