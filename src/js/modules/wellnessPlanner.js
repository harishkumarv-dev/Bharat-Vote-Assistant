import { calculateBMR, calculateTDEE } from './vitalsTracker.js';

/**
 * Generates dynamic 7-day nutrition and exercise schedule based on user context.
 */
export function generateWellnessPlan(profile) {
  const bmr = calculateBMR(profile.vitals.weightKg, profile.vitals.heightCm, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  const isLowSodium = profile.dietaryPreference?.toLowerCase().includes("sodium") || profile.conditions?.includes("Hypertension");
  const isVegetarian = profile.dietaryPreference?.toLowerCase().includes("vegetarian");
  const isDiabetic = profile.conditions?.includes("Type 2 Diabetes") || profile.dietaryPreference?.toLowerCase().includes("carb");

  const meals = {
    breakfast: isVegetarian 
      ? "Steel-cut oatmeal with blueberries, chia seeds, and almond milk" 
      : isDiabetic 
        ? "Scrambled eggs with spinach, avocado, and 1 slice whole grain toast"
        : "Greek yogurt parfait with mixed berries, honey, and walnuts",
    lunch: isVegetarian
      ? "Quinoa bowl with roasted chickpeas, cucumber, cherry tomatoes, and tahini dressing"
      : isLowSodium
        ? "Grilled herb chicken breast with steamed broccoli and brown rice (unsalted)"
        : "Turkey breast wrap with leafy greens, hummus, and apple slices",
    dinner: isDiabetic
      ? "Baked wild salmon with asparagus spears and cauliflower mash"
      : isVegetarian
        ? "Lentil & vegetable curry with brown basmati rice"
        : "Lean sirloin steak / grilled cod with roasted sweet potatoes and green beans",
    snack: isDiabetic 
      ? "Handful of raw almonds & celery sticks with peanut butter"
      : "Slice of melon or green apple with walnut halves"
  };

  const workouts = profile.conditions?.includes("Asthma")
    ? [
        "Day 1: 30-min Low-impact Yoga & Deep Breathing",
        "Day 2: 25-min Indoor Cycling (Moderate Pace)",
        "Day 3: Active Recovery & Gentle Stretching",
        "Day 4: 30-min Swimming or Water Aerobics",
        "Day 5: Resistance Band Core Workout",
        "Day 6: 40-min Outdoor Walk (Pollen-checked)",
        "Day 7: Full Body Mobility & Foam Rolling"
      ]
    : [
        "Day 1: 30-min Brisk Walking / Jogging + Core",
        "Day 2: Full Body Resistance Circuit (Bodyweight)",
        "Day 3: 45-min Yoga / Pilates Mobility",
        "Day 4: Moderate Interval Cardio Session",
        "Day 5: Upper Body & Lower Body Strength Training",
        "Day 6: 50-min Outdoor Nature Hike / Cycling",
        "Day 7: Active Rest & Meditation"
      ];

  return {
    calorieTarget: profile.dailyCalorieTarget || tdee,
    waterIntakeL: profile.waterIntakeGoalL || 2.5,
    dietaryFocus: profile.dietaryPreference || "Balanced Health",
    meals,
    workouts,
    healthTips: [
      isLowSodium ? "Keep daily sodium intake below 1,500 mg to assist BP management." : "Maintain hydration across the day.",
      isDiabetic ? "Monitor post-meal blood glucose 2 hours after dinner." : "Prioritize 7-9 hours of restful sleep for recovery.",
      "Incorporate 5 minutes of mindful breathing before bedtime."
    ]
  };
}
