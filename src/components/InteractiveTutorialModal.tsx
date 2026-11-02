import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  CalendarClock, 
  UserCheck, 
  Mic, 
  BarChart3,
  RotateCcw,
  Check
} from 'lucide-react';

export const InteractiveTutorialModal: React.FC = () => {
  const { 
    isTutorialOpen, 
    tutorialStep, 
    nextTutorialStep, 
    prevTutorialStep, 
    skipTutorial, 
    startTutorial,
    language, 
    t 
  } = useApp();

  if (!isTutorialOpen) return null;

  const totalSteps = 7;

  const stepsData = [
    {
      step: 1,
      title: t.tutorial.step1Title,
      desc: t.tutorial.step1Desc,
      icon: LayoutDashboard,
      color: 'bg-[#EFF6FF] text-[#1D4ED8]',
    },
    {
      step: 2,
      title: t.tutorial.step2Title,
      desc: t.tutorial.step2Desc,
      icon: UserPlus,
      color: 'bg-[#F0FDF4] text-[#166534]',
    },
    {
      step: 3,
      title: t.tutorial.step3Title,
      desc: t.tutorial.step3Desc,
      icon: Users,
      color: 'bg-[#FEF3C7] text-[#B45309]',
    },
    {
      step: 4,
      title: t.tutorial.step4Title,
      desc: t.tutorial.step4Desc,
      icon: CalendarClock,
      color: 'bg-[#FEF2F2] text-[#DC2626]',
    },
    {
      step: 5,
      title: t.tutorial.step5Title,
      desc: t.tutorial.step5Desc,
      icon: UserCheck,
      color: 'bg-[#F0FDFA] text-[#0D9488]',
    },
    {
      step: 6,
      title: t.tutorial.step6Title,
      desc: t.tutorial.step6Desc,
      icon: Mic,
      color: 'bg-[#F5F3FF] text-[#7C3AED]',
    },
    {
      step: 7,
      title: t.tutorial.step7Title,
      desc: t.tutorial.step7Desc,
      icon: BarChart3,
      color: 'bg-[#EFF6FF] text-[#1E3A8A]',
    },
  ];

  const current = stepsData[tutorialStep - 1] || stepsData[0];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-200">
        {/* Top Header with Progress */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">
              {language === 'hi' ? 'लीडफ्लो गाइडेड टूर' : 'LeadFlow Guided Tour'}
            </span>
            <span className="text-xs text-[#64748B]">·</span>
            <span className="text-xs font-bold text-[#0F172A] tabular-nums">
              Step {tutorialStep} of {totalSteps}
            </span>
          </div>

          <button
            onClick={skipTutorial}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
          >
            {t.actions.skip}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-[#1E3A8A] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(tutorialStep / totalSteps) * 100}%` }}
          ></div>
        </div>

        {/* Step Card Content */}
        <div className="flex items-start gap-4 py-2">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${current.color} shadow-xs`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
              {current.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              {current.desc}
            </p>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
          <button
            type="button"
            onClick={startTutorial}
            className="text-xs text-[#64748B] hover:text-[#1E3A8A] flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'दोबारा देखें' : 'Replay'}</span>
          </button>

          <div className="flex items-center gap-2">
            {tutorialStep > 1 && (
              <button
                type="button"
                onClick={prevTutorialStep}
                className="px-3.5 py-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#334155] rounded-lg flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t.actions.prev}</span>
              </button>
            )}

            <button
              type="button"
              onClick={nextTutorialStep}
              className="px-5 py-2 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <span>{tutorialStep === totalSteps ? t.actions.finish : t.actions.next}</span>
              {tutorialStep < totalSteps && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
