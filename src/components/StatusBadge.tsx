import React from 'react';
import { useApp } from '../context/AppContext';
import { LeadStatus } from '../types';

interface StatusBadgeProps {
  status: LeadStatus | 'pending' | 'completed' | 'cancelled' | 'Active' | 'VIP' | 'Past' | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const { language } = useApp();

  let styles = 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]';
  let label = status;

  switch (status) {
    case 'New':
      styles = 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
      label = language === 'hi' ? 'नया' : 'New';
      break;

    case 'Contacted':
      styles = 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1]';
      label = language === 'hi' ? 'संपर्क किया' : 'Contacted';
      break;

    case 'Interested':
      styles = 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      label = language === 'hi' ? 'इच्छुक' : 'Interested';
      break;

    case 'Follow-up':
      styles = 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]';
      label = language === 'hi' ? 'फॉलो-अप' : 'Follow-up';
      break;

    case 'Converted':
    case 'Active':
    case 'completed':
      styles = 'bg-[#F0FDFA] text-[#0D9488] border-[#99F6E4]';
      label = status === 'Converted' ? (language === 'hi' ? 'सौदा पक्का' : 'Converted') :
              status === 'completed' ? (language === 'hi' ? 'पूर्ण' : 'Completed') :
              (language === 'hi' ? 'सक्रिय' : 'Active');
      break;

    case 'VIP':
      styles = 'bg-[#FEFCE8] text-[#A16207] border-[#FEF08A] font-bold';
      label = 'VIP';
      break;

    case 'Lost':
    case 'cancelled':
      styles = 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]';
      label = status === 'Lost' ? (language === 'hi' ? 'निरस्त' : 'Lost') : (language === 'hi' ? 'रद्द' : 'Cancelled');
      break;

    case 'pending':
      styles = 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
      label = language === 'hi' ? 'लंबित' : 'Pending';
      break;

    default:
      styles = 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} whitespace-nowrap shrink-0 ${className}`}
    >
      {label}
    </span>
  );
};
