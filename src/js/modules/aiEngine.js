import { GoogleGenAI } from '@google/genai';
import { analyzeMedicationSafety } from './medSafety.js';

/**
 * Live Google Gemini AI Engine using official @google/genai SDK
 * with automatic model selection and clear API Key guidance.
 */

export class AuraCareAIEngine {
  constructor() {
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GEMINI_API_KEY : '';
    this.apiKey = localStorage.getItem('AURACARE_GEMINI_API_KEY') || envKey || '';
    this.activeModel = localStorage.getItem('AURACARE_GEMINI_MODEL') || 'gemini-2.5-flash';
    this.lastPromptPayload = '';
    this.lastError = null;
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
    localStorage.setItem('AURACARE_GEMINI_API_KEY', this.apiKey);
  }

  getApiKey() {
    return this.apiKey;
  }

  setModel(modelName) {
    this.activeModel = modelName;
    localStorage.setItem('AURACARE_GEMINI_MODEL', modelName);
  }

  getModel() {
    return this.activeModel;
  }

  getLastError() {
    return this.lastError;
  }

  getLastPromptPayload() {
    return this.lastPromptPayload;
  }

  /**
   * Tests the Gemini API Key live using @google/genai SDK & fetch
   */
  async testConnection(testKey = this.apiKey) {
    if (!testKey || testKey.trim().length < 10) {
      return { success: false, message: "API key is empty or too short." };
    }

    const cleanKey = testKey.trim();
    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

    for (const model of candidateModels) {
      try {
        const ai = new GoogleGenAI({ apiKey: cleanKey });
        const response = await ai.models.generateContent({
          model: model,
          contents: "Hello! Confirm Gemini connection."
        });

        if (response && response.text) {
          this.activeModel = model;
          this.setApiKey(cleanKey);
          return { success: true, model, message: `Successfully connected to Google Gemini (${model})!` };
        }
      } catch (err) {
        console.warn(`SDK Test for ${model} failed, testing REST endpoint:`, err.message);
        
        // Direct REST Fallback Test
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              this.activeModel = model;
              this.setApiKey(cleanKey);
              return { success: true, model, message: `Successfully connected to Google Gemini (${model})!` };
            }
          }
        } catch (fetchErr) {
          console.warn(`REST Test for ${model} failed:`, fetchErr);
        }
      }
    }

    return { 
      success: false, 
      message: "Invalid API key or network error. Please verify your API Key from Google AI Studio (https://aistudio.google.com/app/apikey)." 
    };
  }

  /**
   * Builds the System Persona & Contextual Prompt Payload
   */
  buildSystemContextPrompt(userQuery, profile, currentVitals, activeMeds) {
    const medAnalysis = analyzeMedicationSafety(activeMeds, "", profile?.allergies || []);
    
    this.lastPromptPayload = `
[SYSTEM PERSONA: AURACARE CLINICAL AI ASSISTANT]
You are AuraCare AI, an advanced healthcare and wellness assistant powered by Google Gemini. Your role is to provide empathetic, evidence-based, context-aware health insights, triage guidance, and lifestyle optimization. You NEVER provide definitive medical diagnoses, but perform structured clinical triage, risk evaluation, and drug interaction safety checks.

[ACTIVE PATIENT CONTEXT INJECTED REAL-TIME]
- Patient Name: ${profile?.name || 'User'}
- Age: ${profile?.age || 'N/A'}, Gender: ${profile?.gender || 'N/A'}
- Medical Conditions: ${profile?.conditions?.join(', ') || 'None reported'}
- Active Medications: ${activeMeds?.map(m => typeof m === 'string' ? m : `${m.name} (${m.dosage})`).join(', ') || 'None'}
- Documented Allergies: ${profile?.allergies?.join(', ') || 'None'}
- Current Vitals: BP ${currentVitals?.bloodPressureSys || 120}/${currentVitals?.bloodPressureDia || 80} mmHg, HR ${currentVitals?.heartRate || 72} bpm, SpO2 ${currentVitals?.spO2 || 98}%, Glucose ${currentVitals?.glucose || 95} mg/dL
- Dietary Preference: ${profile?.dietaryPreference || 'General'}
- Medication Safety Status: ${medAnalysis.safetyStatus}

[CLINICAL SAFETY MANDATES]
1. If the query indicates RED FLAG symptoms (crushing chest pain, stroke signs, severe dyspnea, anaphylaxis), IMMEDIATELY begin response with an EMERGENCY ALERT banner.
2. Cross-reference any queried drug/supplement against patient's active medications (${activeMeds?.map(m => m.name || m).join(', ')}) and allergies (${profile?.allergies?.join(', ')}).
3. Be concise, structured (bullet points, clear headings), and accessible.

[DYNAMIC USER QUERY]
"${userQuery}"
`;
    return this.lastPromptPayload;
  }

  async generateResponse(userQuery, profile, currentVitals, activeMeds) {
    const prompt = this.buildSystemContextPrompt(userQuery, profile, currentVitals, activeMeds);
    this.lastError = null;

    // Check if API key is present
    if (!this.apiKey || this.apiKey.trim().length < 10) {
      return {
        text: `🔑 **Google Gemini API Key Required**\n\n` +
              `To get real, live responses directly from Google Gemini AI, please enter your Gemini API Key.\n\n` +
              `👉 **How to get a key:**\n` +
              `1. Get a free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n` +
              `2. Click the **🔑 Gemini API** button in the top right header bar.\n` +
              `3. Paste your key and click **Save Key**.\n\n` +
              `*(Note: You can also set \`VITE_GEMINI_API_KEY\` in your \`.env\` file).*`,
        source: 'System Guidance (API Key Needed)',
        timestamp: new Date().toLocaleTimeString(),
        promptUsed: prompt,
        isLiveApi: false,
        requiresKey: true
      };
    }

    const cleanKey = this.apiKey.trim();
    const candidateModels = [this.activeModel, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

    // 1. Try official @google/genai SDK
    for (const model of candidateModels) {
      try {
        const ai = new GoogleGenAI({ apiKey: cleanKey });
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt
        });

        if (response && response.text) {
          this.activeModel = model;
          return {
            text: response.text,
            source: `Google Gemini API (${model})`,
            timestamp: new Date().toLocaleTimeString(),
            promptUsed: prompt,
            isLiveApi: true
          };
        }
      } catch (sdkErr) {
        console.warn(`SDK call with model ${model} failed:`, sdkErr.message);
        this.lastError = sdkErr.message;
      }
    }

    // 2. Direct REST Fallback if SDK had an issue
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            this.activeModel = model;
            return {
              text,
              source: `Google Gemini REST API (${model})`,
              timestamp: new Date().toLocaleTimeString(),
              promptUsed: prompt,
              isLiveApi: true
            };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          this.lastError = errJson?.error?.message || `HTTP ${response.status} Error`;
        }
      } catch (fetchErr) {
        console.warn(`REST call with model ${model} failed:`, fetchErr.message);
        this.lastError = fetchErr.message;
      }
    }

    // Return detailed error if API call failed
    return {
      text: `⚠️ **Gemini API Call Failed**\n\n` +
            `Error message: *${this.lastError || "Invalid API key or network block"}*\n\n` +
            `Please click **🔑 Gemini API** at the top right to re-enter a valid API key from [Google AI Studio](https://aistudio.google.com/app/apikey).`,
      source: `Gemini API Error (${this.lastError || 'Network/Key Error'})`,
      timestamp: new Date().toLocaleTimeString(),
      promptUsed: prompt,
      isLiveApi: false,
      apiError: this.lastError
    };
  }
}
