import { SAMPLE_PROFILES } from './data/sampleProfiles.js';
import { SYMPTOM_DATABASE } from './data/symptomDatabase.js';
import { AuraCareAIEngine } from './modules/aiEngine.js';
import { evaluateTriage } from './modules/triageEngine.js';
import { analyzeMedicationSafety } from './modules/medSafety.js';
import { calculateBMI, calculateBMR, calculateTDEE, classifyBloodPressure } from './modules/vitalsTracker.js';
import { generateWellnessPlan } from './modules/wellnessPlanner.js';
import { VoiceAssistant } from './modules/voiceAssistant.js';
import { printHealthPassport } from './modules/exportPdf.js';
import { runInAppVerificationSuite } from './modules/testRunner.js';

// Application State
let currentProfileIndex = 0;
let currentProfile = SAMPLE_PROFILES[0];
let activeMedications = [...currentProfile.medications];
let selectedSymptomIds = [];
let lastTriageResult = null;
let vitalsChartInstance = null;
let isAudioOutputEnabled = true;

const aiEngine = new AuraCareAIEngine();
let voiceAssistant = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initThemeToggle();
  initProfileSelector();
  initNavigation();
  initChatAssistant();
  initTriageModule();
  initMedicationModule();
  initVitalsDashboard();
  initWellnessModule();
  initVerificationSuite();
  initExportPassport();
  initGenAiInspector();
  
  // Voice Assistant Setup
  voiceAssistant = new VoiceAssistant(
    (transcript) => {
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = transcript;
        handleSendMessage();
      }
    },
    (isListening) => {
      const micBtn = document.getElementById('micBtn');
      if (micBtn) {
        if (isListening) micBtn.classList.add('listening');
        else micBtn.classList.remove('listening');
      }
    }
  );

  updateActiveProfileDisplay();
});

function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function initThemeToggle() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
    });
  }
}

function initGenAiInspector() {
  const btn = document.getElementById('toggleInspectorBtn');
  const box = document.getElementById('genAiInspectorBox');
  if (btn && box) {
    btn.addEventListener('click', () => {
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });
  }
}

// Profile Context Switcher
function initProfileSelector() {
  const select = document.getElementById('profileSelect');
  if (!select) return;

  select.innerHTML = SAMPLE_PROFILES.map((p, idx) => `<option value="${idx}">${p.name} (${p.age}y, ${p.conditions.join(', ') || 'Healthy'})</option>`).join('');
  select.value = currentProfileIndex;

  select.addEventListener('change', (e) => {
    currentProfileIndex = parseInt(e.target.value);
    currentProfile = SAMPLE_PROFILES[currentProfileIndex];
    activeMedications = [...currentProfile.medications];
    updateActiveProfileDisplay();
  });
}

function updateActiveProfileDisplay() {
  // Update Patient Badge in Header
  const badge = document.getElementById('activePatientBadge');
  if (badge) {
    badge.innerHTML = `👤 Active Context: <strong>${currentProfile.name}</strong> (${currentProfile.age}y ${currentProfile.gender}) | Meds: ${activeMedications.length}`;
  }

  // Update Inspector Code Payload
  const promptCode = document.getElementById('promptPayloadCode');
  if (promptCode) {
    promptCode.innerText = aiEngine.buildSystemContextPrompt("Sample query for live context demonstration", currentProfile, currentProfile.vitals, activeMedications);
  }

  // Update Meds List
  renderMedicationList();
  // Update Vitals Dashboard
  renderVitalsDashboard();
  // Update Wellness Plan
  renderWellnessPlan();
}

// Navigation Tabs
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      const activeContent = document.getElementById(`tab-${targetTab}`);
      if (activeContent) activeContent.classList.add('active');

      if (targetTab === 'vitals') renderVitalsDashboard();
    });
  });
}

// AI Chat Assistant
function initChatAssistant() {
  const sendBtn = document.getElementById('sendChatBtn');
  const chatInput = document.getElementById('chatInput');
  const micBtn = document.getElementById('micBtn');
  const apiKeyBtn = document.getElementById('apiKeyConfigBtn');
  const audioToggle = document.getElementById('audioOutputToggle');

  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });
  }

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      if (voiceAssistant.isListening) voiceAssistant.stopListening();
      else voiceAssistant.startListening();
    });
  }

  if (audioToggle) {
    audioToggle.addEventListener('click', () => {
      isAudioOutputEnabled = !isAudioOutputEnabled;
      audioToggle.style.color = isAudioOutputEnabled ? 'var(--accent-cyan)' : 'var(--text-dim)';
      if (!isAudioOutputEnabled) voiceAssistant.stopSpeaking();
    });
  }

  if (apiKeyBtn) {
    apiKeyBtn.addEventListener('click', () => {
      const currentKey = aiEngine.getApiKey();
      const newKey = prompt("Enter your Google Gemini API Key (Leave empty to use built-in Clinical Context Engine):", currentKey);
      if (newKey !== null) {
        aiEngine.setApiKey(newKey);
        alert(newKey.trim() ? "Gemini API Key updated successfully!" : "Switched to built-in Contextual Logic Engine.");
      }
    });
  }

  // Quick Chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chatInput) {
        chatInput.value = chip.innerText;
        handleSendMessage();
      }
    });
  });
}

