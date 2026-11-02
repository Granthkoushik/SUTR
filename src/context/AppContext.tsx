import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Language, 
  Lead, 
  Customer, 
  FollowUp, 
  DashboardSummary, 
  AnalyticsData, 
  BusinessProfile, 
  AuthSession,
  LeadStatus
} from '../types';
import { translations } from '../utils/translations';
import { ApiClient } from '../api/client';

export type ActiveTab = 'dashboard' | 'leads' | 'customers' | 'followups' | 'analytics' | 'settings';

interface AppContextType {
  // Auth
  session: AuthSession | null;
  isLoadingAuth: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
  requestOtp: (phone: string) => Promise<{ success: boolean; message: string; devOtp?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<boolean>;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: typeof translations.en;

  // Active View Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Real Backend Data
  dashboard: DashboardSummary | null;
  leads: Lead[];
  customers: Customer[];
  followUps: FollowUp[];
  analytics: AnalyticsData | null;
  profile: BusinessProfile | null;
  isLoadingData: boolean;
  dataError: string | null;
  refreshData: () => Promise<void>;

  // Actions
  createLead: (leadData: Partial<Lead>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<Lead>;
  archiveLead: (id: string, isArchived: boolean) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  convertLeadToCustomer: (id: string, dealValue?: number, notes?: string) => Promise<Customer>;
  scheduleFollowUp: (data: Partial<FollowUp>) => Promise<FollowUp>;
  completeFollowUp: (id: string, notes?: string) => Promise<void>;
  rescheduleFollowUp: (id: string, date: string, time?: string) => Promise<void>;
  updateProfile: (profile: Partial<BusinessProfile>) => Promise<void>;

  // Modals & UI States
  isAddLeadModalOpen: boolean;
  setIsAddLeadModalOpen: (open: boolean) => void;
  isVoiceModalOpen: boolean;
  setIsVoiceModalOpen: (open: boolean) => void;
  followUpModalLead: Lead | Customer | null;
  setFollowUpModalLead: (lead: Lead | Customer | null) => void;
  convertModalLead: Lead | null;
  setConvertModalLead: (lead: Lead | null) => void;
  callModalLead: Lead | Customer | null;
  setCallModalLead: (lead: Lead | Customer | null) => void;

  // Guided Walkthrough Tutorial
  isTutorialOpen: boolean;
  tutorialStep: number;
  startTutorial: () => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
  skipTutorial: () => void;

  // Toast
  toast: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'leadflow_auth_session';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Business Data
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Modals
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [followUpModalLead, setFollowUpModalLead] = useState<Lead | Customer | null>(null);
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null);
  const [callModalLead, setCallModalLead] = useState<Lead | Customer | null>(null);

  // Tutorial
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const t = translations[language];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load stored auth session on startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed: AuthSession = JSON.parse(stored);
          const verifiedUser = await ApiClient.checkSession(parsed.token);
          setSession({
            token: parsed.token,
            user: verifiedUser,
          });
        } else {
          // In development/first-run, auto-login with default demo business if none exists
          try {
            const defaultLogin = await ApiClient.login('9820144821', '1234');
            setSession(defaultLogin);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(defaultLogin));
          } catch {
            // Wait for manual login
          }
        }
      } catch (err) {
        console.warn('Auth check error, clearing session:', err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();
  }, []);

  // Fetch Business Data when session changes
  const refreshData = useCallback(async () => {
    if (!session) return;
    setIsLoadingData(true);
    setDataError(null);
    try {
      const serverUrl = session.user.businessServerUrl;
      const [dashData, leadsData, custData, flwData, analyticsData, profData] = await Promise.all([
        ApiClient.getDashboard(session.user.businessId, session.token, serverUrl),
        ApiClient.getLeads(session.user.businessId, session.token, false, serverUrl),
        ApiClient.getCustomers(session.user.businessId, session.token, serverUrl),
        ApiClient.getFollowUps(session.user.businessId, session.token, undefined, serverUrl),
        ApiClient.getAnalytics(session.user.businessId, session.token, serverUrl),
        ApiClient.getProfile(session.user.businessId, session.token, serverUrl),
      ]);

      setDashboard(dashData);
      setLeads(leadsData);
      setCustomers(custData);
      setFollowUps(flwData);
      setAnalytics(analyticsData);
      setProfile(profData);
      if (profData?.languagePref) {
        setLanguage(profData.languagePref);
      }
    } catch (err: any) {
      console.error('Failed to load business data:', err);
      setDataError(err.message || 'Error loading records from business server');
    } finally {
      setIsLoadingData(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session, refreshData]);

  // Auth Functions
  const login = async (phone: string, pin: string) => {
    const auth = await ApiClient.login(phone, pin);
    setSession(auth);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    showToast(language === 'hi' ? 'कार्यक्षेत्र में सफल प्रवेश' : 'Logged into business workspace');
  };

  const logout = () => {
    if (session) {
      ApiClient.logout(session.token).catch(() => {});
    }
    setSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    showToast(language === 'hi' ? 'सफलतापूर्वक लॉगआउट हुआ' : 'Logged out');
  };

  const requestOtp = async (phone: string) => {
    return await ApiClient.requestWhatsAppOtp(phone);
  };

  const verifyOtp = async (phone: string, otp: string) => {
    const res = await ApiClient.verifyWhatsAppOtp(phone, otp);
    return res.success;
  };

  const toggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'hi' : 'en';
      if (session && profile) {
        ApiClient.updateProfile(session.user.businessId, session.token, { languagePref: next }, session.user.businessServerUrl).catch(() => {});
      }
      return next;
    });
  };

  // CRUD Operations
  const createLead = async (leadData: Partial<Lead>): Promise<Lead> => {
    if (!session) throw new Error('Not authenticated');
    const created = await ApiClient.createLead(session.user.businessId, session.token, leadData, session.user.businessServerUrl);
    await refreshData();
    showToast(language === 'hi' ? `नया लीड ${created.name} सुरक्षित हुआ` : `New lead ${created.name} added`);
    return created;
  };

  const updateLead = async (id: string, updates: Partial<Lead>): Promise<Lead> => {
    if (!session) throw new Error('Not authenticated');
    const updated = await ApiClient.updateLead(session.user.businessId, session.token, id, updates, session.user.businessServerUrl);
    await refreshData();
    showToast(language === 'hi' ? 'लीड विवरण अद्यतन हुआ' : 'Lead details updated');
    return updated;
  };

  const archiveLead = async (id: string, isArchived: boolean) => {
    if (!session) throw new Error('Not authenticated');
    await ApiClient.archiveLead(session.user.businessId, session.token, id, isArchived, session.user.businessServerUrl);
    await refreshData();
    showToast(isArchived 
      ? (language === 'hi' ? 'लीड आर्काइव में भेजा गया' : 'Lead archived')
      : (language === 'hi' ? 'लीड सक्रिय किया गया' : 'Lead unarchived'));
  };

  const deleteLead = async (id: string) => {
    if (!session) throw new Error('Not authenticated');
    await ApiClient.deleteLead(session.user.businessId, session.token, id, session.user.businessServerUrl);
    await refreshData();
    showToast(language === 'hi' ? 'लीड रिकॉर्ड हटाया गया' : 'Lead record deleted');
  };

  const convertLeadToCustomer = async (id: string, dealValue?: number, notes?: string): Promise<Customer> => {
    if (!session) throw new Error('Not authenticated');
    const customer = await ApiClient.convertLead(session.user.businessId, session.token, id, dealValue, notes, session.user.businessServerUrl);
    await refreshData();
    showToast(language === 'hi' ? `बधाई हो! ${customer.name} ग्राहक में परिवर्तित हुए` : `Congratulations! ${customer.name} converted to Customer`);
    return customer;
  };

  const scheduleFollowUp = async (data: Partial<FollowUp>): Promise<FollowUp> => {
    if (!session) throw new Error('Not authenticated');
    const flw = await ApiClient.scheduleFollowUp(session.user.businessId, session.token, data, session.user.businessServerUrl);
    await refreshData();
    showToast(language === 'hi' ? 'फॉलो-अप सफलतापूर्वक निर्धारित' : 'Follow-up scheduled successfully');
    return flw;
  };

  const completeFollowUp = async (id: string, notes?: string) => {
    if (!session) throw new Error('Not authenticated');
    await ApiClient.completeFollowUp(session.user.businessId, session.token, id, notes, session.user.businessServerUrl);
    await refreshData();
    showToast(language === 'hi' ? 'फॉलो-अप पूर्ण मार्क किया गया' : 'Follow-up marked completed');
  };

  const rescheduleFollowUp = async (id: string, date: string, time?: string) => {
    if (!session) throw new Error('Not authenticated');
    await ApiClient.rescheduleFollowUp(session.user.businessId, session.token, id, date, time, session.user.businessServerUrl);
    await refreshData();
    showToast(language === 'hi' ? 'फॉलो-अप तारीख बदली गई' : 'Follow-up rescheduled');
  };

  const updateProfile = async (updates: Partial<BusinessProfile>) => {
    if (!session) throw new Error('Not authenticated');
    const updated = await ApiClient.updateProfile(session.user.businessId, session.token, updates, session.user.businessServerUrl);
    setProfile(updated);
    showToast(language === 'hi' ? 'व्यापार प्रोफ़ाइल सुरक्षित हुई' : 'Business profile updated');
  };

  // Tutorial
  const startTutorial = () => {
    setTutorialStep(1);
    setIsTutorialOpen(true);
    setActiveTab('dashboard');
  };

  const nextTutorialStep = () => {
    if (tutorialStep >= 7) {
      setIsTutorialOpen(false);
      setTutorialStep(0);
      showToast(language === 'hi' ? 'टूर समाप्त हुआ! लीडफ्लो का उपयोग शुरू करें।' : 'Tour complete! Start using LeadFlow.');
      return;
    }
    const next = tutorialStep + 1;
    setTutorialStep(next);

    // Sync tab with step
    if (next === 1) setActiveTab('dashboard');
    if (next === 2 || next === 3) setActiveTab('leads');
    if (next === 4) setActiveTab('followups');
    if (next === 5) setActiveTab('customers');
    if (next === 6) setIsVoiceModalOpen(true);
    if (next === 7) {
      setIsVoiceModalOpen(false);
      setActiveTab('analytics');
    }
  };

  const prevTutorialStep = () => {
    if (tutorialStep <= 1) return;
    const prev = tutorialStep - 1;
    setTutorialStep(prev);

    if (prev === 1) setActiveTab('dashboard');
    if (prev === 2 || prev === 3) setActiveTab('leads');
    if (prev === 4) setActiveTab('followups');
    if (prev === 5) setActiveTab('customers');
    if (prev === 6) setIsVoiceModalOpen(true);
  };

  const skipTutorial = () => {
    setIsTutorialOpen(false);
    setTutorialStep(0);
  };

  return (
    <AppContext.Provider
      value={{
        session,
        isLoadingAuth,
        login,
        logout,
        requestOtp,
        verifyOtp,
        language,
        setLanguage,
        toggleLanguage,
        t,
        activeTab,
        setActiveTab,
        dashboard,
        leads,
        customers,
        followUps,
        analytics,
        profile,
        isLoadingData,
        dataError,
        refreshData,
        createLead,
        updateLead,
        archiveLead,
        deleteLead,
        convertLeadToCustomer,
        scheduleFollowUp,
        completeFollowUp,
        rescheduleFollowUp,
        updateProfile,
        isAddLeadModalOpen,
        setIsAddLeadModalOpen,
        isVoiceModalOpen,
        setIsVoiceModalOpen,
        followUpModalLead,
        setFollowUpModalLead,
        convertModalLead,
        setConvertModalLead,
        callModalLead,
        setCallModalLead,
        isTutorialOpen,
        tutorialStep,
        startTutorial,
        nextTutorialStep,
        prevTutorialStep,
        skipTutorial,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
