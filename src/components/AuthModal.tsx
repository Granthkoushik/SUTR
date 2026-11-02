import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Phone, MessageCircle, Lock, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { session, login, requestOtp, verifyOtp, language, t, showToast } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('9820144821');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('1234');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, do not render auth modal
  if (session) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await requestOtp(phone);
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      setStep(2);
      showToast(language === 'hi' ? 'व्हाट्सएप ओटीपी भेजा गया!' : 'WhatsApp OTP sent!');
    } catch (err: any) {
      setError(err.message || 'Failed to send WhatsApp OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const valid = await verifyOtp(phone, otp);
      if (valid) {
        setStep(3);
        showToast(language === 'hi' ? 'ओटीपी सत्यापित हुआ' : 'WhatsApp OTP verified');
      } else {
        setError(language === 'hi' ? 'अमान्य ओटीपी कोड' : 'Invalid OTP code');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(phone, pin);
    } catch (err: any) {
      setError(err.message || 'Credential verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-md">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] text-white">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3 text-lg font-bold">
            LF
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {t.auth.title}
          </h1>
          <p className="text-xs text-blue-100 mt-0.5">
            {t.auth.subtitle}
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-[#1E3A8A]' : 'bg-slate-200'}`}></div>
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-[#1E3A8A]' : 'bg-slate-200'}`}></div>
          <div className={`flex-1 h-1.5 rounded-full ${step >= 3 ? 'bg-[#1E3A8A]' : 'bg-slate-200'}`}></div>
        </div>

        {/* Form Container */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Phone */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <span className="text-xs font-bold text-[#1E3A8A] block uppercase tracking-wider mb-1">
                  {t.auth.step1}
                </span>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.auth.phoneLabel}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="9820144821"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1E3A8A]"
                  />
                </div>
                <span className="text-[11px] text-[#64748B] mt-1 block">
                  {language === 'hi' ? 'डेमो खाता: 9820144821 (पिन: 1234)' : 'Demo Business: 9820144821 (Default PIN: 1234)'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>{isLoading ? 'Sending...' : t.auth.sendOtp}</span>
              </button>
            </form>
          )}

          {/* STEP 2: WhatsApp OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <span className="text-xs font-bold text-[#1E3A8A] block uppercase tracking-wider mb-1">
                  {t.auth.step2}
                </span>

                {devOtpHint && (
                  <div className="mb-2 p-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534] font-medium flex items-center justify-between">
                    <span>{t.auth.devOtpBanner}</span>
                    <button
                      type="button"
                      onClick={() => setOtp(devOtpHint)}
                      className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-[#BBF7D0] hover:bg-emerald-50 cursor-pointer"
                    >
                      {devOtpHint}
                    </button>
                  </div>
                )}

                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.auth.otpLabel}
                </label>
                <div className="relative">
                  <MessageCircle className="w-4 h-4 text-[#25D366] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 717804"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-base font-mono tracking-widest border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1E3A8A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#1E3A8A] hover:underline font-semibold"
                >
                  {t.auth.changeNumber}
                </button>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  className="text-xs text-[#64748B] hover:underline"
                >
                  {t.auth.resendOtp}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{isLoading ? 'Verifying...' : t.auth.verifyOtp}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 3: Security PIN */}
          {step === 3 && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <span className="text-xs font-bold text-[#1E3A8A] block uppercase tracking-wider mb-1">
                  {t.auth.step3}
                </span>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  {t.auth.pinLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-base font-mono tracking-widest border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1E3A8A]"
                  />
                </div>
                <span className="text-[11px] text-[#64748B] mt-1 block">
                  {language === 'hi' ? 'डेमो पिन 1234 है। नए खातों हेतु यह पिन स्वतः सुरक्षित हो जाएगा।' : 'Default demo PIN is 1234. For new mobile numbers, this sets your secure PIN.'}
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Connecting...' : t.auth.login}</span>
              </button>
            </form>
          )}

          {/* Privacy & Business-Owned Notice */}
          <div className="pt-2 text-[11px] text-center text-[#64748B] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
            <span>Your business records remain on your isolated database.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
