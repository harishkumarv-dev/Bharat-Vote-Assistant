import { GoogleGenAI } from '@google/genai';
import { analyzeMedicationSafety } from './medSafety.js';

/**
 * Live Google Gemini AI Engine with Direct Model Generation Validation,
 * dynamic model discovery, and zero false-negatives for valid API keys.
 */

export class AuraCareAIEngine {
  constructor() {
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GEMINI_API_KEY : '';
    this.apiKey = localStorage.getItem('AURACARE_GEMINI_API_KEY') || envKey || '';
    this.activeModel = localStorage.getItem('AURACARE_GEMINI_MODEL') || 'gemini-1.5-flash';
    this.availableModels = [];
    this.lastPromptPayload = '';
    this.lastError = null;
  }

  setApiKey(key) {
    this.apiKey = key ? key.trim() : '';
    this.availableModels = [];
    this.lastError = null;
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
   * Fetches available models for the given API Key directly from Google API
   */
  async discoverAvailableModels(cleanKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          const generateModels = data.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace(/^models\//, ''));

          if (generateModels.length > 0) {
            this.availableModels = generateModels;
            return { validKey: true, models: generateModels };
          }
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        let msg = errJson.error?.message || `HTTP ${response.status} Error`;
        if (msg.toLowerCase().includes('suspended')) {
          msg = "API Key Suspended by Google: This API key has been disabled in Google AI Studio. Please generate a new key at https://aistudio.google.com/app/apikey";
        }
        return { validKey: false, error: msg };
      }
    } catch (err) {
      console.warn("Error fetching Gemini models list:", err);
      return { validKey: false, error: err.message || "Network Error" };
    }
    return { validKey: false, error: "Unable to retrieve model list" };
  }

  /**
   * Tests the Gemini API Key live with zero false-negatives
   */
  async testConnection(testKey = this.apiKey) {
    if (!testKey || testKey.trim().length < 8) {
      return { success: false, message: "API key is empty or too short." };
    }

    const cleanKey = testKey.trim();
    this.lastError = null;

    // Direct generation test across standard models first
    const directCandidateModels = [
      this.activeModel,
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-8b',
      'gemini-pro'
    ];

    const uniqueCandidates = [...new Set(directCandidateModels)];

    for (const model of uniqueCandidates) {
      const genRes = await this.tryGenerateWithModel(cleanKey, model, "Hello! Confirm Gemini connection.");
      if (genRes.success) {
        this.setApiKey(cleanKey);
        this.activeModel = model;
        return {
          success: true,
          model: model,
          message: `Valid API Key! Connected to Google Gemini live using model ${model}.`
        };
      } else if (genRes.error) {
        this.lastError = genRes.error;
      }
    }

    // Try model discovery endpoint as fallback
    const discovery = await this.discoverAvailableModels(cleanKey);
    if (discovery.validKey && discovery.models.length > 0) {
      for (const discModel of discovery.models) {
        const altTest = await this.tryGenerateWithModel(cleanKey, discModel, "Hello! Confirm Gemini connection.");
        if (altTest.success) {
          this.setApiKey(cleanKey);
          this.activeModel = discModel;
          return {
            success: true,
            model: discModel,
            message: `Valid API Key! Connected to Google Gemini live using model ${discModel}.`
          };
        }
      }
    }

    const finalErrMsg = discovery.error || this.lastError || "Invalid API key or quota limit reached.";
    return {
      success: false,
      message: finalErrMsg
    };
  }

  async tryGenerateWithModel(cleanKey, modelName, textPrompt) {
    // Try REST first (fast & direct in browser)
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: textPrompt }] }] })
      });

      if (res.ok) {
        const data = await res.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (output) {
          return { success: true, text: output };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        let msg = errJson.error?.message || `HTTP ${res.status}`;
        if (msg.toLowerCase().includes('suspended')) {
          msg = "API Key Suspended by Google: This API key has been disabled in Google AI Studio. Please generate a new key at https://aistudio.google.com/app/apikey";
        }
        return { success: false, error: msg };
      }
    } catch (err) {
      console.warn(`REST call for ${modelName} error:`, err.message);
    }

    // Try SDK second
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: textPrompt
      });
      if (response && response.text) {
        return { success: true, text: response.text };
      }
    } catch (e) {
      console.warn(`SDK call for ${modelName} error:`, e.message);
    }

    return { success: false, error: "Generation failed" };
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
2. Cross-reference any queried drug/supplement against patient's active medications (${activeMeds?.map(m => m.name || m).join(', ')}).
3. Be concise, structured (bullet points, clear headings), and accessible.

[DYNAMIC USER QUERY]
"${userQuery}"
`;
    return this.lastPromptPayload;
  }

  async generateResponse(userQuery, profile, currentVitals, activeMeds) {
    const prompt = this.buildSystemContextPrompt(userQuery, profile, currentVitals, activeMeds);
    this.lastError = null;

    if (!this.apiKey || this.apiKey.trim().length < 8) {
      return {
        text: `🔑 **Google Gemini API Key Required**\n\n` +
              `To get real, live responses directly from Google Gemini AI, please enter your Gemini API Key.\n\n` +
              `👉 **How to get a key:**\n` +
              `1. Get a free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n` +
              `2. Click the **🔑 Gemini API** button in the top right header bar.\n` +
              `3. Paste your new key and click **Save Key**.\n\n` +
              `*(Note: You can also set \`VITE_GEMINI_API_KEY\` in your \`.env\` file).*`,
        source: 'System Guidance (API Key Needed)',
        timestamp: new Date().toLocaleTimeString(),
        promptUsed: prompt,
        isLiveApi: false,
        requiresKey: true
      };
    }

    const cleanKey = this.apiKey.trim();

    const candidateModels = [
      this.activeModel,
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash-8b',
      'gemini-pro'
    ];

    const uniqueModels = [...new Set(candidateModels)];

    for (const model of uniqueModels) {
      const res = await this.tryGenerateWithModel(cleanKey, model, prompt);
      if (res.success && res.text) {
        this.activeModel = model;
        return {
          text: res.text,
          source: `Google Gemini API (${model})`,
          timestamp: new Date().toLocaleTimeString(),
          promptUsed: prompt,
          isLiveApi: true
        };
      } else if (res.error) {
        this.lastError = res.error;
      }
    }

    // Return clear guidance if key is suspended or failed
    return {
      text: `⚠️ **Gemini API Key Error**\n\n` +
            `Google API returned error: *${this.lastError || "API Key Suspended or Invalid"}*\n\n` +
            `👉 **Solution:**\n` +
            `1. Get a new free key at [Google AI Studio](https://aistudio.google.com/app/apikey).\n` +
            `2. Click **🔑 Gemini API** in the top header bar, paste your new key, and click **Save Key**.`,
      source: `Gemini API Error (${this.lastError || 'Key Suspended'})`,
      timestamp: new Date().toLocaleTimeString(),
      promptUsed: prompt,
      isLiveApi: false,
      apiError: this.lastError
    };
  }
}
