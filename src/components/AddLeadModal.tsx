import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Priority } from '../types';
import { X, User, Phone, Mail, FileText, IndianRupee, Compass, Tag, Clock } from 'lucide-react';

export const AddLeadModal: React.FC = () => {
  const { isAddLeadModalOpen, setIsAddLeadModalOpen, createLead, scheduleFollowUp, language, t } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [requirement, setRequirement] = useState('');
  const [source, setSource] = useState('WhatsApp Inbound');
  const [budget, setBudget] = useState('');
  const [priority, setPriority] = useState<Priority>('High');
  const [notes, setNotes] = useState('');
  const [scheduleNow, setScheduleNow] = useState(true);
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [followUpTime, setFollowUpTime] = useState('11:00 AM');

  if (!isAddLeadModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !requirement.trim()) return;

    const created = await createLead({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      requirement: requirement.trim(),
      source,
      status: scheduleNow ? 'Follow-up' : 'New',
      budget: Number(budget) || 0,
      priority,
      notes: notes.trim(),
    });

    if (scheduleNow && followUpDate) {
      await scheduleFollowUp({
        leadId: created.id,
        contactName: created.name,
        contactPhone: created.phone,
        title: `Follow up on: ${created.requirement.substring(0, 40)}`,
        dueDate: followUpDate,
        dueTime: followUpTime,
        priority: priority === 'High' ? 'high' : 'medium',
        notes: notes.trim() || 'Initial follow-up scheduled at lead creation',
      });
    }

    setIsAddLeadModalOpen(false);
    setName('');
    setPhone('+91 ');
    setEmail('');
    setRequirement('');
    setBudget('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">
              {t.actions.addLead}
            </h2>
            <p className="text-xs text-[#64748B]">
              {language === 'hi' ? 'ग्राहक का नाम, फोन और मांग का विवरण दर्ज करें' : 'Capture enquiry details and schedule initial callback'}
            </p>
          </div>
          <button
            onClick={() => setIsAddLeadModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                {t.leads.name} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                {t.leads.phone} *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="+91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] font-mono outline-hidden focus:border-[#1D4ED8]"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              Email (Optional)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="client@company.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          {/* Requirement */}
          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.leads.requirement} *
            </label>
            <textarea
              required
              rows={2}
              placeholder={language === 'hi' ? 'उदा. 3 BHK फ्लैट हेतु बिजली वायरिंग और स्विचगियर्स' : 'e.g. 3 BHK Flat Electrical Wiring, Industrial Valves, CNC Brass parts...'}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8] resize-none"
            />
          </div>

          {/* Budget & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                Budget / Estimated Value (₹)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="50000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] font-bold tabular-nums outline-hidden focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">
                {t.leads.priority}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.leads.source}
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
            >
              <option value="WhatsApp Inbound">WhatsApp Inbound</option>
              <option value="Phone Enquiry">Phone Call</option>
              <option value="IndiaMART">IndiaMART Verified Buyer</option>
              <option value="Justdial">Justdial</option>
              <option value="Walk-in">Direct Walk-in / Showroom</option>
              <option value="Referral">Client Referral</option>
              <option value="Website">Website Form</option>
            </select>
          </div>

          {/* Schedule Follow-up Checkbox */}
          <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0F172A]">
              <input
                type="checkbox"
                checked={scheduleNow}
                onChange={(e) => setScheduleNow(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#1E3A8A] focus:ring-[#1E3A8A]"
              />
              <span>{language === 'hi' ? 'साथ में फॉलो-अप कॉल निर्धारित करें' : 'Schedule follow-up callback immediately'}</span>
            </label>

            {scheduleNow && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <label className="block text-[#64748B] mb-0.5">Callback Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-[#64748B] mb-0.5">Callback Time</label>
                  <input
                    type="text"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    placeholder="11:00 AM"
                    className="w-full px-2.5 py-1.5 border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddLeadModalOpen(false)}
              className="px-4 py-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] rounded-lg font-semibold"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white rounded-lg font-semibold shadow-sm transition-colors"
            >
              {t.actions.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
