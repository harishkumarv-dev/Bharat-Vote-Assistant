// Symptom Database for Triage & Clinical Decision Support
export const SYMPTOM_DATABASE = {
  regions: [
    { id: "head", name: "Head & Neck", icon: "brain" },
    { id: "chest", name: "Chest & Respiratory", icon: "heart-pulse" },
    { id: "abdomen", name: "Abdomen & GI", icon: "activity" },
    { id: "limbs", name: "Arms & Legs / Joint", icon: "bone" },
    { id: "skin", name: "Skin & Allergy", icon: "shield-alert" },
    { id: "general", name: "General / Systemic", icon: "thermometer" }
  ],

  symptoms: [
    {
      id: "sym-1",
      region: "chest",
      name: "Chest Pain / Pressure",
      severityWeight: 90,
      redFlags: [
        "Radiating pain to left arm, jaw, or back",
        "Shortness of breath or cold sweats",
        "Feeling of crushing tightness"
      ],
      triageLevel: "EMERGENCY",
      recommendedAction: "Call 911 / Emergency Services immediately. Do not attempt to drive yourself to hospital.",
      followUpQuestions: [
        "Does the pain radiate to your left arm, neck, or jaw?",
        "Are you experiencing dizziness or sweating?",
        "Did it start suddenly during physical exertion?"
      ]
    },
    {
      id: "sym-2",
      region: "head",
      name: "Severe Sudden Headache ('Thunderclap')",
      severityWeight: 85,
      redFlags: [
        "Worst headache of your life starting in seconds",
        "Numbness, weakness on one side of body",
        "Difficulty speaking or blurred vision"
      ],
      triageLevel: "EMERGENCY",
      recommendedAction: "Seek immediate emergency medical evaluation (Stroke / Aneurysm screening).",
      followUpQuestions: [
        "Did this headache reach maximum intensity within 1 minute?",
        "Do you have weakness in your arm or face drooping?",
        "Is there neck stiffness or sudden fever?"
      ]
    },
    {
      id: "sym-3",
      region: "chest",
      name: "Wheezing & Shortness of Breath",
      severityWeight: 70,
      redFlags: [
        "Unable to speak full sentences",
        "Lips or fingernails turning blue/gray",
        "Rescue inhaler provides no relief"
      ],
      triageLevel: "URGENT",
      recommendedAction: "Use emergency bronchodilator. If breathing worsens or speech is compromised, go to ER.",
      followUpQuestions: [
        "Do you have a history of Asthma or COPD?",
        "How many puffs of rescue inhaler have you taken?",
        "Are your lips or nail beds discolored?"
      ]
    },
    {
      id: "sym-4",
      region: "abdomen",
      name: "Severe Right Lower Abdominal Pain",
      severityWeight: 75,
      redFlags: [
        "Sharp pain starting near navel and moving to lower right",
        "Fever and vomiting",
        "Pain worsens with walking or coughing"
      ],
      triageLevel: "URGENT",
      recommendedAction: "Visit Urgent Care or ER for evaluation (rule out Appendicitis). Fasting recommended.",
      followUpQuestions: [
        "Is the pain concentrated in your lower right abdomen?",
        "Do you have a fever or loss of appetite?",
        "Does pressing down and releasing cause sharp rebound pain?"
      ]
    },
    {
      id: "sym-5",
      region: "general",
      name: "High Fever (> 102.5°F / 39.1°C)",
      severityWeight: 55,
      redFlags: [
        "Stiff neck and intolerance to light",
        "Fever persisting over 3 days despite antipyretics",
        "Confusion or lethargy"
      ],
      triageLevel: "ROUTINE_URGENT",
      recommendedAction: "Stay hydrated, use Acetaminophen/Ibuprofen. If accompanied by neck stiffness or rash, seek urgent care.",
      followUpQuestions: [
        "How many days has the fever persisted?",
        "Are you experiencing chills or night sweats?",
        "Can you comfortably touch your chin to your chest?"
      ]
    },
    {
      id: "sym-6",
      region: "skin",
      name: "Allergic Hives & Skin Rash",
      severityWeight: 50,
      redFlags: [
        "Swelling of lips, tongue, or throat",
        "Difficulty swallowing or breathing",
        "Rapidly spreading rash after new medication/food"
      ],
      triageLevel: "ROUTINE",
      recommendedAction: "Take oral antihistamine (Cetirizine/Diphenhydramine). Seek emergency care if throat swelling occurs.",
      followUpQuestions: [
        "Did you recently start a new medication or eat a known allergen?",
        "Is there any swelling around your eyes, lips, or throat?",
        "Are the hives itchy or burning?"
      ]
    },
    {
      id: "sym-7",
      region: "general",
      name: "Persistent Daily Fatigue",
      severityWeight: 30,
      redFlags: [
        "Unexplained weight loss > 10 lbs",
        "Swollen lymph nodes",
        "Extreme shortness of breath with mild exertion"
      ],
      triageLevel: "ROUTINE",
      recommendedAction: "Schedule a routine consultation with primary physician for comprehensive blood panel (Iron, Thyroid, Vitamin D).",
      followUpQuestions: [
        "How long have you been feeling unusually fatigued?",
        "Have you noticed changes in sleep pattern, appetite, or weight?",
        "Are you experiencing mood changes or difficulty concentrating?"
      ]
    }
  ]
};
