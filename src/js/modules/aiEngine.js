import { GoogleGenAI } from '@google/genai';
import { analyzeMedicationSafety } from './medSafety.js';

/**
 * Live Google Gemini AI Engine with Dynamic Model Auto-Discovery,
 * clear key suspension detection, and smooth fallback management.
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
          msg = "This Google API Key has been suspended or disabled in Google AI Studio / Google Cloud. Please generate a new key at https://aistudio.google.com/app/apikey";
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
   * Tests the Gemini API Key live and auto-selects the newest working model
   */
  async testConnection(testKey = this.apiKey) {
    if (!testKey || testKey.trim().length < 8) {
      return { success: false, message: "API key is empty or too short." };
    }

    const cleanKey = testKey.trim();

    // 1. Discover models available for this API Key
    const discovery = await this.discoverAvailableModels(cleanKey);

    if (discovery.validKey && discovery.models.length > 0) {
      const priorityOrder = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-2.5-flash',
        'gemini-1.5-pro',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash-8b',
        'gemini-pro'
      ];

      let chosenModel = discovery.models.find(m => priorityOrder.includes(m)) || discovery.models[0];

      const testResult = await this.tryGenerateWithModel(cleanKey, chosenModel, "Hello! Confirm Gemini API connection.");
      if (testResult.success) {
        this.activeModel = chosenModel;
        this.setApiKey(cleanKey);
        return { 
          success: true, 
          model: chosenModel, 
          message: `Valid API Key! Connected to Google Gemini using model ${chosenModel}.` 
        };
      }

      for (const altModel of discovery.models) {
        if (altModel === chosenModel) continue;
        const altTest = await this.tryGenerateWithModel(cleanKey, altModel, "Hello! Confirm Gemini API connection.");
        if (altTest.success) {
          this.activeModel = altModel;
          this.setApiKey(cleanKey);
          return { 
            success: true, 
            model: altModel, 
            message: `Valid API Key! Connected to Google Gemini using model ${altModel}.` 
          };
        }
      }
    }

    return { 
      success: false, 
      message: discovery.error 
        ? `API Key Validation Failed: ${discovery.error}` 
        : "Invalid API Key or quota limit reached. Please verify your key at https://aistudio.google.com/app/apikey." 
    };
  }

  async tryGenerateWithModel(cleanKey, modelName, textPrompt) {
    // Try SDK first
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
      console.warn(`SDK call for ${modelName} failed:`, e.message);
    }

    // Try REST second
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
          msg = "API key suspended by Google. Create a new key at https://aistudio.google.com/app/apikey";
        }
        return { success: false, error: msg };
      }
    } catch (err) {
      return { success: false, error: err.message };
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

    if (this.availableModels.length === 0) {
      const disc = await this.discoverAvailableModels(cleanKey);
      if (disc.validKey && disc.models.length > 0) {
        if (!disc.models.includes(this.activeModel)) {
          this.activeModel = disc.models[0];
        }
      } else if (disc.error) {
        this.lastError = disc.error;
      }
    }

    const modelsToTry = [
      this.activeModel,
      ...this.availableModels,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-lite',
      'gemini-pro'
    ];

    const uniqueModels = [...new Set(modelsToTry)];

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
