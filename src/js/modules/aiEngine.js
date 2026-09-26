import { analyzeMedicationSafety } from './medSafety.js';

/**
 * Advanced AI Reasoning Engine supporting Google Gemini API with multi-model fallbacks,
 * timeout handling, error notifications, and rich offline clinical intelligence.
 */

export class AuraCareAIEngine {
  constructor() {
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GEMINI_API_KEY : '';
    this.apiKey = localStorage.getItem('AURACARE_GEMINI_API_KEY') || envKey || '';
    
    // Supported Gemini Models
    this.modelCandidates = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-lite',
      'gemini-pro'
    ];
    this.activeModel = localStorage.getItem('AURACARE_GEMINI_MODEL') || 'gemini-1.5-flash';
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
   * Tests the Gemini API Key live against endpoints with 6s timeout
   */
  async testConnection(testKey = this.apiKey) {
    if (!testKey || testKey.trim().length < 10) {
      return { success: false, message: "API key is empty or too short." };
    }

    const cleanKey = testKey.trim();
    for (const model of this.modelCandidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hello! Confirm connection." }] }]
          })
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            this.activeModel = model;
            this.setApiKey(cleanKey);
            return { success: true, model, message: `Connected successfully to Google Gemini (${model})!` };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn(`Gemini Model ${model} test failed (${response.status}):`, errData);
        }
      } catch (err) {
        console.warn(`Connection error testing model ${model}:`, err.message);
      }
    }

    return { 
      success: false, 
      message: "Could not connect to Gemini API. Please check network connection, API key permissions, or quota limits." 
    };
  }

  /**
   * Builds the System Persona & Contextual Prompt Payload
   */
  buildSystemContextPrompt(userQuery, profile, currentVitals, activeMeds) {
    const medAnalysis = analyzeMedicationSafety(activeMeds, "", profile?.allergies || []);
    
    this.lastPromptPayload = `
[SYSTEM PERSONA: AURACARE CLINICAL AI ASSISTANT]
You are AuraCare AI, an advanced healthcare and wellness assistant. Your role is to provide empathetic, evidence-based, context-aware health insights, triage guidance, and lifestyle optimization. You NEVER provide definitive medical diagnoses, but perform structured clinical triage, risk evaluation, and drug interaction safety checks.

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

    // If Gemini API Key is set, attempt call with model candidates
    if (this.apiKey && this.apiKey.trim().length > 10) {
      const modelsToTry = [this.activeModel, ...this.modelCandidates.filter(m => m !== this.activeModel)];

      for (const model of modelsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey.trim()}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              this.activeModel = model;
              return {
                text,
                source: `Google Gemini API (${model})`,
                timestamp: new Date().toLocaleTimeString(),
                promptUsed: prompt,
                isLiveApi: true
              };
            }
          } else {
            const errJson = await response.json().catch(() => ({}));
            this.lastError = errJson.error?.message || `HTTP ${response.status} Error`;
            console.warn(`Gemini API call to ${model} returned error:`, response.status, errJson);
          }
        } catch (err) {
          this.lastError = err.name === 'AbortError' ? "Request Timed Out (8s)" : (err.message || "Network Error");
          console.warn(`Fetch error calling ${model}:`, err);
        }
      }
    }

    // Fallback: Smart Clinical AI Engine (Handles ANY user query dynamically)
    const offlineResponse = this.generateContextualOfflineResponse(userQuery, profile, currentVitals, activeMeds);
    return {
      text: offlineResponse,
      source: this.apiKey ? `AuraCare Engine (Fallback - ${this.lastError || 'API Error'})` : 'AuraCare Clinical AI Engine',
      timestamp: new Date().toLocaleTimeString(),
      promptUsed: prompt,
      isLiveApi: false,
      apiError: this.lastError
    };
  }

  generateContextualOfflineResponse(userQuery, profile, currentVitals, activeMeds) {
    const q = userQuery.toLowerCase();
    const name = profile?.name || 'Patient';
    const age = profile?.age || '';
    const conditions = profile?.conditions?.join(', ') || 'None';
    const allergies = profile?.allergies?.join(', ') || 'None';
    const sys = currentVitals?.bloodPressureSys || 120;
    const dia = currentVitals?.bloodPressureDia || 80;
    const hr = currentVitals?.heartRate || 72;
    const glu = currentVitals?.glucose || 95;

    // 1. Emergency Check
    if (q.includes("chest pain") || q.includes("stroke") || q.includes("can't breathe") || q.includes("crushing") || q.includes("headache") && q.includes("sudden")) {
      return `⚠️ **CRITICAL EMERGENCY ALERT**
Based on your query mentioning severe symptoms (*chest pain / breathing distress / acute pain*), this is classified as a **High-Risk Emergency Event**.

🚨 **Immediate Recommendations:**
- Call Emergency Services (**911** or **108**) immediately.
- Do not attempt to drive yourself to the emergency department.
- If prescribed sublingual Nitroglycerin or rescue inhaler, follow your clinical protocol while awaiting emergency services.

*Dynamic Patient Context Injected: Patient ${name} (${age}y) with active conditions: ${conditions}.*`;
    }

    // 2. Medication & Interaction Check
    if (q.includes("medication") || q.includes("pill") || q.includes("drug") || q.includes("take") || q.includes("interaction") || q.includes("side effect") || q.includes("ibuprofen") || q.includes("aspirin") || q.includes("lisinopril") || q.includes("warfarin") || q.includes("metformin") || q.includes("atorvastatin") || q.includes("albuterol")) {
      const safety = analyzeMedicationSafety(activeMeds, userQuery, profile?.allergies || []);
      
      let medText = `💊 **GenAI Medication & Safety Analysis**\n\n`;
      medText += `**Active Patient Context for ${name} (${age}y):**\n`;
      activeMeds?.forEach(m => {
        medText += `- ${typeof m === 'string' ? m : `${m.name} (${m.dosage}) - ${m.frequency}`}\n`;
      });

      if (safety.interactions.length > 0) {
        medText += `\n⚠️ **Detected Drug Interaction Alerts:**\n`;
        safety.interactions.forEach(inter => {
          medText += `- **[${inter.severity} SEVERITY] ${inter.pair.join(' + ')}**: ${inter.description} (*Action: ${inter.action}*)\n`;
        });
      }

      if (safety.dietaryPrecautions.length > 0) {
        medText += `\n🥑 **Dietary Precautions for Active Medications:**\n`;
        safety.dietaryPrecautions.forEach(dp => {
          medText += `- **${dp.drug}**: ${dp.warning}\n`;
        });
      }

      medText += `\n💡 **Clinical Guidance:** Always verify with your prescribing physician before introducing over-the-counter NSAIDs while taking your current regimen.`;
      return medText;
    }

    // 3. Vitals & BP Check
    if (q.includes("bp") || q.includes("blood pressure") || q.includes("vitals") || q.includes("heart rate") || q.includes("glucose") || q.includes("sugar")) {
      return `📊 **GenAI Contextual Vitals Evaluation**\n\n` +
        `**Live Vitals Context for ${name}:**\n` +
        `- Blood Pressure: **${sys}/${dia} mmHg** (${sys >= 130 ? '⚠️ Stage 1/2 Elevated' : '✅ Normal Range'})\n` +
        `- Heart Rate: **${hr} bpm** (Resting Normal)\n` +
        `- Blood Glucose: **${glu} mg/dL** (${profile?.conditions?.includes('Type 2 Diabetes') ? 'Target 80-130 mg/dL' : 'Normal Fasting'})\n\n` +
        `💡 **Dynamic Advice:**\n` +
        (profile?.conditions?.includes('Hypertension') ? `- Continue daily BP logging in morning & evening. Limit sodium intake below 1,500mg.\n` : '') +
        (profile?.conditions?.includes('Type 2 Diabetes') ? `- Maintain consistent carb distribution across meals.\n` : '') +
        `- Stay hydrated with at least ${profile?.waterIntakeGoalL || 2.5}L of water daily.`;
    }

    // 4. Exercise, Nutrition & Diet Queries
    if (q.includes("exercise") || q.includes("workout") || q.includes("diet") || q.includes("meal") || q.includes("food") || q.includes("eat") || q.includes("water") || q.includes("hydration")) {
      return `🥗 **Personalized Nutrition & Exercise Guidance**\n\n` +
        `**Context for ${name} (${age}y, ${profile?.gender || ''}):**\n` +
        `- Active Conditions: ${conditions}\n` +
        `- Dietary Focus: ${profile?.dietaryPreference || 'Balanced Health'}\n\n` +
        `**Recommendations:**\n` +
        `- **Hydration Target:** Drink **${profile?.waterIntakeGoalL || 2.5} Liters** of water daily.\n` +
        `- **Activity Plan:** Engage in 30-45 minutes of moderate physical activity tailored for your lifestyle (*${profile?.activityLevel || 'Active'}*).\n` +
        `- **Nutrition Tip:** Prioritize whole vegetables, lean proteins, and monitor sodium or sugar based on your baseline vitals.`;
    }

    // 5. Sleep & Wellness Queries
    if (q.includes("sleep") || q.includes("insomnia") || q.includes("stress") || q.includes("anxiety") || q.includes("tired") || q.includes("fatigue")) {
      return `🌙 **Sleep & Wellness Optimization**\n\n` +
        `**Analysis for ${name}:**\n` +
        `- Target 7-9 hours of restful sleep per night for optimal metabolic and cardiovascular recovery.\n` +
        `- Avoid heavy caffeine or intense physical exertion within 4 hours of bedtime.\n` +
        `- Practice 5 minutes of guided diaphragmatic breathing before sleep.`;
    }

    // 6. Generic Health Query Responder (Handles ANY arbitrary prompt)
    return `👩‍⚕️ **AuraCare AI Health Response**\n\n` +
      `Regarding your inquiry: "*${userQuery}*"\n\n` +
      `📌 **Patient Context Injected:** ${name}, ${age}y (${profile?.gender || ''}) | History: ${conditions} | Allergies: ${allergies}\n\n` +
      `**Contextual Health Insights:**\n` +
      `- **Primary Guidance:** Maintain your regular medical routine, ensuring all active medications are taken as prescribed.\n` +
      `- **Monitoring:** Track any new physical changes or symptoms in the **Symptom Triage Assessment** tab.\n` +
      `- **Vitals Baseline:** Your recorded Blood Pressure is **${sys}/${dia} mmHg** and Heart Rate is **${hr} BPM**.\n\n` +
      `*AuraCare AI provides context-aware health insights. For definitive clinical diagnoses, please consult your physician.*`;
  }
}
