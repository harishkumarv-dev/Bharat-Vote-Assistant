// Comprehensive Drug Database with Interaction Rules and Guidelines
export const DRUG_DATABASE = [
  {
    id: "med-1",
    name: "Lisinopril",
    category: "ACE Inhibitor (Blood Pressure)",
    commonDosages: ["5mg", "10mg", "20mg"],
    interactions: ["Potassium Supplements", "Spironolactone", "Ibuprofen", "Naproxen"],
    foodWarnings: "Avoid high-potassium foods (bananas, salt substitutes) in large quantities.",
    sideEffects: ["Dry cough", "Dizziness", "Headache"],
    redFlags: ["Swelling of face, lips, tongue (Angioedema)", "Severe lightheadedness"]
  },
  {
    id: "med-2",
    name: "Metformin",
    category: "Antidiabetic (Type 2 Diabetes)",
    commonDosages: ["500mg", "850mg", "1000mg"],
    interactions: ["Alcohol", "Cimetidine", "Furosemide"],
    foodWarnings: "Take with meals to minimize stomach upset. Avoid excessive alcohol intake.",
    sideEffects: ["Nausea", "Mild stomach pain", "Diarrhea"],
    redFlags: ["Extreme fatigue, coldness, severe muscle pain (Lactic Acidosis)"]
  },
  {
    id: "med-3",
    name: "Warfarin",
    category: "Anticoagulant (Blood Thinner)",
    commonDosages: ["2mg", "2.5mg", "5mg"],
    interactions: ["Aspirin", "Ibuprofen", "Acetaminophen (High Dose)", "Amoxicillin"],
    foodWarnings: "Maintain consistent intake of Vitamin K-rich foods (spinach, kale, broccoli). Do not drastically increase or decrease.",
    sideEffects: ["Easy bruising", "Minor bleeding when brushing teeth"],
    redFlags: ["Uncontrolled bleeding", "Dark/tarry stools", "Severe headache"]
  },
  {
    id: "med-4",
    name: "Atorvastatin",
    category: "Statin (Cholesterol)",
    commonDosages: ["10mg", "20mg", "40mg", "80mg"],
    interactions: ["Clarithromycin", "Itraconazole", "Gemfibrozil"],
    foodWarnings: "Avoid Grapefruit and Grapefruit juice (increases risk of muscle toxicity).",
    sideEffects: ["Mild muscle weakness", "Joint pain"],
    redFlags: ["Unexplained severe muscle pain, dark urine (Rhabdomyolysis)"]
  },
  {
    id: "med-5",
    name: "Albuterol Inhaler",
    category: "Bronchodilator (Asthma)",
    commonDosages: ["90mcg/actuation"],
    interactions: ["Propranolol", "Atenolol", "MAO Inhibitors"],
    foodWarnings: "Limit excessive caffeine intake which can exacerbate tremors.",
    sideEffects: ["Shakiness", "Increased heart rate", "Nervousness"],
    redFlags: ["Inhaler fails to relieve sudden severe asthma attack"]
  },
  {
    id: "med-6",
    name: "Ibuprofen",
    category: "NSAID (Pain/Inflammation)",
    commonDosages: ["200mg", "400mg", "600mg"],
    interactions: ["Lisinopril", "Warfarin", "Aspirin", "Sertraline"],
    foodWarnings: "Take with food or milk to prevent gastric distress.",
    sideEffects: ["Mild stomach upset", "Heartburn"],
    redFlags: ["Stomach pain with black stools, vomiting blood"]
  },
  {
    id: "med-7",
    name: "Sertraline",
    category: "SSRI (Antidepressant/Anxiety)",
    commonDosages: ["25mg", "50mg", "100mg"],
    interactions: ["Tramadol", "St. John's Wort", "Ibuprofen", "MAOIs"],
    foodWarnings: "Avoid alcohol. Take consistently in morning or evening.",
    sideEffects: ["Insomnia", "Dry mouth", "Mild drowsiness"],
    redFlags: ["High fever, agitation, muscle stiffness (Serotonin Syndrome)"]
  },
  {
    id: "med-8",
    name: "Levothyroxine",
    category: "Thyroid Hormone Replacement",
    commonDosages: ["25mcg", "50mcg", "75mcg", "100mcg"],
    interactions: ["Calcium Supplements", "Iron Supplements", "Antacids"],
    foodWarnings: "Take on an empty stomach in the morning with full glass of water, 30-60 mins before breakfast.",
    sideEffects: ["Mild palpitations if dose too high", "Heat sensitivity"],
    redFlags: ["Rapid, irregular heartbeat, severe anxiety"]
  }
];

// Severe interaction pairs matrix for safety engine
export const INTERACTION_RULES = [
  {
    drugA: "Warfarin",
    drugB: "Ibuprofen",
    severity: "HIGH",
    description: "Combining Warfarin with NSAIDs like Ibuprofen drastically increases the risk of serious gastrointestinal bleeding.",
    action: "Avoid simultaneous use. Consult prescribing physician immediately for alternative pain management."
  },
  {
    drugA: "Lisinopril",
    drugB: "Ibuprofen",
    severity: "MEDIUM",
    description: "NSAIDs can decrease the blood pressure lowering effect of ACE inhibitors and increase kidney strain.",
    action: "Monitor blood pressure and fluid intake. Limit NSAID duration."
  },
  {
    drugA: "Sertraline",
    drugB: "Ibuprofen",
    severity: "MEDIUM",
    description: "Combined use of SSRIs and NSAIDs moderately increases upper GI bleeding risk.",
    action: "Consider taking a gastroprotective agent (like Omeprazole) if co-prescribed."
  },
  {
    drugA: "Lisinopril",
    drugB: "Potassium Supplements",
    severity: "HIGH",
    description: "ACE inhibitors cause potassium retention. Extra potassium can lead to dangerous Hyperkalemia.",
    action: "Do not take potassium supplements unless explicitly instructed with blood monitoring."
  },
  {
    drugA: "Atorvastatin",
    drugB: "Grapefruit",
    severity: "HIGH",
    description: "Grapefruit inhibits CYP3A4 enzyme, leading to dangerously high serum concentrations of Atorvastatin.",
    action: "Eliminate grapefruit and grapefruit juice from diet while taking Atorvastatin."
  }
];
