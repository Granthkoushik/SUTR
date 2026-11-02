import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  CalendarClock, 
  BarChart3, 
  Settings, 
  Mic, 
  ShieldCheck, 
  Database,
  LogOut,
  HelpCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    language, 
    t, 
    dashboard, 
    setIsVoiceModalOpen, 
    startTutorial,
    session,
    logout,
    profile
  } = useApp();

  const dueTodayCount = dashboard?.followUpsDueToday || 0;
  const overdueCount = dashboard?.overdueFollowUps || 0;
  const totalLeadsCount = dashboard?.totalLeads || 0;

  const navItems = [
    {
      id: 'dashboard',
      label: t.nav.dashboard,
      icon: LayoutDashboard,
    },
    {
      id: 'leads',
      label: t.nav.leads,
      icon: Users,
      badge: totalLeadsCount > 0 ? totalLeadsCount : undefined,
      badgeColor: 'bg-[#EFF6FF] text-[#1D4ED8]',
    },
    {
      id: 'customers',
      label: t.nav.customers,
      icon: UserCheck,
      badge: dashboard?.convertedCustomers ? dashboard.convertedCustomers : undefined,
      badgeColor: 'bg-[#F0FDFA] text-[#0D9488]',
    },
    {
      id: 'followups',
      label: t.nav.followups,
      icon: CalendarClock,
      badge: dueTodayCount + overdueCount > 0 ? dueTodayCount + overdueCount : undefined,
      badgeColor: overdueCount > 0 ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#FEF3C7] text-[#B45309]',
    },
    {
      id: 'analytics',
      label: t.nav.analytics,
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: t.nav.settings,
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 min-h-[calc(100vh-57px)] bg-white border-r border-[#E2E8F0] p-4 justify-between">
      <div>
        {/* Navigation list */}
        <div className="space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
            {language === 'hi' ? 'मुख्य मेनू' : 'Main Menu'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1D4ED8]' : 'text-[#64748B]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* AI Voice Assistant Shortcut Card */}
        <div className="mt-6 p-3.5 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#6D28D9] mb-1">
            <Mic className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>{language === 'hi' ? 'एआई वॉइस असिस्टेंट' : 'AI Voice Assistant'}</span>
          </div>
          <p className="text-[11px] text-[#4C1D95] leading-relaxed">
            {language === 'hi'
              ? 'हिंदी या अंग्रेजी में बोलकर तुरंत नया लीड और फॉलो-अप दर्ज करें।'
              : 'Speak naturally to add leads and schedule callbacks without typing.'}
          </p>
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="mt-2.5 w-full py-1.5 px-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'बोलना शुरू करें' : 'Start Voice Input'}</span>
          </button>
        </div>

        {/* Business-Owned Storage Isolation Badge */}
        <div className="mt-5 p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#0D9488]">
            <Database className="w-3 h-3" />
            <span>{language === 'hi' ? 'स्थानीय व्यापार डेटाबेस' : 'Business-Owned DB'}</span>
          </div>
          <p className="text-[#64748B] leading-tight">
            {language === 'hi' ? 'डेटा आपकी फर्म के स्वतंत्र डेटाबेस में सुरक्षित है।' : 'Records stored exclusively in your isolated business database.'}
          </p>
        </div>
      </div>

      {/* User profile & session footer */}
      <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#0F172A] truncate">
              {profile?.businessName || session?.user.businessName || 'My Business'}
            </p>
            <p className="text-xs text-[#64748B] truncate font-mono">
              +91 {session?.user.phone || '9820144821'}
            </p>
          </div>
          <button
            onClick={logout}
            title={language === 'hi' ? 'लॉगआउट' : 'Logout'}
            className="p-1.5 text-[#64748B] hover:text-[#DC2626] rounded-md hover:bg-[#FEE2E2] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={startTutorial}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#475569] hover:text-[#1E3A8A] font-semibold rounded border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#1E3A8A]" />
          <span>{language === 'hi' ? 'गाइडेड टूर' : 'Interactive Tour'}</span>
        </button>
      </div>
    </aside>
  );
};
