import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ApiClient } from '../api/client';
import { ExtractedVoiceLead } from '../types';
import { 
  X, 
  Mic, 
  MicOff, 
  Sparkles, 
  Check, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  FileText, 
  IndianRupee, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export const VoiceAssistantModal: React.FC = () => {
  const { 
    session,
    isVoiceModalOpen, 
    setIsVoiceModalOpen, 
    language, 
    t, 
    createLead, 
    scheduleFollowUp,
    showToast 
  } = useApp();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedVoiceLead | null>(null);
  const [voiceLang, setVoiceLang] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isVoiceModalOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setTranscript('');
      setExtractedData(null);
      setSpeechError(null);
    }
  }, [isVoiceModalOpen]);

  if (!isVoiceModalOpen) return null;

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        language === 'hi' 
          ? 'आपके ब्राउज़र में वेब स्पीच एपीआई समर्थित नहीं है। कृपया नीचे वाक्य टाइप करें।'
          : 'Web Speech recognition not natively supported in this browser. Please type or paste your spoken prompt below.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError(t.voice.audioPermissionHint);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSpeechError(err.message || 'Microphone activation failed');
      setIsListening(false);
    }
  };

  const handleExtract = async () => {
    if (!transcript.trim()) {
      showToast(language === 'hi' ? 'कृपया पहले कुछ बोलें या वाक्य लिखें' : 'Please speak or enter text first');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsProcessing(true);
    setSpeechError(null);

    try {
      const extracted = await ApiClient.extractVoiceLead(
        transcript,
        session?.user.businessId || 'biz_sharma_enterprises',
        session?.token,
        session?.user.businessServerUrl
      );
      setExtractedData(extracted);
    } catch (err: any) {
      setSpeechError(err.message || 'Failed to extract lead details from voice transcript');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedData) return;

    try {
      // 1. Create Lead in business database
      const newLead = await createLead({
        name: extractedData.name,
        phone: extractedData.phone || '+91 98200 00000',
        requirement: extractedData.requirement,
        budget: extractedData.budget || 0,
        source: extractedData.source || 'Voice Assistant',
        priority: extractedData.priority || 'High',
        status: 'Follow-up',
        notes: extractedData.notes,
      });

      // 2. Schedule Follow-up in business database
      if (extractedData.followUpDate) {
        await scheduleFollowUp({
          leadId: newLead.id,
          contactName: newLead.name,
          contactPhone: newLead.phone,
          title: `Callback for ${newLead.requirement.substring(0, 40)}`,
          dueDate: extractedData.followUpDate,
          dueTime: extractedData.followUpTime || '11:00 AM',
          priority: extractedData.priority === 'High' ? 'high' : 'medium',
          notes: `Created via Voice Assistant: ${transcript}`,
        });
      }

      showToast(
        language === 'hi' 
          ? `वॉइस लीड "${newLead.name}" एवं फॉलो-अप सुरक्षित हो गया!` 
          : `Voice lead "${newLead.name}" and follow-up saved!`
      );
      setIsVoiceModalOpen(false);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handlePresetExample = (exampleText: string) => {
    setTranscript(exampleText);
    setSpeechError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] bg-gradient-to-r from-[#F5F3FF] to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#7C3AED] text-white flex items-center justify-center shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                {t.voice.modalTitle}
              </h2>
              <p className="text-xs text-[#64748B]">
                {t.voice.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVoiceModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {/* Language Selection & Mic Controller */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#475569]">
                {language === 'hi' ? 'बोलने की भाषा:' : 'Speech Language:'}
              </span>
              <button
                type="button"
                onClick={() => setVoiceLang('hi-IN')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  voiceLang === 'hi-IN' ? 'bg-[#7C3AED] text-white shadow-2xs' : 'bg-[#F1F5F9] text-[#475569]'
                }`}
              >
                हिन्दी (Hindi)
              </button>
              <button
                type="button"
                onClick={() => setVoiceLang('en-IN')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  voiceLang === 'en-IN' ? 'bg-[#7C3AED] text-white shadow-2xs' : 'bg-[#F1F5F9] text-[#475569]'
                }`}
              >
                English (India)
              </button>
            </div>

            <span className="text-[11px] text-[#7C3AED] font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {language === 'hi' ? 'लोकल वॉइस इंजन' : 'Local NLP Engine'}
            </span>
          </div>

          {/* Voice Mic Pulse Button */}
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <button
              onClick={toggleListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-md active:scale-95 ${
                isListening
                  ? 'bg-[#DC2626] ring-8 ring-[#DC2626]/20 animate-pulse'
                  : 'bg-[#7C3AED] hover:bg-[#6D28D9] ring-4 ring-[#7C3AED]/20'
              }`}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <div className="text-center">
              <span className="text-xs font-bold text-[#0F172A] block">
                {isListening ? t.voice.listening : t.voice.speakNow}
              </span>
              <span className="text-[11px] text-[#64748B]">
                {isListening ? (language === 'hi' ? 'बोलना समाप्त करने पर पुनः क्लिक करें' : 'Tap again to stop recording') : (language === 'hi' ? 'स्पष्ट आवाज में अपना वाक्य बोलें' : 'Click microphone to record your voice')}
              </span>
            </div>
          </div>

          {/* Live Transcript / Input Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#334155]">
                {language === 'hi' ? 'रिकॉर्ड किया गया वाक्य / इनपुट:' : 'Spoken Voice Transcript / Input:'}
              </label>
              <span className="text-[11px] text-[#64748B]">
                {t.voice.manualInputToggle}
              </span>
            </div>
            <textarea
              rows={3}
              placeholder={t.voice.inputPlaceholder}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-[#E2E8F0] rounded-lg bg-white text-[#0F172A] outline-hidden focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/10 resize-none font-sans"
            />
          </div>

          {/* Quick Preset Prompts */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-[#64748B] block">
              {language === 'hi' ? 'परीक्षण हेतु त्वरित उदाहरण:' : 'Try clicking sample voice prompt:'}
            </span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handlePresetExample('राहुल पटेल का नया लीड जोड़ो। उसे कल सुबह 11 बजे फोन करना है। उसे तीन BHK फ्लैट चाहिए।')}
                className="px-2.5 py-1 rounded bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#6D28D9] text-[11px] font-medium border border-[#DDD6FE] text-left"
              >
                "राहुल पटेल का नया लीड जोड़ो। उसे कल सुबह 11 बजे फोन करना है। उसे तीन BHK फ्लैट चाहिए।"
              </button>
              <button
                type="button"
                onClick={() => handlePresetExample('Add a lead for Amit Sharma, needs 500 meters of industrial copper wiring, call tomorrow at 2 PM')}
                className="px-2.5 py-1 rounded bg-[#F8FAFC] hover:bg-[#E2E8F0] text-[#334155] text-[11px] font-medium border border-[#E2E8F0] text-left"
              >
                "Add a lead for Amit Sharma, needs 500 meters of industrial copper wiring, call tomorrow at 2 PM"
              </button>
            </div>
          </div>

          {speechError && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {/* Extract Button */}
          {!extractedData && (
            <button
              type="button"
              disabled={isProcessing || !transcript.trim()}
              onClick={handleExtract}
              className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-slate-300 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? t.voice.processing : (language === 'hi' ? 'एआई द्वारा जानकारी निकालें' : 'Extract Structured Lead with AI')}</span>
            </button>
          )}

          {/* Extracted Details Preview & Edit Form (Safety constraint: User reviews & edits before confirm) */}
          {extractedData && (
            <form onSubmit={handleConfirmAndSave} className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#BBF7D0]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#166534] flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.voice.extractedTitle}</span>
                </h3>
                <span className="text-[11px] text-[#15803D] font-mono font-semibold">
                  {Math.round(extractedData.confidence * 100)}% Confidence
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#166534] mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={extractedData.name}
                    onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#BBF7D0] rounded bg-white text-[#0F172A] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#166534] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={extractedData.phone}
                    onChange={(e) => setExtractedData({ ...extractedData, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#BBF7D0] rounded bg-white text-[#0F172A] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#166534] mb-1">Requirement / Enquiry *</label>
                <input
                  type="text"
                  required
                  value={extractedData.requirement}
                  onChange={(e) => setExtractedData({ ...extractedData, requirement: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[#BBF7D0] rounded bg-white text-[#0F172A] font-medium text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#166534] mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    required
                    value={extractedData.followUpDate}
                    onChange={(e) => setExtractedData({ ...extractedData, followUpDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#BBF7D0] rounded bg-white text-[#0F172A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#166534] mb-1">Follow-up Time</label>
                  <input
                    type="text"
                    value={extractedData.followUpTime}
                    onChange={(e) => setExtractedData({ ...extractedData, followUpTime: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-[#BBF7D0] rounded bg-white text-[#0F172A]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExtractedData(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#475569] border border-[#CBD5E1] bg-white rounded-lg hover:bg-[#F8FAFC]"
                >
                  {language === 'hi' ? 'पुनः बोलें' : 'Re-record'}
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.voice.confirmSave}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
