import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Phone, PhoneCall, Check, Clock, User, Building } from 'lucide-react';
import { ApiClient } from '../api/client';

export const CallLogModal: React.FC = () => {
  const { callModalLead, setCallModalLead, language, session, showToast } = useApp();
  const [outcomeNote, setOutcomeNote] = useState('');
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected'>('idle');

  if (!callModalLead) return null;

  const phone = callModalLead.phone || '+91 98201 44821';
  const name = callModalLead.name || 'Customer';

  const handleDial = () => {
    setCallStatus('calling');
    showToast(language === 'hi' ? `${phone} पर कॉल मिलाया जा रहा है...` : `Initiating phone call to ${phone}...`);
    setTimeout(() => {
      setCallStatus('connected');
    }, 1500);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (session && callModalLead.id) {
      try {
        await ApiClient.addInteraction(session.user.businessId, session.token, {
          entityType: (callModalLead as any).status === 'Active' ? 'customer' : 'lead',
          entityId: callModalLead.id,
          interactionType: 'call',
          summary: outcomeNote.trim() || 'Direct phone call placed',
        });
      } catch (err) {
        console.warn('Could not log interaction to server:', err);
      }
    }
    showToast(language === 'hi' ? 'कॉल विवरण सुरक्षित किया गया' : 'Call log saved to account history');
    setCallModalLead(null);
    setCallStatus('idle');
    setOutcomeNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1E3A8A] flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                {language === 'hi' ? 'सीधा फोन कॉल' : 'Direct Phone Call'}
              </h2>
              <p className="text-xs text-[#64748B] truncate max-w-[240px]">
                {name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCallModalLead(null)}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dial Card */}
        <div className="p-5 space-y-4">
          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-center">
            <span className="text-xs text-[#64748B] block">{name}</span>
            <div className="text-xl font-bold font-mono text-[#0F172A] mt-1">
              {phone}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                onClick={handleDial}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{callStatus === 'connected' ? (language === 'hi' ? 'कॉल जारी...' : 'Call Active') : (language === 'hi' ? 'नंबर डायल करें' : 'Dial Phone')}</span>
              </a>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#475569] block">
              {language === 'hi' ? 'त्वरित चर्चा परिणाम चुनें:' : 'Quick Call Outcomes:'}
            </label>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                language === 'hi' ? 'कल दोपहर दोबारा कॉल करें' : 'Call back tomorrow afternoon',
                language === 'hi' ? 'कोटेशन की मांग की' : 'Requested official quotation',
                language === 'hi' ? 'सौदा पक्का करने को तैयार' : 'Ready to finalize order',
                language === 'hi' ? 'फोन नहीं उठाया' : 'Did not answer call',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOutcomeNote(preset)}
                  className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] text-[11px] font-medium transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Note Form */}
          <form onSubmit={handleSaveLog} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                {language === 'hi' ? 'कॉल का सार व निष्कर्ष दर्ज करें:' : 'Log Call Outcome Notes:'}
              </label>
              <textarea
                required
                rows={3}
                placeholder={language === 'hi' ? 'चर्चा का सार लिखें...' : 'Summarize discussion, agreed budget, or next steps...'}
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] focus:border-[#1D4ED8] outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCallModalLead(null)}
                className="px-3.5 py-2 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Save Call Log
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
