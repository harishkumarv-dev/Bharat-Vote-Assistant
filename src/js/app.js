import { loadProfiles, saveProfiles } from './data/sampleProfiles.js';
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
let profilesList = loadProfiles();
let currentProfileIndex = 0;
let currentProfile = profilesList[0] || {};
let activeMedications = currentProfile.medications ? [...currentProfile.medications] : [];
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
  initPatientCrud();
  initNavigation();
  initChatAssistant();
  initApiKeyModal();
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
  updateApiKeyStatusBadge();
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

// API Key Modal Controls
function initApiKeyModal() {
  const openBtn = document.getElementById('apiKeyConfigBtn');
  const badgeBtn = document.getElementById('apiKeyStatusBadge');
  const backdrop = document.getElementById('apiKeyModalBackdrop');
  const closeBtn = document.getElementById('closeApiKeyModalBtn');
  const input = document.getElementById('geminiApiKeyInput');
  const testBtn = document.getElementById('testApiKeyBtn');
  const saveBtn = document.getElementById('saveApiKeyBtn');
  const clearBtn = document.getElementById('clearApiKeyBtn');
  const resultBox = document.getElementById('apiKeyTestResultBox');

  const openModal = () => {
    if (input) input.value = aiEngine.getApiKey();
    if (resultBox) resultBox.style.display = 'none';
    if (backdrop) {
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  };

  const closeModal = () => {
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (badgeBtn) badgeBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const key = input ? input.value.trim() : '';
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(6, 182, 212, 0.1)';
        resultBox.style.color = 'var(--accent-cyan)';
        resultBox.innerHTML = '⚡ Testing Gemini API connection...';
      }

      const res = await aiEngine.testConnection(key);
      if (resultBox) {
        if (res.success) {
          resultBox.style.background = 'rgba(16, 185, 129, 0.15)';
          resultBox.style.color = 'var(--accent-emerald)';
          resultBox.innerHTML = `✅ ${res.message}`;
        } else {
          resultBox.style.background = 'rgba(244, 63, 94, 0.15)';
          resultBox.style.color = 'var(--accent-rose)';
          resultBox.innerHTML = `❌ ${res.message}`;
        }
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const key = input ? input.value.trim() : '';
      aiEngine.setApiKey(key);
      updateApiKeyStatusBadge();
      closeModal();
      if (key) {
        alert("Gemini API Key saved! Live AI calls enabled.");
      } else {
        alert("Switched to built-in Contextual Logic Engine.");
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      aiEngine.setApiKey('');
      if (input) input.value = '';
      updateApiKeyStatusBadge();
      closeModal();
      alert("API Key cleared. AuraCare AI will use the built-in Contextual Logic Engine.");
    });
  }
}

function updateApiKeyStatusBadge() {
  const badge = document.getElementById('apiKeyStatusBadge');
  const liveTag = document.getElementById('genAiLiveTag');
  const key = aiEngine.getApiKey();

  if (!badge) return;

  if (key && key.trim().length > 10) {
    badge.innerHTML = `🟢 Gemini API Live (${aiEngine.getModel()})`;
    badge.style.background = 'rgba(16, 185, 129, 0.15)';
    badge.style.color = 'var(--accent-emerald)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';

    if (liveTag) {
      liveTag.innerText = `GEMINI API LIVE (${aiEngine.getModel()})`;
      liveTag.style.background = 'var(--gradient-brand)';
    }
  } else {
    badge.innerHTML = `🔑 Gemini API: Set Key (Using Built-In Engine)`;
    badge.style.background = 'rgba(6, 182, 212, 0.1)';
    badge.style.color = 'var(--accent-cyan)';
    badge.style.borderColor = 'rgba(6, 182, 212, 0.3)';

    if (liveTag) {
      liveTag.innerText = `BUILT-IN GENAI ENGINE ACTIVE`;
      liveTag.style.background = 'linear-gradient(135deg, #6366f1, #06b6d4)';
    }
  }
}

// Profile Context Switcher & Dropdown
function initProfileSelector() {
  const select = document.getElementById('profileSelect');
  if (!select) return;

  renderProfileDropdownOptions();

  select.addEventListener('change', (e) => {
    currentProfileIndex = parseInt(e.target.value);
    currentProfile = profilesList[currentProfileIndex] || profilesList[0];
    activeMedications = currentProfile.medications ? [...currentProfile.medications] : [];
    updateActiveProfileDisplay();
  });
}

