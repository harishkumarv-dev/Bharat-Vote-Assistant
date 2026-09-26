// Default User Personas
export const INITIAL_PROFILES = [
  {
    id: "profile-1",
    name: "Sarah Jenkins",
    age: 34,
    gender: "Female",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    conditions: ["Asthma", "Mild Seasonal Allergies"],
    medications: [
      { name: "Albuterol Inhaler", dosage: "90mcg", frequency: "As needed" },
      { name: "Cetirizine", dosage: "10mg", frequency: "Daily" }
    ],
    allergies: ["Penicillin", "Peanuts"],
    vitals: {
      bloodPressureSys: 118,
      bloodPressureDia: 76,
      heartRate: 72,
      spO2: 98,
      glucose: 92,
      weightKg: 62,
      heightCm: 168
    },
    activityLevel: "Active (Runner, 4x/week)",
    dietaryPreference: "Vegetarian",
    dailyCalorieTarget: 2100,
    waterIntakeGoalL: 2.8,
    bioSummary: "34yo active female runner with controlled asthma. Focuses on endurance performance, respiratory monitoring, and clean vegetarian nutrition."
  },
  {
    id: "profile-2",
    name: "Robert Vance",
    age: 62,
    gender: "Male",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    conditions: ["Hypertension", "Type 2 Diabetes", "High Cholesterol"],
    medications: [
      { name: "Lisinopril", dosage: "20mg", frequency: "Daily Morning" },
      { name: "Metformin", dosage: "1000mg", frequency: "Twice Daily with meals" },
      { name: "Atorvastatin", dosage: "20mg", frequency: "At Night" }
    ],
    allergies: ["Sulfa Drugs"],
    vitals: {
      bloodPressureSys: 138,
      bloodPressureDia: 88,
      heartRate: 78,
      spO2: 96,
      glucose: 142,
      weightKg: 89,
      heightCm: 175
    },
    activityLevel: "Sedentary to Light",
    dietaryPreference: "Low Sodium & Low Carb",
    dailyCalorieTarget: 1800,
    waterIntakeGoalL: 2.5,
    bioSummary: "62yo male managing hypertension and T2 diabetes. High risk for drug-food interactions (Grapefruit & Potassium). Needs strict cardiovascular and glycemic tracking."
  },
  {
    id: "profile-3",
    name: "Elena Rostova",
    age: 28,
    gender: "Female",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    conditions: ["Iron Deficiency Anemia", "Migraine with Aura"],
    medications: [
      { name: "Ferrous Sulfate (Iron)", dosage: "325mg", frequency: "Daily" },
      { name: "Sumatriptan", dosage: "50mg", frequency: "At onset of migraine" }
    ],
    allergies: ["None reported"],
    vitals: {
      bloodPressureSys: 110,
      bloodPressureDia: 70,
      heartRate: 82,
      spO2: 99,
      glucose: 88,
      weightKg: 58,
      heightCm: 165
    },
    activityLevel: "Moderate (Yoga & Pilates)",
    dietaryPreference: "High Iron & Balanced Mediterranean",
    dailyCalorieTarget: 2000,
    waterIntakeGoalL: 3.0,
    bioSummary: "28yo female with anemia and recurring migraines. Focuses on iron absorption optimization (Vitamin C pairing), hydration tracking, and stress management."
  }
];

export function loadProfiles() {
  const saved = localStorage.getItem('AURACARE_PROFILES');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse saved profiles, falling back to defaults:", e);
    }
  }
  return [...INITIAL_PROFILES];
}

export function saveProfiles(profiles) {
  localStorage.setItem('AURACARE_PROFILES', JSON.stringify(profiles));
}
