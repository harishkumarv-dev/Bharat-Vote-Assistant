import { SYMPTOM_DATABASE } from '../data/symptomDatabase.js';

/**
 * Evaluates symptoms, user profile context, and returns a comprehensive triage report.
 */
export function evaluateTriage(selectedSymptomIds, durationDays, intensityScore, userContext = {}) {
  let matchedSymptoms = [];
  let highestWeight = 0;
  let detectedRedFlags = [];
  let calculatedRiskScore = 0;

  selectedSymptomIds.forEach(id => {
    const found = SYMPTOM_DATABASE.symptoms.find(s => s.id === id);
    if (found) {
      matchedSymptoms.push(found);
      if (found.severityWeight > highestWeight) {
        highestWeight = found.severityWeight;
      }
      if (found.redFlags && found.redFlags.length > 0) {
        detectedRedFlags.push(...found.redFlags);
      }
    }
  });

  // Calculate Base Risk Score (0 - 100)
  let baseScore = highestWeight * 0.65;
  let intensityFactor = (intensityScore / 10) * 20;
  let durationFactor = Math.min(durationDays * 2, 10);
  
  // Context modifiers
  let ageModifier = 0;
  if (userContext.age) {
    if (userContext.age > 60 || userContext.age < 5) ageModifier = 8;
  }
  
  let conditionModifier = 0;
  if (userContext.conditions && userContext.conditions.length > 0) {
    conditionModifier = Math.min(userContext.conditions.length * 4, 12);
  }

  // If high severity symptom like chest pain / stroke headache is selected, boost base score minimum
  let criticalFloor = (highestWeight >= 85) ? 80 : 0;

  calculatedRiskScore = Math.min(Math.max(Math.round(baseScore + intensityFactor + durationFactor + ageModifier + conditionModifier), criticalFloor), 100);

  // Determine Triage Level & Disposition
  let level = "SELF_CARE";
  let badgeColor = "success";
  let title = "Low Risk / Self-Care";
  let urgencyText = "Monitor symptoms at home and ensure rest and adequate hydration.";
  let recommendation = "Symptoms appear mild and manageable with home care. If symptoms persist or worsen beyond 3 days, consult a healthcare provider.";

  if (highestWeight >= 85 || calculatedRiskScore >= 80 || (intensityScore >= 9 && highestWeight >= 70)) {
    level = "EMERGENCY";
    badgeColor = "danger";
    title = "CRITICAL EMERGENCY - IMMEDIATE MEDICAL ATTENTION REQUIRED";
    urgencyText = "High Risk of Life-Threatening Event";
    recommendation = "Call Emergency Services (911/108) immediately or have someone transport you to the nearest Hospital Emergency Department.";
  } else if (highestWeight >= 65 || calculatedRiskScore >= 55 || intensityScore >= 7) {
    level = "URGENT";
    badgeColor = "warning";
    title = "Urgent Care Evaluation Recommended";
    urgencyText = "Evaluation Needed within 12 - 24 Hours";
    recommendation = "Schedule an urgent same-day appointment with your primary care provider or visit a local Urgent Care Clinic.";
  } else if (highestWeight >= 45 || calculatedRiskScore >= 35 || durationDays >= 5) {
    level = "TELEHEALTH_ROUTINE";
    badgeColor = "info";
    title = "Routine Medical Consultation";
    urgencyText = "Non-Urgent Clinical Evaluation";
    recommendation = "Book a routine Telehealth or in-person consultation with your primary physician in the coming days.";
  }

  return {
    riskScore: calculatedRiskScore,
    level,
    badgeColor,
    title,
    urgencyText,
    recommendation,
    matchedSymptoms,
    redFlags: [...new Set(detectedRedFlags)],
    assessedAt: new Date().toISOString(),
    patientContext: {
      age: userContext.age || "N/A",
      gender: userContext.gender || "N/A",
      conditions: userContext.conditions || []
    }
  };
}
