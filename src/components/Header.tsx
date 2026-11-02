import React from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Globe, Mic, HelpCircle, User, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    language, 
    toggleLanguage, 
    t, 
    setIsAddLeadModalOpen, 
    setIsVoiceModalOpen,
    startTutorial,
    session,
    logout
  } = useApp();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-6 px-4 sm:px-6 py-3 max-w-[1600px] mx-auto">
        {/* Zone 1: Brand title, one line */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] flex items-center justify-center text-white font-bold text-base shadow-sm">
            LF
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0">
            {language === 'hi' ? 'लीडफ्लो' : 'LeadFlow'}
          </span>
        </div>

        {/* Zone 2: 5 single-line nav links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-[#475569]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'dashboard'
                ? 'text-[#1D4ED8] border-[#1D4ED8]'
                : 'border-transparent hover:text-[#0F172A]'
            }`}
          >
            {t.nav.dashboard}
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'leads'
                ? 'text-[#1D4ED8] border-[#1D4ED8]'
                : 'border-transparent hover:text-[#0F172A]'
            }`}
          >
            {t.nav.leads}
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'customers'
                ? 'text-[#1D4ED8] border-[#1D4ED8]'
                : 'border-transparent hover:text-[#0F172A]'
            }`}
          >
            {t.nav.customers}
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'followups'
                ? 'text-[#1D4ED8] border-[#1D4ED8]'
                : 'border-transparent hover:text-[#0F172A]'
            }`}
          >
            {t.nav.followups}
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activeTab === 'analytics'
                ? 'text-[#1D4ED8] border-[#1D4ED8]'
                : 'border-transparent hover:text-[#0F172A]'
            }`}
          >
            {t.nav.analytics}
          </button>
        </nav>

        {/* Zone 3: 1 primary action cluster + compact utilities */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* AI Voice Assistant trigger */}
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            title="AI Voice Lead Assistant (बोलकर लीड जोड़ें)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          >
            <Mic className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span className="hidden sm:inline">{t.actions.voiceAdd}</span>
          </button>

          {/* Tutorial Tour trigger */}
          <button
            onClick={startTutorial}
            title={language === 'hi' ? 'गाइडेड टूर देखें' : 'Start Guided Tour'}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            title={language === 'en' ? 'Switch to Hindi (हिन्दी)' : 'Switch to English'}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors whitespace-nowrap"
          >
            <Globe className="w-3 h-3 text-[#1E3A8A]" />
            <span className="font-bold">{language === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Primary Action Button: + Add Lead */}
          <button
            onClick={() => setIsAddLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">{t.actions.addLead}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
