/**
 * Healthcare Math & Vitals Analytics Engine
 */

export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return { bmi: null, category: "Unknown" };
  const heightM = heightCm / 100;
  const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  
  let category = "Normal weight";
  let color = "success";
  if (bmi < 18.5) {
    category = "Underweight";
    color = "info";
  } else if (bmi >= 25 && bmi < 29.9) {
    category = "Overweight";
    color = "warning";
  } else if (bmi >= 30) {
    category = "Obese";
    color = "danger";
  }

  return { bmi, category, color };
}

export function calculateBMR(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age) return 1800;
  // Mifflin-St Jeor Equation
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  if (gender === "Female") {
    bmr -= 161;
  } else {
    bmr += 5;
  }
  return Math.round(bmr);
}

export function calculateTDEE(bmr, activityLevel) {
  let multiplier = 1.2; // Sedentary
  if (activityLevel && activityLevel.toLowerCase().includes("active")) {
    multiplier = 1.55;
  } else if (activityLevel && activityLevel.toLowerCase().includes("light")) {
    multiplier = 1.375;
  } else if (activityLevel && activityLevel.toLowerCase().includes("heavy")) {
    multiplier = 1.725;
  }
  return Math.round(bmr * multiplier);
}

export function classifyBloodPressure(sys, dia) {
  if (!sys || !dia) return { category: "Normal", badgeColor: "success" };
  if (sys > 180 || dia > 120) {
    return { category: "Hypertensive Crisis (Seek Emergency)", badgeColor: "danger" };
  } else if (sys >= 140 || dia >= 90) {
    return { category: "Stage 2 Hypertension", badgeColor: "danger" };
  } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
    return { category: "Stage 1 Hypertension", badgeColor: "warning" };
  } else if ((sys >= 120 && sys <= 129) && dia < 80) {
    return { category: "Elevated", badgeColor: "warning" };
  }
  return { category: "Normal", badgeColor: "success" };
}