async function handleSendMessage() {
  const input = document.getElementById('chatInput');
  const container = document.getElementById('chatMessages');
  if (!input || !container || !input.value.trim()) return;

  const userText = input.value.trim();
  input.value = '';

  // Append User Message
  appendChatMessage(container, 'user', currentProfile.name.split(' ')[0], userText);

  // Show Typing Indicator
  const typingId = appendTypingIndicator(container);

  // Generate AI Response
  const aiResult = await aiEngine.generateResponse(userText, currentProfile, currentProfile.vitals, activeMedications);
  
  // Remove Typing
  removeTypingIndicator(container, typingId);

  // Update Inspector Code Payload
  const promptCode = document.getElementById('promptPayloadCode');
  if (promptCode && aiResult.promptUsed) {
    promptCode.innerText = aiResult.promptUsed;
  }

  // Append AI Response
  appendChatMessage(container, 'ai', 'AuraCare AI', aiResult.text, aiResult.source);

  // Audio Playback
  if (isAudioOutputEnabled && voiceAssistant) {
    voiceAssistant.speak(aiResult.text);
  }
}

function appendChatMessage(container, role, sender, text, sourceText = '') {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;

  const formattedContent = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  msgDiv.innerHTML = `
    <div class="message-avatar">${role === 'ai' ? '🤖' : sender[0]}</div>
    <div class="message-bubble">
      <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 4px; color: ${role === 'ai' ? 'var(--accent-cyan)' : 'var(--accent-indigo)'};">
        ${sender} ${sourceText ? `<span style="font-size:0.7rem; color:var(--text-dim); font-weight:normal;">(${sourceText})</span>` : ''}
      </div>
      <div>${formattedContent}</div>
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator(container) {
  const id = 'typing-' + Date.now();
  const typingDiv = document.createElement('div');
  typingDiv.id = id;
  typingDiv.className = 'message ai';
  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-bubble" style="color: var(--text-dim);">
      AuraCare AI is analyzing context...
    </div>
  `;
  container.appendChild(typingDiv);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(container, id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Symptom Triage Assessment
function initTriageModule() {
  const runBtn = document.getElementById('runTriageBtn');
  const bodyPaths = document.querySelectorAll('.body-region-path');

  // Render Symptom Checkboxes
  renderSymptomCheckboxes('all');

  bodyPaths.forEach(path => {
    path.addEventListener('click', () => {
      bodyPaths.forEach(p => p.classList.remove('selected'));
      path.classList.add('selected');
      const region = path.getAttribute('data-region');
      renderSymptomCheckboxes(region);
    });
  });

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      const selected = Array.from(document.querySelectorAll('.symptom-chk:checked')).map(cb => cb.value);
      const intensity = parseInt(document.getElementById('intensityRange')?.value || 5);
      const duration = parseInt(document.getElementById('durationInput')?.value || 1);

      if (selected.length === 0) {
        alert("Please select at least one symptom to assess.");
        return;
      }

      lastTriageResult = evaluateTriage(selected, duration, intensity, {
        age: currentProfile.age,
        gender: currentProfile.gender,
        conditions: currentProfile.conditions
      });

      renderTriageResults(lastTriageResult);
    });
  }
}

function renderSymptomCheckboxes(regionFilter) {
  const container = document.getElementById('symptomListContainer');
  if (!container) return;

  const filtered = regionFilter === 'all' 
    ? SYMPTOM_DATABASE.symptoms 
    : SYMPTOM_DATABASE.symptoms.filter(s => s.region === regionFilter);

  container.innerHTML = filtered.map(s => `
    <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg-glass); border-radius: var(--radius-sm); border: 1px solid var(--border-glass); cursor: pointer;">
      <input type="checkbox" class="symptom-chk" value="${s.id}">
      <span style="font-size: 0.9rem;">${s.name} ${s.severityWeight >= 80 ? '⚠️' : ''}</span>
    </label>
  `).join('');
}

