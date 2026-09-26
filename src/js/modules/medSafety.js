import { DRUG_DATABASE, INTERACTION_RULES } from '../data/drugDatabase.js';

// Drug Family / Cross-Sensitivity Mapping
const DRUG_CLASSES = {
  "penicillin": ["amoxicillin", "ampicillin", "augmentin", "penicillin v", "piperacillin"],
  "sulfa": ["bactrim", "sulfamethoxazole", "sulfasalazine"],
  "nsaid": ["ibuprofen", "naproxen", "aspirin", "celecoxib", "meloxicam"],
  "statin": ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"]
};

/**
 * Checks active medication list and any newly queried item for interactions and contraindications.
 */
export function analyzeMedicationSafety(userMedications = [], queryItem = "", userAllergies = []) {
  let activeMedsNames = userMedications.map(m => typeof m === 'string' ? m : m.name);
  let allItemsToCheck = [...activeMedsNames];
  
  if (queryItem && !allItemsToCheck.includes(queryItem)) {
    allItemsToCheck.push(queryItem);
  }

  let detectedInteractions = [];
  let detectedAllergyWarnings = [];
  let dietaryPrecautions = [];

  // Check pairwise interactions against rules
  for (let i = 0; i < allItemsToCheck.length; i++) {
    for (let j = i + 1; j < allItemsToCheck.length; j++) {
      const itemA = allItemsToCheck[i].toLowerCase();
      const itemB = allItemsToCheck[j].toLowerCase();

      INTERACTION_RULES.forEach(rule => {
        const rA = rule.drugA.toLowerCase();
        const rB = rule.drugB.toLowerCase();

        if ((itemA.includes(rA) && itemB.includes(rB)) || (itemA.includes(rB) && itemB.includes(rA))) {
          detectedInteractions.push({
            pair: [allItemsToCheck[i], allItemsToCheck[j]],
            severity: rule.severity,
            description: rule.description,
            action: rule.action
          });
        }
      });
    }
  }

  // Check food warnings & dietary precautions
  allItemsToCheck.forEach(medName => {
    const foundDrug = DRUG_DATABASE.find(d => d.name.toLowerCase() === medName.toLowerCase() || medName.toLowerCase().includes(d.name.toLowerCase()));
    if (foundDrug && foundDrug.foodWarnings) {
      dietaryPrecautions.push({
        drug: foundDrug.name,
        warning: foundDrug.foodWarnings
      });
    }
  });

  // Check allergies (including drug family cross-reactivity)
  if (userAllergies && userAllergies.length > 0) {
    allItemsToCheck.forEach(med => {
      const mLower = med.toLowerCase();
      userAllergies.forEach(allergy => {
        const aLower = allergy.toLowerCase();

        let isMatch = mLower.includes(aLower) || aLower.includes(mLower);
        
        // Check drug class mapping
        if (!isMatch) {
          Object.keys(DRUG_CLASSES).forEach(cls => {
            if (aLower.includes(cls)) {
              if (DRUG_CLASSES[cls].some(member => mLower.includes(member))) {
                isMatch = true;
              }
            }
          });
        }

        if (isMatch) {
          detectedAllergyWarnings.push({
            medication: med,
            allergy: allergy,
            severity: "CRITICAL",
            warning: `Patient has documented allergy to ${allergy}. ${med} is cross-reactive or belongs to the same drug family!`
          });
        }
      });
    });
  }

  const overallSafetyStatus = detectedAllergyWarnings.length > 0 ? "CRITICAL_ALLERGY_RISK" :
                              detectedInteractions.some(i => i.severity === "HIGH") ? "HIGH_INTERACTION_RISK" :
                              detectedInteractions.length > 0 ? "MODERATE_INTERACTION_RISK" : "SAFE";

  return {
    safetyStatus: overallSafetyStatus,
    interactions: detectedInteractions,
    allergyWarnings: detectedAllergyWarnings,
    dietaryPrecautions,
    checkedMedications: allItemsToCheck
  };
}
