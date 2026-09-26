import { evaluateTriage } from './triageEngine.js';
import { analyzeMedicationSafety } from './medSafety.js';
import { calculateBMI, calculateBMR, classifyBloodPressure } from './vitalsTracker.js';

export function runInAppVerificationSuite() {
  const results = [];

  function assert(condition, message) {
    if (!condition) throw new Error(message || "Assertion failed");
  }

  function test(name, fn) {
    try {
      fn();
      results.push({ name, status: 'PASS', error: null });
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
    }
  }

  test('Triage Engine: Chest pain triggers EMERGENCY disposition', () => {
    const res = evaluateTriage(['sym-1'], 1, 9, { age: 50 });
    assert(res.level === 'EMERGENCY', `Expected EMERGENCY, got ${res.level}`);
    assert(res.riskScore >= 80, `Expected riskScore >= 80, got ${res.riskScore}`);
  });

  test('Triage Engine: Mild fatigue triggers SELF_CARE disposition', () => {
    const res = evaluateTriage(['sym-7'], 2, 3, { age: 30 });
    assert(res.level === 'SELF_CARE', `Expected SELF_CARE, got ${res.level}`);
  });

  test('Med Safety: Warfarin + Ibuprofen triggers HIGH interaction alert', () => {
    const res = analyzeMedicationSafety(['Warfarin', 'Ibuprofen']);
    assert(res.safetyStatus === 'HIGH_INTERACTION_RISK', `Expected HIGH_INTERACTION_RISK, got ${res.safetyStatus}`);
    assert(res.interactions.length === 1, `Expected 1 interaction, got ${res.interactions.length}`);
  });

  test('Med Safety: Penicillin allergy blocks Amoxicillin (Cross-sensitivity)', () => {
    const res = analyzeMedicationSafety(['Amoxicillin'], '', ['Penicillin']);
    assert(res.safetyStatus === 'CRITICAL_ALLERGY_RISK', `Expected CRITICAL_ALLERGY_RISK, got ${res.safetyStatus}`);
  });

  test('Health Math: BMI formula for 70kg / 175cm', () => {
    const res = calculateBMI(70, 175);
    assert(res.bmi === 22.9, `Expected 22.9, got ${res.bmi}`);
    assert(res.category === 'Normal weight', `Expected Normal weight, got ${res.category}`);
  });

  test('Health Math: BMR Mifflin-St Jeor equation accuracy', () => {
    const bmr = calculateBMR(80, 180, 30, 'Male');
    assert(bmr === 1780, `Expected 1780, got ${bmr}`);
  });

  test('Health Math: BP 142/92 mmHg Stage 2 Hypertension classification', () => {
    const bp = classifyBloodPressure(142, 92);
    assert(bp.category === 'Stage 2 Hypertension', `Expected Stage 2 Hypertension, got ${bp.category}`);
  });

  return results;
}
