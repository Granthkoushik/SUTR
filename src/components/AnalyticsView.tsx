import React from 'react';
import { useApp } from '../context/AppContext';
import { formatIndianCurrency } from '../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  UserCheck, 
  CheckCircle2, 
  PieChart, 
  Compass,
  ArrowUpRight
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { analytics, language, t } = useApp();

  const a = analytics || {
    totalLeads: 0,
    convertedCount: 0,
    conversionRate: '0',
    statusBreakdown: [],
    sourceBreakdown: [],
    followUpStats: { total: 0, completed: 0, rate: 0 },
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
            {language === 'hi' ? 'व्यापार प्रदर्शन' : 'Business Insights'}
          </span>
          <span className="text-xs text-[#64748B]">·</span>
          <span className="text-xs text-[#0D9488] font-semibold">
            {language === 'hi' ? 'रीयल-टाइम विश्लेषण' : 'Real-time Calculations'}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
          {t.analytics.title}
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
          {t.analytics.subtitle}
        </p>
      </div>

      {/* 4 Quantitative KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">{t.dashboard.totalLeads}</span>
          <div className="text-2xl font-bold text-[#0F172A] mt-1 tabular-nums">{a.totalLeads}</div>
          <span className="text-[11px] text-[#1E3A8A] font-semibold mt-1 block">All Time Enquiries</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">{t.dashboard.convertedCustomers}</span>
          <div className="text-2xl font-bold text-[#0D9488] mt-1 tabular-nums">{a.convertedCount}</div>
          <span className="text-[11px] text-[#0D9488] font-semibold mt-1 block">Successful Closures</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">{t.dashboard.conversionRate}</span>
          <div className="text-2xl font-bold text-[#1D4ED8] mt-1 tabular-nums">{a.conversionRate}%</div>
          <span className="text-[11px] text-[#1D4ED8] font-semibold mt-1 block">Conversion Efficiency</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
          <span className="text-xs font-semibold text-[#64748B]">{t.analytics.followUpDiscipline}</span>
          <div className="text-2xl font-bold text-[#7C3AED] mt-1 tabular-nums">{a.followUpStats.rate}%</div>
          <span className="text-[11px] text-[#7C3AED] font-semibold mt-1 block">{a.followUpStats.completed} / {a.followUpStats.total} Completed</span>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#1E3A8A]" />
            <span>{t.analytics.statusDistribution}</span>
          </h2>

          <div className="space-y-3 text-xs">
            {a.statusBreakdown.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-4">No data yet.</p>
            ) : (
              a.statusBreakdown.map((item) => {
                const pct = a.totalLeads > 0 ? Math.round((item.count / a.totalLeads) * 100) : 0;
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between font-semibold text-[#334155]">
                      <span>{item.status}</span>
                      <span className="tabular-nums font-bold text-[#0F172A]">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.status === 'Converted' ? 'bg-[#0D9488]' :
                          item.status === 'Lost' ? 'bg-[#EF4444]' :
                          item.status === 'Follow-up' ? 'bg-[#7C3AED]' :
                          item.status === 'Interested' ? 'bg-[#F59E0B]' : 'bg-[#1D4ED8]'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#1E3A8A]" />
            <span>{t.analytics.sourcePerformance}</span>
          </h2>

          <div className="space-y-3 text-xs">
            {a.sourceBreakdown.length === 0 ? (
              <p className="text-xs text-[#64748B] text-center py-4">No channel data yet.</p>
            ) : (
              a.sourceBreakdown.map((item) => {
                const pct = a.totalLeads > 0 ? Math.round((item.count / a.totalLeads) * 100) : 0;
                return (
                  <div key={item.source} className="space-y-1">
                    <div className="flex justify-between font-semibold text-[#334155]">
                      <span>{item.source}</span>
                      <span className="tabular-nums font-bold text-[#0F172A]">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-[#F1F5F9] rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-[#1E3A8A]"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
