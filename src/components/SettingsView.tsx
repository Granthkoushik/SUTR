import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building, 
  User, 
  Phone, 
  MapPin, 
  Globe, 
  Mic, 
  Database, 
  ShieldCheck, 
  LogOut, 
  HelpCircle,
  Save,
  Check
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    language, 
    setLanguage, 
    t, 
    session, 
    logout, 
    startTutorial,
    showToast 
  } = useApp();

  const [businessName, setBusinessName] = useState(profile?.businessName || 'Sharma Trading & Services');
  const [ownerName, setOwnerName] = useState(profile?.ownerName || 'Rajesh Sharma');
  const [phone, setPhone] = useState(profile?.phone || '+91 98201 44821');
  const [city, setCity] = useState(profile?.city || 'Pune, Maharashtra');
  const [category, setCategory] = useState(profile?.category || 'Wholesale & Retail Trading');
  const [voicePref, setVoicePref] = useState(profile?.voicePref || 'hi-IN');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      businessName,
      ownerName,
      phone,
      city,
      category,
      languagePref: language,
      voicePref,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          {t.settings.title}
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] mt-0.5">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Business-Owned Data Storage Guarantee */}
      <div className="p-4 rounded-lg bg-[#F0FDFA] border border-[#99F6E4] flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shrink-0">
          <Database className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <span className="font-bold text-[#0D9488] block text-sm">
            {language === 'hi' ? 'व्यापारिक डेटा संप्रभुता (Business-Owned Storage)' : 'Business-Owned Data Sovereignty Active'}
          </span>
          <p className="text-[#134E4A] mt-0.5 leading-relaxed">
            {t.settings.storageNotice}
          </p>
          <div className="mt-2 text-[11px] font-mono text-[#0F766E] flex items-center gap-2">
            <span>Database File: ./data/businesses/business_{session?.user.businessId}.sqlite</span>
            <span>·</span>
            <span className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Local & Encrypted
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm space-y-4 text-xs sm:text-sm">
        <h2 className="text-sm font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-2">
          {language === 'hi' ? 'व्यापार विवरण' : 'Business Profile Information'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.settings.businessName}
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.settings.ownerName}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.settings.phone}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] font-mono outline-hidden focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.settings.city}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#334155] mb-1">
            {t.settings.category}
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
          />
        </div>

        {/* Preferences */}
        <h2 className="text-sm font-bold text-[#0F172A] border-t border-[#F1F5F9] pt-4 pb-2">
          {language === 'hi' ? 'भाषा एवं वॉइस प्राथमिकताएं' : 'Language & Voice Preferences'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.settings.languagePref}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded-lg border font-semibold text-xs transition-colors ${
                  language === 'en' ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-white text-[#334155] border-[#E2E8F0]'
                }`}
              >
                English (Default)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`flex-1 py-2 rounded-lg border font-semibold text-xs transition-colors ${
                  language === 'hi' ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]' : 'bg-white text-[#334155] border-[#E2E8F0]'
                }`}
              >
                हिन्दी (Hindi)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#334155] mb-1">
              {t.settings.voicePref}
            </label>
            <select
              value={voicePref}
              onChange={(e) => setVoicePref(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#1D4ED8]"
            >
              <option value="hi-IN">हिन्दी (India - hi-IN)</option>
              <option value="en-IN">English (India - en-IN)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-[#F1F5F9] flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3A8A] hover:bg-[#1D4ED8] text-white rounded-lg font-semibold shadow-sm transition-colors text-xs sm:text-sm"
          >
            <Save className="w-4 h-4" />
            <span>{t.settings.saveProfile}</span>
          </button>
        </div>
      </form>

      {/* Account & Tour Actions */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-[#0F172A] border-b border-[#F1F5F9] pb-2">
          {language === 'hi' ? 'सिस्टम क्रियाएं' : 'System Actions'}
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={startTutorial}
            className="w-full sm:w-auto px-4 py-2 border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg text-xs font-semibold text-[#334155] flex items-center justify-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-[#1E3A8A]" />
            <span>{t.actions.startTutorial}</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full sm:w-auto px-4 py-2 bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-xs font-semibold text-[#DC2626] flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.actions.logout}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
