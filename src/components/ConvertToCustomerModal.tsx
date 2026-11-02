import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, UserCheck, IndianRupee, Sparkles } from 'lucide-react';
import { formatIndianCurrency } from '../utils/formatters';

export const ConvertToCustomerModal: React.FC = () => {
  const { convertModalLead, setConvertModalLead, convertLeadToCustomer, language, t } = useApp();

  const [dealValue, setDealValue] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  useEffect(() => {
    if (convertModalLead) {
      setDealValue(convertModalLead.budget ? String(convertModalLead.budget) : '100000');
      setCustomerNotes(convertModalLead.notes || 'Converted from enquiry');
    }
  }, [convertModalLead]);

  if (!convertModalLead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await convertLeadToCustomer(convertModalLead.id, Number(dealValue) || 0, customerNotes.trim());
    setConvertModalLead(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                {t.actions.convertToCustomer}
              </h2>
            </div>
          </div>
          <button
            onClick={() => setConvertModalLead(null)}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-[#64748B]">Lead Name:</span>
            <span className="font-bold text-[#0F172A]">{convertModalLead.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">Requirement:</span>
            <span className="font-medium text-[#0F172A] text-right max-w-[200px]">{convertModalLead.requirement}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              Final Deal / Purchase Order Value (₹) *
            </label>
            <div className="relative">
              <IndianRupee className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                required
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] font-bold tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              Customer Onboarding Notes / Terms
            </label>
            <textarea
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Advance payment received, agreed delivery schedules..."
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConvertModalLead(null)}
              className="px-3.5 py-1.5 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#64748B]"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              {t.actions.convertToCustomer}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
