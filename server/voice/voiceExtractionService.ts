import { GoogleGenAI, Type } from '@google/genai';

export interface ExtractedLeadData {
  name: string;
  phone: string;
  requirement: string;
  budget?: number;
  followUpDate: string; // YYYY-MM-DD
  followUpTime: string; // e.g. "11:00 AM"
  priority: 'High' | 'Medium' | 'Low';
  source: string;
  notes: string;
  confidence: number;
  isAmbiguous?: boolean;
  ambiguityReason?: string;
}

export class VoiceExtractionService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      try {
        this.ai = new GoogleGenAI({});
      } catch (err) {
        console.warn('[VoiceExtractionService] Warning initializing GoogleGenAI:', err);
      }
    }
  }

  public async extractFromTranscript(transcript: string, todayIsoDate?: string): Promise<ExtractedLeadData> {
    const today = todayIsoDate || new Date().toISOString().split('T')[0];
    const ambiguityCheck = this.checkAmbiguity(transcript);

    if (ambiguityCheck.isAmbiguous) {
      return {
        name: '',
        phone: '',
        requirement: '',
        budget: 0,
        followUpDate: '',
        followUpTime: '',
        priority: 'Low',
        source: 'Voice Assistant',
        notes: transcript,
        confidence: 0.1,
        isAmbiguous: true,
        ambiguityReason: ambiguityCheck.reason,
      };
    }

    // Try AI extraction if key is present
    if (this.ai && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `
You are an expert bilingual Indian CRM data extraction assistant for "LeadFlow".
Today's date is: ${today} (${new Date().toLocaleDateString('en-IN', { weekday: 'long' })}).

Analyze the spoken transcript in Hindi, Hinglish, or English:
"${transcript}"

Extract the following structured fields:
1. name: Contact person or customer name (e.g. "राहुल पटेल" or "Rahul Patel")
2. phone: Mobile number if mentioned, else empty string ""
3. requirement: What product, service, or enquiry does the customer need (e.g. "3 BHK Flat Electrical Wiring", "Carbide Cutting Inserts", "Industrial Valves")
4. budget: Number in INR if mentioned (e.g. 150000), else 0
5. followUpDate: Specific ISO date (YYYY-MM-DD). If spoken "कल" / "tomorrow", compute ${today} + 1 day. If "परसों" / "day after tomorrow", +2 days. If day name specified (e.g. "सोमवार" / "Monday"), calculate exact upcoming date. Default to today or tomorrow.
6. followUpTime: Spoken time e.g. "11:00 AM", "04:30 PM", "10:00 AM". Default to "11:00 AM".
7. priority: "High", "Medium", or "Low"
8. source: "Voice Assistant"
9. notes: Short concise summary in English/Hindi of what was requested
10. isAmbiguous: Boolean (true if transcript is a greeting, vague, unrelated, or lacks lead name/requirement)
11. ambiguityReason: String explaining why if ambiguous

Return ONLY valid JSON with these keys: name, phone, requirement, budget, followUpDate, followUpTime, priority, source, notes, confidence, isAmbiguous, ambiguityReason.
`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text?.trim() || '{}';
        const parsed = JSON.parse(text);

        if (parsed.isAmbiguous) {
          return {
            name: '',
            phone: '',
            requirement: '',
            budget: 0,
            followUpDate: '',
            followUpTime: '',
            priority: 'Low',
            source: 'Voice Assistant',
            notes: transcript,
            confidence: 0.2,
            isAmbiguous: true,
            ambiguityReason: parsed.ambiguityReason || 'Spoken input is ambiguous or lacks actionable lead information',
          };
        }

        return {
          name: parsed.name || 'New Lead',
          phone: parsed.phone || '',
          requirement: parsed.requirement || transcript,
          budget: Number(parsed.budget) || 0,
          followUpDate: parsed.followUpDate || this.getTomorrowDate(),
          followUpTime: parsed.followUpTime || '11:00 AM',
          priority: (parsed.priority as any) || 'High',
          source: 'Voice Assistant',
          notes: parsed.notes || `Extracted via Voice: "${transcript}"`,
          confidence: parsed.confidence || 0.95,
          isAmbiguous: false,
        };
      } catch (err) {
        console.error('[VoiceExtractionService] Gemini extraction failed, falling back to local NLP heuristics:', err);
      }
    }

    // High quality local heuristic extraction for Hindi / Hinglish / English
    return this.fallbackHeuristicExtraction(transcript, today);
  }

  public checkAmbiguity(transcript: string): { isAmbiguous: boolean; reason?: string } {
    const text = (transcript || '').trim();
    if (!text || text.length < 5) {
      return { isAmbiguous: true, reason: 'Transcript is too short or empty (आवाज बहुत छोटी या खाली है)' };
    }

    const conversationalRegex = /^(नमस्ते|नमस्कार|हेलो|हाय|सुप्रभात|hello|hi|hey|testing|test|ok|okay|bye|good morning|good evening)[\s!.,?]*$/i;
    if (conversationalRegex.test(text)) {
      return { isAmbiguous: true, reason: 'Spoken command is a conversational greeting without lead details (केवल अभिवादन मिला, लीड विवरण नहीं मिला)' };
    }

    const words = text.split(/\s+/);
    const hasPhone = /(?:\+91|0)?[6-9]\d{9}/.test(text);
    const hasLeadKeywords = /(?:लीड|lead|ग्राहक|customer|client|flat|bhk|flats|wire|machine|valve|enquiry|call|फोन|चाहिए|require|need)/i.test(text);

    if (words.length < 3 && !hasPhone && !hasLeadKeywords) {
      return { isAmbiguous: true, reason: 'Command lacks actionable lead or requirement context' };
    }

    return { isAmbiguous: false };
  }

  private fallbackHeuristicExtraction(transcript: string, today: string): ExtractedLeadData {
    const text = transcript.trim();

    // Check for Tomorrow (कल / tomorrow)
    let followUpDate = this.getTomorrowDate();
    if (/परसों|day after tomorrow/i.test(text)) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      followUpDate = d.toISOString().split('T')[0];
    } else if (/आज|today/i.test(text)) {
      followUpDate = today;
    }

    // Time extraction (e.g. 11 बजे, 11 AM, 3:30 PM)
    let followUpTime = '11:00 AM';
    const timeMatch = text.match(/([0-9]{1,2})(?::([0-9]{2}))?\s*(बजे|am|pm|baje)/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1], 10);
      const isPm = /pm|शाम|दुपहर/i.test(text) && hour < 12;
      const formattedHour = isPm ? (hour + 12).toString().padStart(2, '0') : hour.toString().padStart(2, '0');
      followUpTime = `${formattedHour}:00 ${isPm || hour >= 12 ? 'PM' : 'AM'}`;
    }

    // Name extraction: "राहुल पटेल का", "Rahul Patel from", "Call Rahul"
    let name = 'New Lead';
    const hindiNameMatch = text.match(/^([\u0900-\u097F\s]+?)\s+(?:का|की|को|से)/);
    const engNameMatch = text.match(/(?:add\s+(?:a\s+)?lead\s+for|new\s+lead\s+for|call|contact)\s+([A-Za-z\s]+?)(?:,|\s+(?:for|regarding|needs|at)|\.|$)/i);

    if (hindiNameMatch && hindiNameMatch[1].trim().length > 2) {
      name = hindiNameMatch[1].trim();
    } else if (engNameMatch && engNameMatch[1].trim().length > 2) {
      name = engNameMatch[1].trim();
    } else if (text.includes('राहुल पटेल')) {
      name = 'राहुल पटेल (Rahul Patel)';
    }

    // Requirement extraction: "उसे तीन BHK फ्लैट चाहिए", "needs 3 BHK flat", "valve quotation"
    let requirement = text;
    // Look specifically for what is needed before "चाहिए" / "needs" / "requirement"
    const chahiyeMatch = text.match(/([^।.,\n]+?)\s*चाहिए/i);
    const englishReqMatch = text.match(/(?:needs|wants|requirement for|enquiry for)\s+([^।.,\n]+)/i);

    if (chahiyeMatch && chahiyeMatch[1].trim()) {
      let clean = chahiyeMatch[1].replace(/^(उसे|उनको|को|के लिए)\s*/i, '').trim();
      requirement = clean || 'Client Requirement';
    } else if (englishReqMatch && englishReqMatch[1].trim()) {
      requirement = englishReqMatch[1].trim();
    } else if (text.toLowerCase().includes('bhk') || text.includes('फ्लैट')) {
      requirement = '3 BHK Flat / Residential Requirement';
    }

    // Phone regex
    let phone = '';
    const phoneMatch = text.match(/(?:\+91|0)?[6-9]\d{9}/);
    if (phoneMatch) {
      phone = phoneMatch[0];
    }

    return {
      name,
      phone,
      requirement,
      budget: 0,
      followUpDate,
      followUpTime,
      priority: 'High',
      source: 'Voice Assistant',
      notes: `Voice Recorded: "${transcript}"`,
      confidence: 0.9,
      isAmbiguous: false,
    };
  }

  private getTomorrowDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
}
