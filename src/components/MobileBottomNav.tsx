import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Users, UserCheck, CalendarClock, Mic } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t, setIsVoiceModalOpen, dashboard } = useApp();

  const dueCount = (dashboard?.followUpsDueToday || 0) + (dashboard?.overdueFollowUps || 0);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8F0] shadow-[0_-2px_6px_rgba(15,23,42,0.06)] px-2 py-1 safe-area-pb">
      <div className="grid grid-cols-5 gap-1 items-center">
        {/* Dashboard */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg transition-colors ${
            activeTab === 'dashboard' ? 'text-[#1D4ED8]' : 'text-[#64748B]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-none font-semibold">
            {t.nav.dashboard.split(' ')[0]}
          </span>
        </button>

        {/* Leads */}
        <button
          onClick={() => setActiveTab('leads')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg transition-colors ${
            activeTab === 'leads' ? 'text-[#1D4ED8]' : 'text-[#64748B]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-none font-semibold">
            {t.nav.leads.split(' ')[0]}
          </span>
        </button>

        {/* Voice AI Center Trigger */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="w-12 h-12 -mt-4 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shadow-lg hover:bg-[#6D28D9] active:scale-95 transition-all"
            title="Voice Assistant"
          >
            <Mic className="w-6 h-6" />
          </button>
        </div>

        {/* Follow-ups */}
        <button
          onClick={() => setActiveTab('followups')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg relative transition-colors ${
            activeTab === 'followups' ? 'text-[#1D4ED8]' : 'text-[#64748B]'
          }`}
        >
          <div className="relative">
            <CalendarClock className="w-5 h-5" />
            {dueCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#DC2626]"></span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 leading-none font-semibold">
            {t.nav.followups.split(' ')[0]}
          </span>
        </button>

        {/* Customers */}
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-lg transition-colors ${
            activeTab === 'customers' ? 'text-[#1D4ED8]' : 'text-[#64748B]'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-none font-semibold">
            {t.nav.customers.split(' ')[0]}
          </span>
        </button>
      </div>
    </nav>
  );
};