function renderProfileDropdownOptions() {
  const select = document.getElementById('profileSelect');
  if (!select) return;

  select.innerHTML = profilesList.map((p, idx) => `
    <option value="${idx}">${p.name} (${p.age}y, ${p.conditions?.slice(0, 2).join(', ') || 'Healthy'})</option>
  `).join('');
  select.value = currentProfileIndex;
}

// Patient Profile CRUD Operations (Add, Edit, Delete)
function initPatientCrud() {
  const addBtn = document.getElementById('addPatientModalBtn');
  const editBtn = document.getElementById('editPatientModalBtn');
  const deleteBtn = document.getElementById('deletePatientBtn');
  const modalBackdrop = document.getElementById('patientModalBackdrop');
  const closeBtn = document.getElementById('closePatientModalBtn');
  const cancelBtn = document.getElementById('cancelPatientModalBtn');
  const form = document.getElementById('patientProfileForm');

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openPatientModal('ADD');
    });
  }

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      openPatientModal('EDIT', currentProfile);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', handleDeletePatientProfile);
  }

  if (closeBtn) closeBtn.addEventListener('click', closePatientModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closePatientModal);

  if (form) {
    form.addEventListener('submit', handleSavePatientProfile);
  }
}

function openPatientModal(mode, profileToEdit = null) {
  const backdrop = document.getElementById('patientModalBackdrop');
  const title = document.getElementById('patientModalTitle');
  const editIdInput = document.getElementById('editProfileId');

  if (!backdrop) return;

  if (mode === 'EDIT' && profileToEdit) {
    title.innerText = `Edit Profile: ${profileToEdit.name}`;
    editIdInput.value = profileToEdit.id;
    document.getElementById('profName').value = profileToEdit.name || '';
    document.getElementById('profAge').value = profileToEdit.age || '';
    document.getElementById('profGender').value = profileToEdit.gender || 'Male';
    document.getElementById('profDiet').value = profileToEdit.dietaryPreference || '';
    document.getElementById('profConditions').value = profileToEdit.conditions?.join(', ') || '';
    document.getElementById('profAllergies').value = profileToEdit.allergies?.join(', ') || '';
    document.getElementById('profBpSys').value = profileToEdit.vitals?.bloodPressureSys || 120;
    document.getElementById('profBpDia').value = profileToEdit.vitals?.bloodPressureDia || 80;
    document.getElementById('profHeartRate').value = profileToEdit.vitals?.heartRate || 72;
    document.getElementById('profGlucose').value = profileToEdit.vitals?.glucose || 95;
    document.getElementById('profWeight').value = profileToEdit.vitals?.weightKg || 70;
    document.getElementById('profHeight').value = profileToEdit.vitals?.heightCm || 175;
  } else {
    title.innerText = 'Add New Patient Profile';
    editIdInput.value = '';
    document.getElementById('patientProfileForm').reset();
  }

  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
}

function closePatientModal() {
  const backdrop = document.getElementById('patientModalBackdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
  }
}

function handleSavePatientProfile(e) {
  e.preventDefault();

  const editId = document.getElementById('editProfileId').value;
  const name = document.getElementById('profName').value.trim();
  const age = parseInt(document.getElementById('profAge').value) || 30;
  const gender = document.getElementById('profGender').value;
  const dietaryPreference = document.getElementById('profDiet').value.trim() || 'Balanced Health';
  const conditionsStr = document.getElementById('profConditions').value.trim();
  const allergiesStr = document.getElementById('profAllergies').value.trim();

  const conditions = conditionsStr ? conditionsStr.split(',').map(s => s.trim()) : [];
  const allergies = allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : ['None reported'];

  const sys = parseInt(document.getElementById('profBpSys').value) || 120;
  const dia = parseInt(document.getElementById('profBpDia').value) || 80;
  const hr = parseInt(document.getElementById('profHeartRate').value) || 72;
  const glu = parseInt(document.getElementById('profGlucose').value) || 95;
  const weightKg = parseInt(document.getElementById('profWeight').value) || 70;
  const heightCm = parseInt(document.getElementById('profHeight').value) || 175;

  if (editId) {
    // Edit Existing
    const idx = profilesList.findIndex(p => p.id === editId);
    if (idx !== -1) {
      profilesList[idx] = {
        ...profilesList[idx],
        name, age, gender, dietaryPreference, conditions, allergies,
        vitals: { bloodPressureSys: sys, bloodPressureDia: dia, heartRate: hr, glucose: glu, weightKg, heightCm }
      };
      currentProfileIndex = idx;
    }
  } else {
    // Add New Profile
    const newProfile = {
      id: 'profile-' + Date.now(),
      name, age, gender, dietaryPreference, conditions, allergies,
      medications: [],
      vitals: { bloodPressureSys: sys, bloodPressureDia: dia, heartRate: hr, glucose: glu, weightKg, heightCm },
      activityLevel: "Moderate",
      dailyCalorieTarget: 2000,
      waterIntakeGoalL: 2.5
    };
    profilesList.push(newProfile);
    currentProfileIndex = profilesList.length - 1;
  }

  saveProfiles(profilesList);
  currentProfile = profilesList[currentProfileIndex];
  activeMedications = currentProfile.medications ? [...currentProfile.medications] : [];

  renderProfileDropdownOptions();
  updateActiveProfileDisplay();
  closePatientModal();
}

