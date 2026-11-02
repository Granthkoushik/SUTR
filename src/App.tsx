import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { LeadsView } from './components/LeadsView';
import { CustomersView } from './components/CustomersView';
import { FollowUpsView } from './components/FollowUpsView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { AddLeadModal } from './components/AddLeadModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { ScheduleFollowUpModal } from './components/ScheduleFollowUpModal';
import { ConvertToCustomerModal } from './components/ConvertToCustomerModal';
import { CallLogModal } from './components/CallLogModal';
import { AuthModal } from './components/AuthModal';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { activeTab, session, toast, dataError } = useApp();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col antialiased">
      {/* Top Header */}
      <Header />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 min-w-0 overflow-y-auto">
          {dataError && (
            <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dataError}</span>
            </div>
          )}

          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'leads' && <LeadsView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'followups' && <FollowUpsView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Interactive Modals */}
      <AuthModal />
      <AddLeadModal />
      <VoiceAssistantModal />
      <ScheduleFollowUpModal />
      <ConvertToCustomerModal />
      <CallLogModal />
      <InteractiveTutorialModal />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-16 lg:bottom-6 right-6 z-50 bg-[#0F172A] text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs sm:text-sm animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
