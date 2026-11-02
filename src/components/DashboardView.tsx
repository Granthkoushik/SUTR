import React from 'react';
import { useApp } from '../context/AppContext';
import { formatIndianCurrency, formatDateIndian } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  Mic, 
  ChevronRight,
  CalendarCheck2,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    dashboard, 
    isLoadingData, 
    language, 
    t, 
    setActiveTab, 
    setIsAddLeadModalOpen, 
    setIsVoiceModalOpen,
    setCallModalLead,
    setFollowUpModalLead,
    setConvertModalLead,
    completeFollowUp
  } = useApp();

  if (isLoadingData && !dashboard) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-white rounded-lg border border-[#E2E8F0]"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-lg border border-[#E2E8F0]"></div>)}
        </div>
      </div>
    );
  }

  const d = dashboard || {
    totalLeads: 0,
    newLeads: 0,
    activeLeads: 0,
    convertedCustomers: 0,
    followUpsDueToday: 0,
    overdueFollowUps: 0,
    conversionRate: 0,
    recentLeads: [],
    upcomingFollowUps: [],
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const greeting = language === 'hi' 
      ? `नमस्ते ${name} जी, लीडफ्लो से संपर्क करने हेतु धन्यवाद। क्या हम आपकी आवश्यकता पर चर्चा कर सकते हैं?`
      : `Hello ${name}, thank you for contacting us. Can we discuss your requirement?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(greeting)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Voice AI Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] uppercase tracking-wider">
              {language === 'hi' ? 'दैनिक कार्यक्षेत्र' : 'Daily Workspace'}
            </span>
            <span className="text-xs text-[#64748B]">·</span>
            <span className="text-xs text-[#64748B] flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] mt-1.5">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#6D28D9] bg-[#F5F3FF] hover:bg-[#EDE9FE] border border-[#DDD6FE] rounded-lg transition-colors shadow-2xs"
          >
            <Mic className="w-4 h-4 text-[#7C3AED]" />
            <span>{t.actions.voiceAdd}</span>
          </button>

          <button
            onClick={() => setIsAddLeadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#1D4ED8] rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.actions.addLead}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Quantitative Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div 
          onClick={() => setActiveTab('leads')}
          className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{t.dashboard.totalLeads}</span>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2.5 tabular-nums">
            {d.totalLeads}
          </div>
          <div className="text-xs text-[#475569] mt-1 pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
            <span>{d.newLeads} {t.dashboard.newLeads}</span>
            <span className="text-[#1D4ED8] font-semibold">{t.dashboard.activeLeads}: {d.activeLeads}</span>
          </div>
        </div>

        {/* Converted Customers */}
        <div 
          onClick={() => setActiveTab('customers')}
          className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{t.dashboard.convertedCustomers}</span>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0D9488] mt-2.5 tabular-nums">
            {d.convertedCustomers}
          </div>
          <div className="text-xs text-[#0D9488] font-semibold mt-1 pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
            <span>{t.dashboard.conversionRate}</span>
            <span className="tabular-nums">{d.conversionRate}%</span>
          </div>
        </div>

        {/* Follow-ups Due Today */}
        <div 
          onClick={() => setActiveTab('followups')}
          className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{t.dashboard.dueToday}</span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#B45309] mt-2.5 tabular-nums">
            {d.followUpsDueToday}
          </div>
          <div className="text-xs text-[#B45309] font-medium mt-1 pt-2 border-t border-[#F1F5F9]">
            {d.followUpsDueToday > 0 ? (language === 'hi' ? 'आज कॉल करना अनिवार्य है' : 'Action required today') : (language === 'hi' ? 'सब संपन्न' : 'All clear')}
          </div>
        </div>

        {/* Overdue Follow-ups */}
        <div 
          onClick={() => setActiveTab('followups')}
          className="bg-white p-4 sm:p-5 rounded-lg border border-[#E2E8F0] shadow-sm hover:border-[#CBD5E1] cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
            <span>{t.dashboard.overdue}</span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#DC2626] mt-2.5 tabular-nums">
            {d.overdueFollowUps}
          </div>
          <div className="text-xs text-[#DC2626] font-medium mt-1 pt-2 border-t border-[#F1F5F9]">
            {d.overdueFollowUps > 0 ? (language === 'hi' ? 'अतिदेय - तुरंत बात करें' : 'Attention needed') : (language === 'hi' ? 'कोई विलंब नहीं' : 'Zero overdue')}
          </div>
        </div>
      </div>

      {/* Main Split: Recent Leads Table + Upcoming Follow-ups & Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Leads */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">
                {t.dashboard.recentLeads}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {language === 'hi' ? 'हाल में आई व्यापारिक पूछताछ एवं ग्राहक' : 'Latest customer enquiries captured'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('leads')}
              className="text-xs font-bold text-[#1D4ED8] hover:underline flex items-center gap-1"
            >
              <span>{language === 'hi' ? 'सभी देखें' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {d.recentLeads.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#64748B]">
              <p>{t.dashboard.emptyLeads}</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {d.recentLeads.map((lead) => (
                <div key={lead.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F172A] truncate">
                        {lead.name}
                      </span>
                      <StatusBadge status={lead.status} />
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5 line-clamp-1 font-medium">
                      {lead.requirement}
                    </p>
                    <div className="text-[11px] text-[#64748B] mt-1 flex items-center gap-2 font-mono">
                      <span>{lead.phone}</span>
                      <span>·</span>
                      <span>{lead.source}</span>
                      {lead.budget > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-[#0F172A] tabular-nums">
                            {formatIndianCurrency(lead.budget)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setCallModalLead(lead)}
                      className="p-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] flex items-center gap-1 transition-colors"
                      title="Call Lead"
                    >
                      <Phone className="w-3 h-3 text-[#1E3A8A]" />
                      <span className="hidden sm:inline">{language === 'hi' ? 'कॉल' : 'Call'}</span>
                    </button>

                    <button
                      onClick={() => handleWhatsApp(lead.phone, lead.name)}
                      className="p-1.5 px-2.5 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-xs font-semibold text-white flex items-center gap-1 shadow-2xs transition-colors"
                      title="WhatsApp Chat"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setFollowUpModalLead(lead)}
                      className="p-1.5 px-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-semibold text-[#475569]"
                      title="Schedule Follow-up"
                    >
                      <Clock className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Upcoming Follow-ups & Conversion Funnel */}
        <div className="space-y-6">
          {/* Upcoming Follow-ups */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                <CalendarCheck2 className="w-4 h-4 text-[#1E3A8A]" />
                <span>{t.dashboard.upcomingFollowUps}</span>
              </h3>
              <button
                onClick={() => setActiveTab('followups')}
                className="text-[11px] font-bold text-[#1D4ED8] hover:underline"
              >
                {language === 'hi' ? 'कैलेंडर' : 'Schedule'}
              </button>
            </div>

            {d.upcomingFollowUps.length === 0 ? (
              <p className="text-xs text-[#64748B] py-4 text-center">{t.dashboard.emptyFollowUps}</p>
            ) : (
              <div className="space-y-2">
                {d.upcomingFollowUps.map((flw) => (
                  <div key={flw.id} className="p-2.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A] truncate">{flw.contactName}</span>
                      <span className="text-[11px] font-semibold text-[#1E3A8A] font-mono tabular-nums">
                        {formatDateIndian(flw.dueDate)} {flw.dueTime}
                      </span>
                    </div>
                    <p className="text-[#475569] text-[11px] line-clamp-1">{flw.title}</p>
                    <div className="pt-1 flex items-center justify-between">
                      <button
                        onClick={() => completeFollowUp(flw.id, 'Done via dashboard')}
                        className="text-[11px] text-[#0D9488] font-bold hover:underline"
                      >
                        ✓ {language === 'hi' ? 'पूर्ण करें' : 'Mark Done'}
                      </button>
                      <button
                        onClick={() => handleWhatsApp(flw.contactPhone, flw.contactName)}
                        className="text-[11px] text-[#0D9488] flex items-center gap-0.5 hover:underline font-semibold"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lead Conversion Funnel Overview */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              {language === 'hi' ? 'पाइपलाइन कन्वर्जन प्रगति' : 'Pipeline Funnel Progress'}
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-[#334155] mb-1">
                  <span>{t.dashboard.totalLeads}</span>
                  <span className="tabular-nums font-bold">{d.totalLeads}</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-2">
                  <div className="bg-[#1E3A8A] h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-[#334155] mb-1">
                  <span>{t.dashboard.activeLeads}</span>
                  <span className="tabular-nums font-bold">{d.activeLeads}</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-2">
                  <div 
                    className="bg-[#1D4ED8] h-2 rounded-full" 
                    style={{ width: `${d.totalLeads > 0 ? (d.activeLeads / d.totalLeads) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-[#0D9488] mb-1">
                  <span>{t.dashboard.convertedCustomers}</span>
                  <span className="tabular-nums font-bold">{d.convertedCustomers} ({d.conversionRate}%)</span>
                </div>
                <div className="w-full bg-[#F1F5F9] rounded-full h-2">
                  <div 
                    className="bg-[#0D9488] h-2 rounded-full" 
                    style={{ width: `${d.conversionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
