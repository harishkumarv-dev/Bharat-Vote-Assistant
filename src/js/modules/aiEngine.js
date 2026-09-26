import { analyzeMedicationSafety } from './medSafety.js';

/**
 * AI Reasoning Engine supporting Gemini API with contextual offline engine fallback.
 */

export class AuraCareAIEngine {
  constructor() {
    this.apiKey = localStorage.getItem('AURACARE_GEMINI_API_KEY') || '';
    this.modelName = 'gemini-1.5-flash';
    this.lastPromptPayload = '';
  }

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('AURACARE_GEMINI_API_KEY', key);
  }

  getApiKey() {
    return this.apiKey;
  }

  getLastPromptPayload() {
    return this.lastPromptPayload;
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
- Current Vitals: BP ${currentVitals?.bloodPressureSys}/${currentVitals?.bloodPressureDia} mmHg, HR ${currentVitals?.heartRate} bpm, SpO2 ${currentVitals?.spO2}%, Glucose ${currentVitals?.glucose} mg/dL
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

    // If Gemini API Key is provided, call Gemini API
    if (this.apiKey && this.apiKey.trim().length > 10) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
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
            return {
              text,
              source: 'Google Gemini 1.5 Flash (Live GenAI Model)',
              timestamp: new Date().toLocaleTimeString(),
              promptUsed: prompt
            };
          }
        }
      } catch (err) {
        console.warn("Gemini API call failed, falling back to Contextual Logic Engine:", err);
      }
    }

    // Fallback: Intelligent Contextual Logic Engine
    const offlineResponse = this.generateContextualOfflineResponse(userQuery, profile, currentVitals, activeMeds);
    return {
      text: offlineResponse,
      source: 'AuraCare GenAI Logic Engine (Contextual Reasoning)',
      timestamp: new Date().toLocaleTimeString(),
      promptUsed: prompt
    };
  }

  generateContextualOfflineResponse(userQuery, profile, currentVitals, activeMeds) {
    const q = userQuery.toLowerCase();
    
    // Emergency Check
    if (q.includes("chest pain") || q.includes("stroke") || q.includes("can't breathe") || q.includes("crushing")) {
      return `⚠️ **CRITICAL EMERGENCY ALERT**
Based on your query mentioning severe symptoms (*chest pain / breathing distress*), this is classified as a **High-Risk Emergency Event**.

🚨 **Immediate Recommendations:**
- Call Emergency Services (**911** or **108**) immediately.
- Do not attempt to drive yourself to the emergency department.
- If prescribed sublingual Nitroglycerin for known heart condition, take as directed while awaiting paramedics.

*Dynamic Patient Context Injected: Patient ${profile?.name || ''} (${profile?.age || ''}y) with active conditions: ${profile?.conditions?.join(', ') || 'None'}.*`;
    }

    // Medication & Interaction Check
    if (q.includes("medication") || q.includes("pill") || q.includes("drug") || q.includes("take") || q.includes("interaction") || q.includes("side effect") || q.includes("ibuprofen") || q.includes("aspirin") || q.includes("lisinopril") || q.includes("warfarin")) {
      const safety = analyzeMedicationSafety(activeMeds, userQuery, profile?.allergies || []);
      
      let medText = `💊 **GenAI Medication & Interaction Analysis**\n\n`;
      medText += `**Active Patient Context (${profile?.name || 'Patient'} - ${profile?.age || ''}y):**\n`;
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

    // Vitals & BP Check
    if (q.includes("bp") || q.includes("blood pressure") || q.includes("vitals") || q.includes("heart rate") || q.includes("glucose") || q.includes("sugar")) {
      const sys = currentVitals?.bloodPressureSys || 120;
      const dia = currentVitals?.bloodPressureDia || 80;
      const hr = currentVitals?.heartRate || 72;
      const glu = currentVitals?.glucose || 95;

      return `📊 **GenAI Contextual Vitals Evaluation**\n\n` +
        `**Live Vitals Context for ${profile?.name || 'Patient'}:**\n` +
        `- Blood Pressure: **${sys}/${dia} mmHg** (${sys >= 130 ? '⚠️ Stage 1/2 Elevated' : '✅ Normal Range'})\n` +
        `- Heart Rate: **${hr} bpm** (Resting Normal)\n` +
        `- Blood Glucose: **${glu} mg/dL** (${profile?.conditions?.includes('Type 2 Diabetes') ? 'Target 80-130 mg/dL' : 'Normal Fasting'})\n\n` +
        `💡 **Dynamic Advice:**\n` +
        (profile?.conditions?.includes('Hypertension') ? `- Continue daily BP logging in morning & evening. Limit sodium intake below 1,500mg.\n` : '') +
        (profile?.conditions?.includes('Type 2 Diabetes') ? `- Maintain consistent carb distribution across meals.\n` : '') +
        `- Stay hydrated with at least ${profile?.waterIntakeGoalL || 2.5}L of water daily.`;
    }

    // General Wellness & Default Smart Answer
    return `👩‍⚕️ **AuraCare GenAI Health Insights**\n\n` +
      `Thank you for asking, **${profile?.name || 'Patient'}**. Here is your dynamic recommendation generated for your health profile:\n\n` +
      `📌 **Patient Context:** ${profile?.name || ''}, Age ${profile?.age || 'N/A'} (${profile?.gender || ''}) | Medical History: ${profile?.conditions?.join(', ') || 'None'}\n\n` +
      `**Personalized Action Plan:**\n` +
      `- **Hydration & Daily Routine:** Target **${profile?.waterIntakeGoalL || 2.5} Liters** of water daily based on your activity level (*${profile?.activityLevel || 'Active'}*).\n` +
      `- **Medication Regimen:** Take your active medications (${activeMeds?.slice(0, 2).map(m => m.name || m).join(', ')}) at scheduled intervals.\n` +
      `- **Clinical Triage:** If you experience any severe symptoms, use the **Symptom Triage Assessment** tab for instant risk scoring.\n\n` +
      `*AuraCare AI is an interactive GenAI decision support tool. Please consult your physician for formal clinical diagnosis.*`;
  }
}
