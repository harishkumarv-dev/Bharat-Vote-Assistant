import assert from 'node:assert';
import { evaluateTriage } from '../src/js/modules/triageEngine.js';
import { analyzeMedicationSafety } from '../src/js/modules/medSafety.js';
import { calculateBMI, calculateBMR, classifyBloodPressure } from '../src/js/modules/vitalsTracker.js';

console.log('⚡ Running AuraCare AI Automated Verification Suite...\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

// Test 1: Clinical Triage Emergency Detection
runTest('Triage Engine: Chest pain should trigger EMERGENCY triage level', () => {
  const result = evaluateTriage(['sym-1'], 1, 9, { age: 50 });
  assert.strictEqual(result.level, 'EMERGENCY');
  assert.strictEqual(result.badgeColor, 'danger');
  assert.ok(result.riskScore >= 80, 'Risk score should be >= 80');
});

// Test 2: Clinical Triage Self-Care Detection
runTest('Triage Engine: Mild fatigue should trigger ROUTINE / SELF_CARE triage', () => {
  const result = evaluateTriage(['sym-7'], 2, 3, { age: 30 });
  assert.strictEqual(result.level, 'SELF_CARE');
  assert.ok(result.riskScore < 45, 'Risk score should be low');
});

// Test 3: High Drug Interaction Detection
runTest('Med Safety: Warfarin + Ibuprofen must trigger HIGH interaction alert', () => {
  const result = analyzeMedicationSafety(['Warfarin', 'Ibuprofen']);
  assert.strictEqual(result.safetyStatus, 'HIGH_INTERACTION_RISK');
  assert.strictEqual(result.interactions.length, 1);
  assert.strictEqual(result.interactions[0].severity, 'HIGH');
});

// Test 4: Allergy Detection
runTest('Med Safety: Documented Penicillin allergy must trigger CRITICAL warning', () => {
  const result = analyzeMedicationSafety(['Amoxicillin'], '', ['Penicillin']);
  assert.strictEqual(result.safetyStatus, 'CRITICAL_ALLERGY_RISK');
  assert.strictEqual(result.allergyWarnings.length, 1);
});

// Test 5: BMI Math Accuracy
runTest('Health Math: BMI calculation for 70kg / 175cm', () => {
  const res = calculateBMI(70, 175);
  assert.strictEqual(res.bmi, 22.9);
  assert.strictEqual(res.category, 'Normal weight');
});

// Test 6: BMR Math Accuracy
runTest('Health Math: BMR calculation for Male 30yo, 80kg, 180cm', () => {
  // Mifflin-St Jeor: (10*80) + (6.25*180) - (5*30) + 5 = 800 + 1125 - 150 + 5 = 1780
  const bmr = calculateBMR(80, 180, 30, 'Male');
  assert.strictEqual(bmr, 1780);
});

// Test 7: Blood Pressure Classification
runTest('Health Math: BP 142/92 mmHg should classify as Stage 2 Hypertension', () => {
  const bp = classifyBloodPressure(142, 92);
  assert.strictEqual(bp.category, 'Stage 2 Hypertension');
});

console.log(`\n-----------------------------------------`);
console.log(`Test Results: ${testsPassed} Passed, ${testsFailed} Failed.`);
if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!\n`);
}