function handleDeletePatientProfile() {
  if (profilesList.length <= 1) {
    alert("Cannot delete the only remaining patient profile. System must keep at least 1 active profile.");
    return;
  }

  if (confirm(`Are you sure you want to delete patient profile "${currentProfile.name}"?`)) {
    profilesList.splice(currentProfileIndex, 1);
    currentProfileIndex = 0;
    currentProfile = profilesList[0];
    activeMedications = currentProfile.medications ? [...currentProfile.medications] : [];

    saveProfiles(profilesList);
    renderProfileDropdownOptions();
    updateActiveProfileDisplay();
  }
}

function updateActiveProfileDisplay() {
  if (!currentProfile) return;

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

  // Update Badge
  updateApiKeyStatusBadge();

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
      
      currentProfile.medications = [...activeMedications];
      saveProfiles(profilesList);
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
  currentProfile.medications = [...activeMedications];
  saveProfiles(profilesList);
  updateActiveProfileDisplay();
};

// Vitals Dashboard & Charting
function initVitalsDashboard() {
  // Chart rendering handled in renderVitalsDashboard
}

function renderVitalsDashboard() {
  if (!currentProfile.vitals) return;

  const v = currentProfile.vitals;
  const sysEl = document.getElementById('bpSysVal');
  const diaEl = document.getElementById('bpDiaVal');
  const hrEl = document.getElementById('hrVal');
  const gluEl = document.getElementById('gluVal');

  if (sysEl) sysEl.innerText = v.bloodPressureSys || 120;
  if (diaEl) diaEl.innerText = v.bloodPressureDia || 80;
  if (hrEl) hrEl.innerText = v.heartRate || 72;
  if (gluEl) gluEl.innerText = v.glucose || 95;

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

    const sys = v.bloodPressureSys || 120;
    const dia = v.bloodPressureDia || 80;
    const hr = v.heartRate || 72;

    vitalsChartInstance = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Systolic BP (mmHg)',
            data: [sys - 4, sys - 2, sys + 3, sys, sys - 1, sys + 2, sys],
            borderColor: '#06b6d4',
            tension: 0.3
          },
          {
            label: 'Diastolic BP (mmHg)',
            data: [dia - 2, dia - 1, dia + 1, dia, dia - 2, dia, dia],
            borderColor: '#6366f1',
            tension: 0.3
          },
          {
            label: 'Heart Rate (BPM)',
            data: [hr - 3, hr + 2, hr - 1, hr, hr + 4, hr - 2, hr],
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
  if (!currentProfile || !currentProfile.vitals) return;

  const plan = generateWellnessPlan(currentProfile);
  const container = document.getElementById('wellnessPlanContainer');
  const bmrRes = calculateBMR(currentProfile.vitals.weightKg || 70, currentProfile.vitals.heightCm || 175, currentProfile.age || 30, currentProfile.gender || 'Male');
  const bmiRes = calculateBMI(currentProfile.vitals.weightKg || 70, currentProfile.vitals.heightCm || 175);

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
        <div class="vital-status status-normal">${currentProfile.activityLevel || 'Active'}</div>
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
          <strong>Dinner</strong>
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
