import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { formatIndianCurrency, formatDateIndian } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { 
  Search, 
  Phone, 
  MessageCircle, 
  Clock, 
  UserCheck, 
  IndianRupee, 
  Calendar,
  X,
  History
} from 'lucide-react';
import { ApiClient } from '../api/client';

export const CustomersView: React.FC = () => {
  const { 
    customers, 
    language, 
    t, 
    setFollowUpModalLead, 
    setCallModalLead,
    session,
    showToast
  } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [interactionHistory, setInteractionHistory] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.requirement.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalValue = customers.reduce((sum, c) => sum + (c.totalDealValue || 0), 0);

  const handleOpenCustomer = async (cust: Customer) => {
    setActiveCustomer(cust);
    if (session) {
      try {
        const history = await ApiClient.getInteractions(session.user.businessId, session.token, cust.id);
        setInteractionHistory(history);
      } catch {
        setInteractionHistory([]);
      }
    }
  };

  const handleAddCustomerNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeCustomer || !session) return;
    try {
      const added = await ApiClient.addInteraction(session.user.businessId, session.token, {
        entityType: 'customer',
        entityId: activeCustomer.id,
        interactionType: 'note',
        summary: newNote.trim(),
      });
      setInteractionHistory(prev => [added, ...prev]);
      setNewNote('');
      showToast(language === 'hi' ? 'ग्राहक नोट जोड़ा गया' : 'Customer note added');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const greeting = language === 'hi' 
      ? `नमस्ते ${name} जी, लीडफ्लो द्वारा सादर प्रणाम। क्या आपको किसी अतिरिक्त सामग्री अथवा सहायता की आवश्यकता है?`
      : `Hello ${name}, greetings from LeadFlow. Let us know if you need any further supplies or assistance.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0D9488] uppercase tracking-wider">
              {language === 'hi' ? 'सफल ग्राहक सूची' : 'Customer Directory'}
            </span>
            <span className="text-xs text-[#64748B]">·</span>
            <span className="text-xs font-semibold text-[#0F172A] tabular-nums">
              {filteredCustomers.length} {language === 'hi' ? 'ग्राहक' : 'Customers'} ({formatIndianCurrency(totalValue, true)})
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
            {t.customers.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
            {t.customers.subtitle}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#64748B] block">{language === 'hi' ? 'कुल व्यवसाय' : 'Total Client Value'}</span>
          <span className="text-lg font-bold text-[#0D9488] tabular-nums">{formatIndianCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'hi' ? 'ग्राहक का नाम, मोबाइल नंबर खोजें...' : 'Search customers by name, phone, enquiry...'}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 outline-hidden"
          />
        </div>
      </div>

      {/* Customers List / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-2 p-12 bg-white rounded-lg border border-[#E2E8F0] text-center text-xs text-[#64748B]">
            <UserCheck className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
            <p className="font-semibold text-sm text-[#0F172A] mb-1">{t.customers.emptyCustomers}</p>
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div 
              key={cust.id} 
              className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-sm hover:border-[#CBD5E1] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {cust.name}
                    </h3>
                    <p className="text-xs text-[#64748B] font-mono mt-0.5">
                      {cust.phone}
                    </p>
                  </div>
                  <StatusBadge status={cust.status || 'Active'} />
                </div>

                <div className="mt-3 p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">{language === 'hi' ? 'सामग्री / सेवा' : 'Requirement'}:</span>
                    <span className="font-medium text-[#0F172A] text-right max-w-xs">{cust.requirement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">{t.customers.dealValue}:</span>
                    <span className="font-bold text-[#0D9488] tabular-nums">{formatIndianCurrency(cust.totalDealValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">{t.customers.convertedOn}:</span>
                    <span className="font-mono text-[#0F172A]">{formatDateIndian(cust.convertedAt)}</span>
                  </div>
                </div>

                {cust.notes && (
                  <p className="text-xs text-[#64748B] mt-2 line-clamp-2 italic">
                    "{cust.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                <button
                  onClick={() => handleOpenCustomer(cust)}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  {language === 'hi' ? 'इतिहास व प्रोफाइल' : 'Profile & Notes'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCallModalLead(cust as any)}
                    className="p-1.5 px-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    <span>{language === 'hi' ? 'कॉल' : 'Call'}</span>
                  </button>

                  <button
                    onClick={() => handleWhatsApp(cust.phone, cust.name)}
                    className="p-1.5 px-2.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-xs font-semibold text-white flex items-center gap-1 shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setFollowUpModalLead(cust as any)}
                    className="p-1.5 px-2 rounded-lg border border-[#DDD6FE] text-[#6D28D9] hover:bg-[#F5F3FF]"
                    title="Schedule Callback"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Profile & Interaction Modal */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <span className="text-xs font-bold text-[#0D9488] uppercase">Customer Account</span>
                <h2 className="text-lg font-bold text-[#0F172A]">{activeCustomer.name}</h2>
              </div>
              <button
                onClick={() => setActiveCustomer(null)}
                className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Mobile:</span>
                <span className="font-mono font-bold text-[#0F172A]">{activeCustomer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Lifetime Deal Value:</span>
                <span className="font-bold text-[#0D9488] tabular-nums">{formatIndianCurrency(activeCustomer.totalDealValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Conversion Date:</span>
                <span className="font-mono text-[#0F172A]">{formatDateIndian(activeCustomer.convertedAt)}</span>
              </div>
            </div>

            {/* Note input */}
            <form onSubmit={handleAddCustomerNote} className="space-y-2">
              <label className="block text-xs font-bold text-[#334155]">
                {language === 'hi' ? 'ग्राहक संबंधी नई टिप्पणी जोड़ें:' : 'Add Customer Note / Update:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Order feedback, requirement notes, payment update..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-[#E2E8F0] rounded bg-white text-[#0F172A]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0D9488] text-white text-xs font-semibold rounded hover:bg-[#0F766E]"
                >
                  Save
                </button>
              </div>
            </form>

            {/* History Feed */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>Customer History</span>
              </span>
              {interactionHistory.length === 0 ? (
                <p className="text-xs text-[#64748B] text-center py-2">No history recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {interactionHistory.map(item => (
                    <div key={item.id} className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs">
                      <div className="flex justify-between text-[11px] text-[#64748B]">
                        <span className="font-semibold text-[#1E3A8A] uppercase">{item.interactionType}</span>
                        <span>{new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p className="text-[#0F172A] mt-0.5">{item.summary}</p>
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