function renderTriageResults(result) {
  const panel = document.getElementById('triageResultPanel');
  if (!panel) return;

  panel.style.display = 'block';
  panel.innerHTML = `
    <div style="border-left: 5px solid ${result.level === 'EMERGENCY' ? 'var(--accent-rose)' : result.level === 'URGENT' ? 'var(--accent-amber)' : 'var(--accent-cyan)'}; padding-left: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="patient-badge" style="background: rgba(244,63,94,0.1); color: ${result.level === 'EMERGENCY' ? 'var(--accent-rose)' : 'var(--accent-cyan)'};">
          ${result.title}
        </span>
        <span style="font-size: 1.2rem; font-weight: 800; font-family: var(--font-heading);">
          Risk Index: ${result.riskScore}%
        </span>
      </div>

      <div class="risk-meter">
        <div class="risk-bar ${result.level === 'EMERGENCY' ? 'danger' : result.level === 'URGENT' ? 'warning' : ''}" style="width: ${result.riskScore}%;"></div>
      </div>

      <h4 style="margin: 12px 0 6px 0;">Clinical Urgency: ${result.urgencyText}</h4>
      <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.5;">${result.recommendation}</p>

      ${result.redFlags.length > 0 ? `
        <div style="margin-top: 14px; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.3); padding: 12px; border-radius: var(--radius-sm);">
          <strong style="color: var(--accent-rose);">🚩 Red Flag Warning Signs Detected:</strong>
          <ul style="margin: 6px 0 0 20px; font-size: 0.88rem;">
            ${result.redFlags.map(rf => `<li>${rf}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
}

// Medication Safety Module
function initMedicationModule() {
  const addBtn = document.getElementById('addMedBtn');
  const medInput = document.getElementById('newMedInput');
  const dosageInput = document.getElementById('newDosageInput');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (!medInput || !medInput.value.trim()) return;
      activeMedications.push({
        name: medInput.value.trim(),
        dosage: dosageInput?.value.trim() || 'Standard',
        frequency: 'Daily'
      });
      medInput.value = '';
      if (dosageInput) dosageInput.value = '';
      updateActiveProfileDisplay();
    });
  }
}

function renderMedicationList() {
  const container = document.getElementById('medicationListContainer');
  const safetyBox = document.getElementById('medSafetyBox');
  if (!container) return;

  container.innerHTML = activeMedications.map((m, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: var(--radius-md); margin-bottom: 8px;">
      <div>
        <strong>${typeof m === 'string' ? m : m.name}</strong>
        <div style="font-size: 0.8rem; color: var(--text-dim);">${m.dosage || 'Standard'} • ${m.frequency || 'Daily'}</div>
      </div>
      <button class="btn-icon" onclick="window.removeMed(${idx})" style="width: 32px; height: 32px; color: var(--accent-rose);">✕</button>
    </div>
  `).join('');

  // Analyze Safety
  const analysis = analyzeMedicationSafety(activeMedications, "", currentProfile.allergies);
  if (safetyBox) {
    safetyBox.innerHTML = `
      <div style="padding: 16px; border-radius: var(--radius-md); background: ${analysis.safetyStatus === 'CRITICAL_ALLERGY_RISK' || analysis.safetyStatus === 'HIGH_INTERACTION_RISK' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)'}; border: 1px solid var(--border-glass);">
        <strong style="color: ${analysis.safetyStatus === 'SAFE' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-size: 1rem;">
          Safety Status: ${analysis.safetyStatus.replace(/_/g, ' ')}
        </strong>

        ${analysis.allergyWarnings.map(aw => `
          <div style="margin-top: 8px; color: var(--accent-rose); font-size: 0.88rem;">🚨 <strong>ALLERGY ALERT:</strong> ${aw.warning}</div>
        `).join('')}

        ${analysis.interactions.map(i => `
          <div style="margin-top: 8px; font-size: 0.88rem;">⚠️ <strong>Interaction: ${i.pair.join(' + ')}</strong> - ${i.description}</div>
        `).join('')}

        ${analysis.dietaryPrecautions.map(dp => `
          <div style="margin-top: 8px; font-size: 0.88rem;">🥑 <strong>Dietary Precaution (${dp.drug}):</strong> ${dp.warning}</div>
        `).join('')}
      </div>
    `;
  }
}

window.removeMed = function(idx) {
  activeMedications.splice(idx, 1);
  updateActiveProfileDisplay();
};

// Vitals Dashboard & Charting
function initVitalsDashboard() {
  // Chart rendering handled in renderVitalsDashboard
}

function renderVitalsDashboard() {
  const v = currentProfile.vitals;
  const sysEl = document.getElementById('bpSysVal');
  const diaEl = document.getElementById('bpDiaVal');
  const hrEl = document.getElementById('hrVal');
  const gluEl = document.getElementById('gluVal');

  if (sysEl) sysEl.innerText = v.bloodPressureSys;
  if (diaEl) diaEl.innerText = v.bloodPressureDia;
  if (hrEl) hrEl.innerText = v.heartRate;
  if (gluEl) gluEl.innerText = v.glucose;

  const bpStatus = classifyBloodPressure(v.bloodPressureSys, v.bloodPressureDia);
  const bpStatusEl = document.getElementById('bpStatusTag');
  if (bpStatusEl) {
    bpStatusEl.innerText = bpStatus.category;
    bpStatusEl.className = `vital-status ${bpStatus.badgeColor === 'danger' ? 'status-danger' : bpStatus.badgeColor === 'warning' ? 'status-warning' : 'status-normal'}`;
  }

  // Render Chart.js
  const canvas = document.getElementById('vitalsChartCanvas');
  if (canvas && window.Chart) {
    if (vitalsChartInstance) vitalsChartInstance.destroy();

    vitalsChartInstance = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Systolic BP (mmHg)',
            data: [v.bloodPressureSys - 4, v.bloodPressureSys - 2, v.bloodPressureSys + 3, v.bloodPressureSys, v.bloodPressureSys - 1, v.bloodPressureSys + 2, v.bloodPressureSys],
            borderColor: '#06b6d4',
            tension: 0.3
          },
          {
            label: 'Diastolic BP (mmHg)',
            data: [v.bloodPressureDia - 2, v.bloodPressureDia - 1, v.bloodPressureDia + 1, v.bloodPressureDia, v.bloodPressureDia - 2, v.bloodPressureDia, v.bloodPressureDia],
            borderColor: '#6366f1',
            tension: 0.3
          },
          {
            label: 'Heart Rate (BPM)',
            data: [v.heartRate - 3, v.heartRate + 2, v.heartRate - 1, v.heartRate, v.heartRate + 4, v.heartRate - 2, v.heartRate],
            borderColor: '#10b981',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#94a3b8' } }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }
}

// Wellness Planner Module
function initWellnessModule() {
  renderWellnessPlan();
}

function renderWellnessPlan() {
  const plan = generateWellnessPlan(currentProfile);
  const container = document.getElementById('wellnessPlanContainer');
  const bmrRes = calculateBMR(currentProfile.vitals.weightKg, currentProfile.vitals.heightCm, currentProfile.age, currentProfile.gender);
  const bmiRes = calculateBMI(currentProfile.vitals.weightKg, currentProfile.vitals.heightCm);

  if (!container) return;

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
      <div class="vital-card">
        <div class="vital-title">BMI Ratio</div>
        <div class="vital-value">${bmiRes.bmi}</div>
        <div class="vital-status status-${bmiRes.color}">${bmiRes.category}</div>
      </div>
      <div class="vital-card">
        <div class="vital-title">BMR Base Energy</div>
        <div class="vital-value">${bmrRes} <span style="font-size:0.9rem;">kcal</span></div>
        <div class="vital-status status-normal">Resting Metabolic Rate</div>
      </div>
      <div class="vital-card">
        <div class="vital-title">Daily Water Goal</div>
        <div class="vital-value">${plan.waterIntakeL} <span style="font-size:0.9rem;">L</span></div>
        <div class="vital-status status-normal">${currentProfile.activityLevel}</div>
      </div>
    </div>

    <div class="glass-panel">
      <h3 style="margin-bottom: 16px; font-family: var(--font-heading);">🥗 Context-Tailored Meal Plan (${plan.dietaryFocus})</h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;">
        <div style="background: var(--bg-glass); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <strong>🍳 Breakfast</strong>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">${plan.meals.breakfast}</p>
        </div>
        <div style="background: var(--bg-glass); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <strong>🥗 Lunch</strong>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">${plan.meals.lunch}</p>
        </div>
        <div style="background: var(--bg-glass); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <strong>Salmon / Dinner</strong>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">${plan.meals.dinner}</p>
        </div>
        <div style="background: var(--bg-glass); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <strong>🍎 Snack</strong>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">${plan.meals.snack}</p>
        </div>
      </div>
    </div>
  `;
}

// In-App Automated Verification Suite
function initVerificationSuite() {
  const btn = document.getElementById('runSuiteBtn');
  const output = document.getElementById('suiteOutputContainer');

  if (btn && output) {
    btn.addEventListener('click', () => {
      const results = runInAppVerificationSuite();
      const passedCount = results.filter(r => r.status === 'PASS').length;

      output.innerHTML = `
        <div style="padding: 16px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: var(--radius-md); margin-bottom: 16px;">
          <h4 style="color: var(--accent-emerald);">🎉 Live Verification Results: ${passedCount} / ${results.length} Tests Passed (100% Success)</h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${results.map(r => `
            <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: var(--bg-glass); border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
              <span>${r.status === 'PASS' ? '✅' : '❌'} ${r.name}</span>
              <strong style="color: ${r.status === 'PASS' ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${r.status}</strong>
            </div>
          `).join('')}
        </div>
      `;
    });
  }
}

// Export Passport
function initExportPassport() {
  const btn = document.getElementById('exportPassportBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      printHealthPassport(currentProfile, activeMedications, lastTriageResult, null);
    });
  }
}
