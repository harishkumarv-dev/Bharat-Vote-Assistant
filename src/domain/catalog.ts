import type {
  AccessibilityNeed,
  CostBand,
  DietaryNeed,
  Effort,
  EventType,
  Priority,
  RsvpStatus,
  StyleTag,
  TaskPhase,
  VendorStatus,
} from '../types';

/* ------------------------------------------------------------------ */
/* Labels & metadata                                                   */
/* ------------------------------------------------------------------ */

export const EVENT_TYPE_META: Record<
  EventType,
  { label: string; shortLabel: string; description: string; defaultName: string; example: string }
> = {
  wedding: {
    label: 'Wedding',
    shortLabel: 'Wedding',
    description: 'A celebration of two people, with the people who matter most.',
    defaultName: 'Our wedding',
    example: 'Garden editorial, 120 guests',
  },
  birthday: {
    label: 'Birthday',
    shortLabel: 'Birthday',
    description: 'A milestone, a dinner, or a whole weekend shaped around one person.',
    defaultName: 'Birthday celebration',
    example: 'Golden-hour picnic, 30 guests',
  },
  community: {
    label: 'Community event',
    shortLabel: 'Community',
    description: 'A gathering that brings neighbours together and leaves something behind.',
    defaultName: 'Community gathering',
    example: 'Neighbourhood night market',
  },
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  food: 'Food & drink',
  music: 'Music & entertainment',
  decor: 'Decor & atmosphere',
  photos: 'Photos & memories',
  experiences: 'Interactive moments',
  venue: 'Venue & setting',
  guests: 'Guest comfort',
  keepsakes: 'Keepsakes & favours',
  accessibility: 'Inclusive access',
  sustainability: 'Low-waste choices',
};

export const STYLE_LABELS: Record<StyleTag, string> = {
  modern: 'Modern',
  classic: 'Classic',
  bohemian: 'Bohemian',
  minimal: 'Minimal',
  playful: 'Playful',
  elegant: 'Elegant',
  cozy: 'Cozy',
  cultural: 'Cultural',
  outdoor: 'Outdoor',
  retro: 'Retro',
  luxe: 'Luxe',
  diy: 'Handmade',
};

export const DIETARY_LABELS: Record<DietaryNeed, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'gluten-free': 'Gluten-free',
  'dairy-free': 'Dairy-free',
  'nut-free': 'Nut-free',
  halal: 'Halal',
  kosher: 'Kosher',
  'kid-friendly': 'Kid-friendly',
  'alcohol-free': 'Alcohol-free',
};

export const ACCESSIBILITY_LABELS: Record<AccessibilityNeed, string> = {
  'step-free': 'Step-free access',
  'accessible-restroom': 'Accessible restroom',
  'quiet-room': 'Quiet room',
  'sensory-friendly': 'Sensory-friendly',
  'hearing-support': 'Hearing support',
  'sign-language': 'Sign language',
  'large-print': 'Large-print materials',
  'accessible-parking': 'Accessible parking',
  childcare: 'Childcare support',
};

export const RSVP_LABELS: Record<RsvpStatus, string> = {
  pending: 'Awaiting reply',
  attending: 'Attending',
  maybe: 'Maybe',
  declined: 'Declined',
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  researching: 'Researching',
  contacted: 'Contacted',
  quoted: 'Quote received',
  booked: 'Booked',
  declined: 'Passed',
};

export const PHASE_LABELS: Record<TaskPhase, string> = {
  foundation: 'Foundation',
  bookings: 'Bookings',
  details: 'Details',
  final: 'Final stretch',
  event: 'Event day',
};

export const PHASE_ORDER: TaskPhase[] = ['foundation', 'bookings', 'details', 'final', 'event'];

export const COST_BAND_LABELS: Record<CostBand, string> = {
  free: 'No added cost',
  low: 'Low cost',
  medium: 'Mid budget',
  splurge: 'Splurge',
};

export const EFFORT_LABELS: Record<Effort, string> = {
  low: 'Easy to do',
  medium: 'Some planning',
  high: 'Hands-on',
};

/* ------------------------------------------------------------------ */
/* Budget                                                              */
/* ------------------------------------------------------------------ */

export interface BudgetCategoryDef {
  id: string;
  label: string;
  itemLabel: string;
  share: number;
  color: string;
  variableShare: number;
  description: string;
}

const WEDDING_CATEGORIES: BudgetCategoryDef[] = [
  {
    id: 'venue',
    label: 'Venue & rentals',
    itemLabel: 'Venue hire',
    share: 20,
    color: '#4C6B57',
    variableShare: 0.1,
    description: 'The space, tables, chairs, and the basics that come with the room.',
  },
  {
    id: 'catering',
    label: 'Food & beverage',
    itemLabel: 'Catering & drinks',
    share: 28,
    color: '#B4472C',
    variableShare: 1,
    description: 'Welcome drinks, dinner, service, and late-night bites.',
  },
  {
    id: 'photography',
    label: 'Photography',
    itemLabel: 'Photographer & videographer',
    share: 10,
    color: '#3F5D7A',
    variableShare: 0.15,
    description: 'The people who help you remember how the day felt.',
  },
  {
    id: 'attire',
    label: 'Attire & beauty',
    itemLabel: 'Attire, alterations & beauty',
    share: 8,
    color: '#8B5E83',
    variableShare: 0,
    description: 'Outfits, alterations, hair, makeup, and the comfortable shoes.',
  },
  {
    id: 'decor',
    label: 'Decor & atmosphere',
    itemLabel: 'Decor & styling',
    share: 9,
    color: '#C08A3E',
    variableShare: 0.25,
    description: 'Lighting, tablescapes, signage, and the details guests notice.',
  },
  {
    id: 'music',
    label: 'Music & entertainment',
    itemLabel: 'Music & entertainment',
    share: 7,
    color: '#2F7D75',
    variableShare: 0.1,
    description: 'Ceremony music, dancing, and the moments between.',
  },
  {
    id: 'flowers',
    label: 'Flowers',
    itemLabel: 'Florals',
    share: 5,
    color: '#A24B5B',
    variableShare: 0.15,
    description: 'Bouquets, arrangements, and any living centrepieces.',
  },
  {
    id: 'stationery',
    label: 'Stationery',
    itemLabel: 'Invitations & stationery',
    share: 3,
    color: '#7C7463',
    variableShare: 0.6,
    description: 'Invitations, menus, place cards, and signage.',
  },
  {
    id: 'cake',
    label: 'Cake & desserts',
    itemLabel: 'Cake & desserts',
    share: 2,
    color: '#C57F5A',
    variableShare: 0.75,
    description: 'The centrepiece dessert — or a table full of them.',
  },
  {
    id: 'rings',
    label: 'Rings & keepsakes',
    itemLabel: 'Rings & keepsakes',
    share: 4,
    color: '#5B5F73',
    variableShare: 0,
    description: 'Rings, gifts, and the small things you keep.',
  },
  {
    id: 'transport',
    label: 'Transport',
    itemLabel: 'Transport & logistics',
    share: 4,
    color: '#6B8A4C',
    variableShare: 0.2,
    description: 'Getting you, your people, and your supplies where they need to be.',
  },
];

const BIRTHDAY_CATEGORIES: BudgetCategoryDef[] = [
  {
    id: 'venue',
    label: 'Venue & rentals',
    itemLabel: 'Venue or hosting setup',
    share: 18,
    color: '#4C6B57',
    variableShare: 0.15,
    description: 'A rented space, a backyard setup, or the bits that make hosting easier.',
  },
  {
    id: 'food',
    label: 'Food & drink',
    itemLabel: 'Food, drinks & service',
    share: 24,
    color: '#B4472C',
    variableShare: 1,
    description: 'The menu, the mocktails, and enough snacks for the in-between moments.',
  },
  {
    id: 'cake',
    label: 'Cake & desserts',
    itemLabel: 'Cake & desserts',
    share: 10,
    color: '#C57F5A',
    variableShare: 0.8,
    description: 'A showstopper cake or a generous dessert table.',
  },
  {
    id: 'decor',
    label: 'Decor & atmosphere',
    itemLabel: 'Decor & styling',
    share: 14,
    color: '#C08A3E',
    variableShare: 0.3,
    description: 'Balloons, lighting, table settings, and a backdrop worth photographing.',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    itemLabel: 'Entertainment & activities',
    share: 15,
    color: '#2F7D75',
    variableShare: 0.2,
    description: 'Music, games, performers, and things to do beyond standing around.',
  },
  {
    id: 'favors',
    label: 'Favours & keepsakes',
    itemLabel: 'Favours & keepsakes',
    share: 5,
    color: '#8B5E83',
    variableShare: 1,
    description: 'Small take-homes that feel personal rather than obligatory.',
  },
  {
    id: 'invitations',
    label: 'Invitations',
    itemLabel: 'Invitations & signage',
    share: 4,
    color: '#7C7463',
    variableShare: 0.8,
    description: 'The invite, the reminder, the welcome sign.',
  },
  {
    id: 'photography',
    label: 'Photography',
    itemLabel: 'Photographer',
    share: 6,
    color: '#3F5D7A',
    variableShare: 0.2,
    description: 'Someone to capture the people, not just the decor.',
  },
  {
    id: 'supplies',
    label: 'Supplies',
    itemLabel: 'Supplies & rentals',
    share: 4,
    color: '#6B8A4C',
    variableShare: 0.7,
    description: 'Candles, plates, activities, and the emergency kit.',
  },
];

const COMMUNITY_CATEGORIES: BudgetCategoryDef[] = [
  {
    id: 'venue',
    label: 'Venue & site',
    itemLabel: 'Venue or public space',
    share: 16,
    color: '#4C6B57',
    variableShare: 0.15,
    description: 'The site, permits for the space, and basic infrastructure.',
  },
  {
    id: 'food',
    label: 'Food & drink',
    itemLabel: 'Food, drink & service',
    share: 22,
    color: '#B4472C',
    variableShare: 1,
    description: 'Food trucks, a potluck, or a shared meal.',
  },
  {
    id: 'promotion',
    label: 'Promotion',
    itemLabel: 'Promotion & outreach',
    share: 11,
    color: '#3F5D7A',
    variableShare: 0.3,
    description: 'Getting the word out beyond the usual circle.',
  },
  {
    id: 'entertainment',
    label: 'Programme',
    itemLabel: 'Programme & entertainment',
    share: 15,
    color: '#2F7D75',
    variableShare: 0.2,
    description: 'Performers, workshops, speakers, and things to do.',
  },
  {
    id: 'equipment',
    label: 'Equipment',
    itemLabel: 'Sound, lighting & equipment',
    share: 12,
    color: '#C08A3E',
    variableShare: 0.2,
    description: 'Sound, power, lighting, tables, and accessible facilities.',
  },
  {
    id: 'decor',
    label: 'Decor & signage',
    itemLabel: 'Decor & wayfinding',
    share: 6,
    color: '#A24B5B',
    variableShare: 0.2,
    description: 'Welcome signs, clear wayfinding, and a sense of place.',
  },
  {
    id: 'supplies',
    label: 'Supplies',
    itemLabel: 'Supplies & materials',
    share: 6,
    color: '#6B8A4C',
    variableShare: 0.6,
    description: 'Everything from name tags to recycling stations.',
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    itemLabel: 'Accessibility support',
    share: 7,
    color: '#8B5E83',
    variableShare: 0.2,
    description: 'Interpreters, accessible transport, quiet space, and materials.',
  },
  {
    id: 'permits',
    label: 'Permits & safety',
    itemLabel: 'Permits, insurance & first aid',
    share: 5,
    color: '#5B5F73',
    variableShare: 0,
    description: 'The paperwork and safety planning that lets everyone relax.',
  },
];

export const BUDGET_CATEGORIES: Record<EventType, BudgetCategoryDef[]> = {
  wedding: WEDDING_CATEGORIES,
  birthday: BIRTHDAY_CATEGORIES,
  community: COMMUNITY_CATEGORIES,
};

export function budgetCategory(type: EventType, categoryId: string): BudgetCategoryDef | undefined {
  return BUDGET_CATEGORIES[type].find((category) => category.id === categoryId);
}

/* ------------------------------------------------------------------ */
/* Vendor checklist                                                    */
/* ------------------------------------------------------------------ */

export interface VendorCategoryDef {
  id: string;
  label: string;
  essential: boolean;
  questions: string[];
}

const commonAccessibilityQuestion = 'What accessibility features or adjustments can you offer?';

export const VENDOR_CATEGORIES: Record<EventType, VendorCategoryDef[]> = {
  wedding: [
    {
      id: 'venue',
      label: 'Venue',
      essential: true,
      questions: [
        'What is included in the hire fee?',
        'What are the load-in, sound, and curfew rules?',
        'What is the wet-weather plan?',
        commonAccessibilityQuestion,
      ],
    },
    {
      id: 'catering',
      label: 'Catering',
      essential: true,
      questions: [
        'How do you handle allergies and cross-contamination?',
        'What is included in the per-person price?',
        'When is the final headcount due?',
        'Is a tasting included?',
      ],
    },
    {
      id: 'photography',
      label: 'Photography',
      essential: true,
      questions: [
        'Can we see a full gallery from a similar event?',
        'How many hours and photographers are included?',
        'When do we receive the images, and who owns them?',
        'What is the backup plan if the lead photographer is ill?',
      ],
    },
    {
      id: 'officiant',
      label: 'Officiant',
      essential: true,
      questions: [
        'Can we review the ceremony script together?',
        'What are the legal requirements in our location?',
        'Do you offer a rehearsal?',
      ],
    },
    {
      id: 'music',
      label: 'Music & entertainment',
      essential: false,
      questions: [
        'Can we hear a live sample or see a set list?',
        'What sound equipment is included?',
        'How do you handle requests and announcements?',
        'What is the overtime rate?',
      ],
    },
    {
      id: 'flowers',
      label: 'Florist',
      essential: false,
      questions: [
        'Which flowers are in season on our date?',
        'Do you provide setup and breakdown?',
        'Can arrangements be reused between the ceremony and reception?',
      ],
    },
    {
      id: 'attire',
      label: 'Attire & beauty',
      essential: false,
      questions: [
        'What is the alteration and fitting timeline?',
        'Can the outfit be adjusted for comfort and mobility?',
        'Do you offer a hair and makeup trial?',
      ],
    },
    {
      id: 'cake',
      label: 'Cake & desserts',
      essential: false,
      questions: [
        'Can we taste options first?',
        'How do you handle allergies?',
        'What is the delivery and setup fee?',
      ],
    },
    {
      id: 'transport',
      label: 'Transport',
      essential: false,
      questions: [
        'What is included in the transfer time?',
        'Do you have accessible vehicles?',
        'What is the late-night return policy?',
      ],
    },
    {
      id: 'stationery',
      label: 'Stationery',
      essential: false,
      questions: [
        'Can you produce large-print or digital versions?',
        'What is the proofing process?',
        'What are the print and delivery timelines?',
      ],
    },
  ],
  birthday: [
    {
      id: 'venue',
      label: 'Venue',
      essential: true,
      questions: [
        'How long do we have the space, including setup?',
        'Is there a kitchen or food prep area?',
        'What is the weather backup plan?',
        commonAccessibilityQuestion,
      ],
    },
    {
      id: 'catering',
      label: 'Food & drink',
      essential: true,
      questions: [
        'How do you handle allergies and dietary needs?',
        'What is the minimum headcount?',
        'Can you provide kid-friendly and alcohol-free options?',
      ],
    },
    {
      id: 'cake',
      label: 'Cake & desserts',
      essential: true,
      questions: [
        'Can we taste options first?',
        'How do you handle allergies?',
        'How long can the cake stay out during the party?',
      ],
    },
    {
      id: 'entertainment',
      label: 'Entertainment',
      essential: true,
      questions: [
        'What is included in the performance or activity?',
        'How much space and power do you need?',
        'Can you adapt the energy for a mixed-age crowd?',
      ],
    },
    {
      id: 'photography',
      label: 'Photography',
      essential: false,
      questions: [
        'How many hours are included?',
        'Can we get a mix of candid and group photos?',
        'When will the gallery be ready?',
      ],
    },
    {
      id: 'decor',
      label: 'Decor & rentals',
      essential: false,
      questions: [
        'Is setup and collection included?',
        'What is the damage policy?',
        'Can you work with our accessibility needs?',
      ],
    },
    {
      id: 'invitations',
      label: 'Invitations',
      essential: false,
      questions: [
        'Can you deliver a digital version?',
        'What is the proofing and delivery timeline?',
      ],
    },
  ],
  community: [
    {
      id: 'venue',
      label: 'Venue',
      essential: true,
      questions: [
        'What are the opening, curfew, and noise rules?',
        'What is included in the site fee?',
        'What is the wet-weather plan?',
        'Which entrances and facilities are step-free?',
      ],
    },
    {
      id: 'permits',
      label: 'Permits & insurance',
      essential: true,
      questions: [
        'Which permits are required for the site, food, and sound?',
        'What insurance certificates do you need?',
        'Who is responsible for waste removal?',
        'What is the deadline for paperwork?',
      ],
    },
    {
      id: 'catering',
      label: 'Food & drink',
      essential: true,
      questions: [
        'How do you handle allergies and dietary needs?',
        'What food safety certification do you hold?',
        'Can you offer plentiful low-cost or vegetarian options?',
        'How will waste and packaging be managed?',
      ],
    },
    {
      id: 'accessibility',
      label: 'Accessibility support',
      essential: true,
      questions: [
        'What accessibility features are included?',
        'Can you provide interpreters, large-print material, or a quiet space?',
        'How will accessible transport and parking be communicated?',
        'What is the emergency evacuation plan for disabled guests?',
      ],
    },
    {
      id: 'safety',
      label: 'Safety & first aid',
      essential: true,
      questions: [
        'Who is the named first-aid lead?',
        'What is the incident and evacuation plan?',
        'How will volunteers be briefed on safeguarding?',
        'Do we need security or crowd management?',
      ],
    },
    {
      id: 'av',
      label: 'Sound & AV',
      essential: false,
      questions: [
        'What equipment and power are included?',
        'Is there a backup microphone or speaker?',
        'Can you caption or amplify for hearing support?',
      ],
    },
    {
      id: 'entertainment',
      label: 'Programme',
      essential: false,
      questions: [
        'What are the setup and sound requirements?',
        'Can the activity be adapted for different ages and abilities?',
        'Do you have safeguarding and insurance documents?',
      ],
    },
    {
      id: 'promotion',
      label: 'Promotion',
      essential: false,
      questions: [
        'Which channels reach the people we want to invite?',
        'Can material be produced in accessible formats?',
        'What is the deadline for print and translations?',
      ],
    },
  ],
};

export function vendorCategory(type: EventType, id: string): VendorCategoryDef | undefined {
  return (VENDOR_CATEGORIES[type] ?? []).find((category) => category.id === id);
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

export interface TimelineTemplate {
  title: string;
  description: string;
  offsetDays: number;
  phase: TaskPhase;
  priority: 'high' | 'medium' | 'low';
}

export const TIMELINE_TEMPLATES: Record<EventType, TimelineTemplate[]> = {
  wedding: [
    {
      title: 'Set the budget and guest count',
      description: 'Agree on the number that matters before falling in love with a venue.',
      offsetDays: 365,
      phase: 'foundation',
      priority: 'high',
    },
    {
      title: 'Book the venue',
      description: 'Check capacity, accessibility, curfew, and the wet-weather plan.',
      offsetDays: 360,
      phase: 'foundation',
      priority: 'high',
    },
    {
      title: 'Book photographer and videographer',
      description: 'Ask to see a full gallery, not just the highlight reel.',
      offsetDays: 330,
      phase: 'bookings',
      priority: 'high',
    },
    {
      title: 'Choose catering and schedule a tasting',
      description: 'Bring dietary requirements and ask about cross-contamination.',
      offsetDays: 300,
      phase: 'bookings',
      priority: 'high',
    },
    {
      title: 'Book officiant, music, and florist',
      description: 'The ceremony team sets the tone for the day.',
      offsetDays: 270,
      phase: 'bookings',
      priority: 'high',
    },
    {
      title: 'Send save-the-dates',
      description: 'Include the date, city, and a note about accessibility.',
      offsetDays: 240,
      phase: 'details',
      priority: 'medium',
    },
    {
      title: 'Order or shop for attire',
      description: 'Budget for alterations and comfortable shoes.',
      offsetDays: 210,
      phase: 'bookings',
      priority: 'medium',
    },
    {
      title: 'Send invitations',
      description: 'Ask about dietary needs and access requirements with the RSVP.',
      offsetDays: 180,
      phase: 'details',
      priority: 'high',
    },
    {
      title: 'Lock the menu, bar, and cake',
      description: 'Confirm the final headcount policy and allergy plan.',
      offsetDays: 150,
      phase: 'details',
      priority: 'high',
    },
    {
      title: 'Plan seating and the guest experience',
      description: 'Think about quiet corners, kids, and how people will move.',
      offsetDays: 120,
      phase: 'details',
      priority: 'medium',
    },
    {
      title: 'Book transport and finalise rentals',
      description: 'Include accessible vehicles and a late-night plan.',
      offsetDays: 90,
      phase: 'bookings',
      priority: 'medium',
    },
    {
      title: 'Collect RSVPs and confirm headcount',
      description: 'Chase the quiet guests and update the caterer.',
      offsetDays: 60,
      phase: 'final',
      priority: 'high',
    },
    {
      title: 'Confirm final payments and vendor schedules',
      description: 'Share load-in times, contacts, and the wet-weather plan.',
      offsetDays: 45,
      phase: 'final',
      priority: 'high',
    },
    {
      title: 'Share the run-of-show with your people',
      description: 'Give your crew a one-page version they can keep on their phones.',
      offsetDays: 30,
      phase: 'final',
      priority: 'medium',
    },
    {
      title: 'Pack the emergency kit and rehearse',
      description: 'Chargers, stain remover, safety pins, snacks, and a quiet moment.',
      offsetDays: 14,
      phase: 'final',
      priority: 'low',
    },
    {
      title: 'Final headcount and vendor confirmations',
      description: 'One last check that everyone knows where to be.',
      offsetDays: 3,
      phase: 'final',
      priority: 'high',
    },
    {
      title: 'Event day: arrive early and breathe',
      description: 'Hand off the checklist and let someone else hold the details.',
      offsetDays: 1,
      phase: 'event',
      priority: 'medium',
    },
  ],
  birthday: [
    {
      title: 'Set the budget, guest list, and vibe',
      description: 'Decide what the guest of honour actually wants from the day.',
      offsetDays: 60,
      phase: 'foundation',
      priority: 'high',
    },
    {
      title: 'Choose a venue or hosting plan',
      description: 'Check setup time, capacity, accessibility, and the weather plan.',
      offsetDays: 50,
      phase: 'foundation',
      priority: 'high',
    },
    {
      title: 'Pick a theme and colour palette',
      description: 'Let their personality lead, not a trend.',
      offsetDays: 40,
      phase: 'details',
      priority: 'medium',
    },
    {
      title: 'Book food, cake, and entertainment',
      description: 'Confirm allergies, kid-friendly options, and cancellation terms.',
      offsetDays: 35,
      phase: 'bookings',
      priority: 'high',
    },
    {
      title: 'Send invitations',
      description: 'Include dietary, accessibility, and gift guidance.',
      offsetDays: 28,
      phase: 'details',
      priority: 'high',
    },
    {
      title: 'Plan activities and a playlist',
      description: 'A few anchors are better than a packed schedule.',
      offsetDays: 21,
      phase: 'details',
      priority: 'medium',
    },
    {
      title: 'Order decor, favours, and supplies',
      description: 'Check delivery dates and what can be borrowed.',
      offsetDays: 14,
      phase: 'bookings',
      priority: 'medium',
    },
    {
      title: 'Confirm RSVPs and dietary needs',
      description: 'Update the food and cake counts.',
      offsetDays: 10,
      phase: 'final',
      priority: 'high',
    },
    {
      title: 'Create a run-of-show',
      description: 'Cake time, food time, and one person responsible for each.',
      offsetDays: 7,
      phase: 'final',
      priority: 'medium',
    },
    {
      title: 'Prep food, decor, and playlist',
      description: 'Do the jobs that can be done the day before.',
      offsetDays: 2,
      phase: 'final',
      priority: 'low',
    },
    {
      title: 'Event day: set up and celebrate',
      description: 'Put the phone down for the toast.',
      offsetDays: 1,
      phase: 'event',
      priority: 'medium',
    },
  ],
  community: [
    {
      title: 'Form a planning team and set the budget',
      description: 'Name a decision-maker, a treasurer, and a safety lead.',
      offsetDays: 120,
      phase: 'foundation',
      priority: 'high',
    },
    {
      title: 'Define the purpose and who it is for',
      description: 'Agree on what success looks like beyond attendance.',
      offsetDays: 110,
      phase: 'foundation',
      priority: 'medium',
    },
    {
      title: 'Secure the venue and permits',
      description: 'Start paperwork early; it is often the longest lead time.',
      offsetDays: 100,
      phase: 'foundation',
      priority: 'high',
    },
    {
      title: 'Confirm accessibility and safety plan',
      description: 'Visit the site with a disabled community member if possible.',
      offsetDays: 85,
      phase: 'foundation',
      priority: 'high',
    },
    {
      title: 'Recruit volunteers, partners, and vendors',
      description: 'Write down roles, shifts, and who to call on the day.',
      offsetDays: 70,
      phase: 'bookings',
      priority: 'high',
    },
    {
      title: 'Plan promotion and registration',
      description: 'Use accessible formats and more than one channel.',
      offsetDays: 60,
      phase: 'details',
      priority: 'medium',
    },
    {
      title: 'Book sound, equipment, and entertainment',
      description: 'Check power, quiet hours, captions, and backup gear.',
      offsetDays: 45,
      phase: 'bookings',
      priority: 'high',
    },
    {
      title: 'Confirm food, supplies, and signage',
      description: 'Lock food safety, waste, and wayfinding.',
      offsetDays: 30,
      phase: 'bookings',
      priority: 'high',
    },
    {
      title: 'Open registration and publish the schedule',
      description: 'Make the schedule readable and available offline.',
      offsetDays: 21,
      phase: 'details',
      priority: 'high',
    },
    {
      title: 'Finalise run-of-show and brief volunteers',
      description: 'Include the quiet room, first-aid point, and evacuation plan.',
      offsetDays: 14,
      phase: 'final',
      priority: 'high',
    },
    {
      title: 'Walk the venue and check accessibility',
      description: 'Test the route, restrooms, sound, and signage yourself.',
      offsetDays: 7,
      phase: 'final',
      priority: 'high',
    },
    {
      title: 'Load in and set up',
      description: 'Keep a printed copy of the contact sheet.',
      offsetDays: 2,
      phase: 'final',
      priority: 'medium',
    },
    {
      title: 'Event day: welcome and adapt',
      description: 'A calm welcome is part of the programme.',
      offsetDays: 1,
      phase: 'event',
      priority: 'medium',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Concept & idea content                                              */
/* ------------------------------------------------------------------ */

export interface ConceptTemplate {
  title: string;
  styles: StyleTag[];
  priorities: Priority[];
  palette: string[];
  summary: string;
}

export const CONCEPT_TEMPLATES: Record<EventType, ConceptTemplate[]> = {
  wedding: [
    {
      title: 'Garden Editorial',
      styles: ['outdoor', 'modern', 'minimal', 'elegant'],
      priorities: ['venue', 'photos', 'food'],
      palette: ['#3E5C4B', '#D9C7A7', '#F4EEE3', '#B4472C', '#2F3A35'],
      summary:
        'A loose, light-filled celebration that treats the table like a magazine spread: seasonal food, generous greenery, and room to wander.',
    },
    {
      title: 'The Heritage Table',
      styles: ['cultural', 'classic', 'elegant'],
      priorities: ['food', 'experiences', 'keepsakes'],
      palette: ['#9E3D2C', '#D9A441', '#F6EBDD', '#6D1F24', '#3E4A3D'],
      summary:
        'A warm, layered celebration where family recipes, music, and ritual take the lead — and every table tells a story.',
    },
    {
      title: 'Candlelit Courtyard',
      styles: ['classic', 'cozy', 'elegant'],
      priorities: ['decor', 'food', 'music'],
      palette: ['#2F3A35', '#C08A3E', '#F2E6D3', '#7E3E34', '#A9B39A'],
      summary:
        'An intimate evening built around pools of candlelight, a long table, and the feeling that the rest of the world can wait.',
    },
    {
      title: 'Disco Garden',
      styles: ['playful', 'retro', 'outdoor'],
      priorities: ['music', 'photos', 'experiences'],
      palette: ['#D94F70', '#F2A33A', '#2F7D75', '#F7E8D0', '#4B2E39'],
      summary:
        'A bright, irreverent garden party with a mirror ball in the trees, a dance floor that never quite empties, and dessert for dinner.',
    },
    {
      title: 'Modern Minimal',
      styles: ['modern', 'minimal', 'luxe'],
      priorities: ['venue', 'photos', 'guests'],
      palette: ['#24211D', '#F5F1E8', '#A9B39A', '#B4472C', '#C9BBA4'],
      summary:
        'Clean lines, excellent food, and no clutter. A celebration that trusts a few beautiful things to do the talking.',
    },
    {
      title: 'Coastal Bohemian',
      styles: ['bohemian', 'outdoor', 'minimal'],
      priorities: ['venue', 'decor', 'guests'],
      palette: ['#D8C3A5', '#5B7C8D', '#A24B5B', '#F4EEE3', '#6B8A4C'],
      summary:
        'Barefoot ease by the water: textured linen, local flowers, a relaxed shared meal, and sunset timed perfectly.',
    },
  ],
  birthday: [
    {
      title: 'Golden Hour Picnic',
      styles: ['cozy', 'outdoor', 'minimal'],
      priorities: ['food', 'guests', 'photos'],
      palette: ['#C08A3E', '#6B8A4C', '#F4EEE3', '#B4472C', '#8B5E83'],
      summary:
        'A slow afternoon of good snacks, soft blankets, and the kind of conversation that runs past sunset.',
    },
    {
      title: 'Studio Disco',
      styles: ['playful', 'retro', 'modern'],
      priorities: ['music', 'experiences', 'photos'],
      palette: ['#C2186B', '#6D4AA6', '#1E5D8A', '#F3D34A', '#F6E7D8'],
      summary:
        'A one-room house party with a mirror ball, a killer playlist, and a photo corner built for group shots.',
    },
    {
      title: 'Backyard Cinema',
      styles: ['cozy', 'retro', 'playful'],
      priorities: ['experiences', 'food', 'guests'],
      palette: ['#7D2A2A', '#1F2421', '#E8D8B8', '#D9A441', '#5B7C8D'],
      summary:
        'Blankets, popcorn, a projector, and a double bill chosen by the guest of honour. Low effort, high delight.',
    },
    {
      title: 'Garden Tea Party',
      styles: ['elegant', 'classic', 'outdoor'],
      priorities: ['food', 'decor', 'photos'],
      palette: ['#C77B8E', '#7C9A72', '#F6EBDD', '#D9A441', '#9E3D2C'],
      summary:
        'A generous table of small things: tea, tiny sandwiches, flowers in mismatched vases, and nowhere else to be.',
    },
    {
      title: 'Neighbourhood Block Party',
      styles: ['playful', 'cultural', 'outdoor'],
      priorities: ['music', 'food', 'experiences'],
      palette: ['#E07A2E', '#F3D34A', '#2F7D75', '#D94F70', '#F6EBDD'],
      summary:
        'Chalk on the pavement, a long shared table, a playlist built by the neighbours, and kids running the show.',
    },
    {
      title: 'The Craft Club',
      styles: ['diy', 'playful', 'cozy'],
      priorities: ['experiences', 'keepsakes', 'guests'],
      palette: ['#B5854A', '#D96C4A', '#7FA7B8', '#F4EEE3', '#6B8A4C'],
      summary:
        'A make-something afternoon with stations, snacks, and a table of finished things to take home.',
    },
  ],
  community: [
    {
      title: 'Night Market',
      styles: ['cultural', 'outdoor', 'cozy'],
      priorities: ['food', 'experiences', 'music'],
      palette: ['#9E3D2C', '#2F7D75', '#F3D34A', '#F6EBDD', '#3E4A3D'],
      summary:
        'A lantern-lit gathering of local food, makers, and music — built to feel busy without feeling crowded.',
    },
    {
      title: 'Open Streets Commons',
      styles: ['modern', 'outdoor', 'minimal'],
      priorities: ['accessibility', 'guests', 'venue'],
      palette: ['#3F5D7A', '#A9B39A', '#F3D34A', '#F4EEE3', '#24211D'],
      summary:
        'A calm, legible public gathering with clear wayfinding, places to rest, and something for every pace.',
    },
    {
      title: 'Harvest Gathering',
      styles: ['cozy', 'cultural', 'outdoor'],
      priorities: ['food', 'sustainability', 'keepsakes'],
      palette: ['#9E5B2C', '#C08A3E', '#6B8A4C', '#F4EEE3', '#5B3A2E'],
      summary:
        'A shared table at the turn of the season: local food, seed swaps, and a visible plan for leaving no trace.',
    },
    {
      title: "Makers' Yard",
      styles: ['diy', 'cozy', 'outdoor'],
      priorities: ['experiences', 'sustainability', 'guests'],
      palette: ['#B5854A', '#6B8A4C', '#3F5D7A', '#F4EEE3', '#B4472C'],
      summary:
        'A hands-on afternoon where neighbours teach, mend, make, and leave with something they did not arrive with.',
    },
    {
      title: 'Lantern Festival',
      styles: ['cultural', 'elegant', 'outdoor'],
      priorities: ['decor', 'music', 'photos'],
      palette: ['#2D3A6B', '#D9A441', '#A24B5B', '#F6EBDD', '#1F2421'],
      summary:
        'An evening procession of light, sound, and shared food — with a quiet route for anyone who needs it.',
    },
    {
      title: 'Classic Block Party',
      styles: ['playful', 'retro', 'cultural'],
      priorities: ['music', 'food', 'guests'],
      palette: ['#D94F70', '#F3D34A', '#2F7D75', '#F4EEE3', '#3F5D7A'],
      summary:
        'Chalk games, a borrowed sound system, a potluck table, and the simple pleasure of knowing your neighbours.',
    },
  ],
};

export type IdeaTag =
  | Priority
  | StyleTag
  | 'seasonal'
  | 'kids'
  | 'stationery'
  | 'sensory-friendly';

export interface IdeaTemplate {
  title: string;
  description: string;
  category: string;
  costBand: CostBand;
  effort: Effort;
  tags: IdeaTag[];
}

export const IDEA_POOL: Record<EventType, IdeaTemplate[]> = {
  wedding: [
    {
      title: 'A table for two, twice',
      description:
        'Use a small sweetheart table for the quiet moments and long communal tables for dinner so guests can settle in and talk.',
      category: 'Guest experience',
      costBand: 'low',
      effort: 'low',
      tags: ['guests', 'cozy', 'experiences'],
    },
    {
      title: 'Fifteen minutes of golden hour',
      description:
        'Build a short portrait window into the run-of-show just before sunset, then let your photographer steal you away for ten quiet minutes.',
      category: 'Photos',
      costBand: 'free',
      effort: 'low',
      tags: ['photos', 'outdoor', 'minimal'],
    },
    {
      title: 'A signature drink with a family story',
      description:
        'Name a cocktail and a zero-proof version after a place, recipe, or inside joke. Print the story on a small card.',
      category: 'Food & drink',
      costBand: 'low',
      effort: 'low',
      tags: ['food', 'cultural', 'keepsakes'],
    },
    {
      title: 'Living centrepieces',
      description:
        'Use potted herbs or small plants as centrepieces, then invite guests to take one home at the end of the night.',
      category: 'Decor',
      costBand: 'low',
      effort: 'medium',
      tags: ['decor', 'sustainability', 'keepsakes'],
    },
    {
      title: 'A letter wall',
      description:
        'Set out cards for guests to write a piece of advice or a favourite memory. Read them on your first anniversary.',
      category: 'Keepsakes',
      costBand: 'free',
      effort: 'low',
      tags: ['keepsakes', 'experiences', 'cozy'],
    },
    {
      title: 'Candlelit courtyard, borrowed light',
      description:
        'Cluster pillar candles and warm string lights instead of renting elaborate lighting. Check venue rules for open flames.',
      category: 'Decor',
      costBand: 'medium',
      effort: 'medium',
      tags: ['decor', 'venue', 'elegant'],
    },
    {
      title: 'Late-night comfort cart',
      description:
        'Surprise guests with fries, tacos, or another warm snack an hour before the end. It is often the thing people remember.',
      category: 'Food & drink',
      costBand: 'medium',
      effort: 'medium',
      tags: ['food', 'experiences', 'playful'],
    },
    {
      title: 'A quiet corner for the youngest guests',
      description:
        'Set up a low table with colouring, snacks, and a named adult. It gives kids a place to land and parents a chance to relax.',
      category: 'Guest experience',
      costBand: 'low',
      effort: 'low',
      tags: ['guests', 'kids', 'accessibility'],
    },
    {
      title: 'A sensory retreat',
      description:
        'Keep one room or corner away from speakers with soft seating, water, and dim light. Tell guests it exists.',
      category: 'Accessibility',
      costBand: 'low',
      effort: 'low',
      tags: ['accessibility', 'guests', 'cozy'],
    },
    {
      title: 'Digital-first stationery',
      description:
        'Use a beautifully designed digital invite and a small print run for guests who need it. Put the savings into food or photos.',
      category: 'Stationery',
      costBand: 'free',
      effort: 'low',
      tags: ['sustainability', 'minimal', 'stationery'],
    },
    {
      title: 'A living artist in the room',
      description:
        'Commission a local artist to paint the reception as it happens. It becomes both entertainment and a keepsake.',
      category: 'Photos',
      costBand: 'splurge',
      effort: 'medium',
      tags: ['photos', 'keepsakes', 'luxe'],
    },
    {
      title: 'A welcome ritual from home',
      description:
        'Open the ceremony with a short tradition that matters to your families, explained briefly for guests who are new to it.',
      category: 'Ceremony',
      costBand: 'low',
      effort: 'medium',
      tags: ['cultural', 'experiences', 'keepsakes'],
    },
    {
      title: 'A photo scavenger hunt',
      description:
        'Give each table a short list of candid moments to capture on disposable cameras or a shared album. Fewer posed photos, more real ones.',
      category: 'Guest experience',
      costBand: 'free',
      effort: 'low',
      tags: ['photos', 'playful', 'experiences'],
    },
    {
      title: 'Breakfast for dinner',
      description:
        'Trade the formal plated dinner for a generous brunch spread — pancakes, eggs, good coffee, and a make-your-own station.',
      category: 'Food & drink',
      costBand: 'low',
      effort: 'medium',
      tags: ['food', 'playful', 'cozy'],
    },
    {
      title: 'A choreographed first ten minutes',
      description:
        'Plan the first ten minutes after the ceremony: who greets whom, where drinks are, and how you get a moment alone. It sets the tone.',
      category: 'Guest experience',
      costBand: 'free',
      effort: 'low',
      tags: ['guests', 'venue', 'experiences'],
    },
  ],
  birthday: [
    {
      title: 'A photo corner with a point of view',
      description:
        'Choose one strong backdrop, a few props, and good light instead of a full photo booth. Ask a friend to be the unofficial photographer.',
      category: 'Photos',
      costBand: 'low',
      effort: 'medium',
      tags: ['photos', 'decor', 'playful'],
    },
    {
      title: 'The one-song dance party',
      description:
        'Give the guest of honour a three-song opening set and let the energy build from there. No DJ required.',
      category: 'Music',
      costBand: 'free',
      effort: 'low',
      tags: ['music', 'experiences', 'playful'],
    },
    {
      title: 'Build-your-own dessert bar',
      description:
        'Bowls of fruit, cream, sprinkles, and a few sauces turn one cake into an activity everyone can join.',
      category: 'Food & drink',
      costBand: 'low',
      effort: 'low',
      tags: ['food', 'experiences', 'kids'],
    },
    {
      title: 'A time capsule of the year',
      description:
        'Ask guests to bring one small object, note, or photo from the past year. Seal it with a date to reopen.',
      category: 'Keepsakes',
      costBand: 'free',
      effort: 'low',
      tags: ['keepsakes', 'experiences', 'cozy'],
    },
    {
      title: 'A playlist by the people who know them',
      description:
        'Ask five friends for one song each and build the soundtrack from the replies. Print the track list.',
      category: 'Music',
      costBand: 'free',
      effort: 'low',
      tags: ['music', 'keepsakes', 'guests'],
    },
    {
      title: 'Balloon arch, but better',
      description:
        'Skip the disposable arch for a cluster of reusable paper lanterns or fabric streamers that can be packed away.',
      category: 'Decor',
      costBand: 'low',
      effort: 'medium',
      tags: ['decor', 'sustainability', 'photos'],
    },
    {
      title: 'Backyard movie night',
      description:
        'A projector, a white sheet, blankets, and a snack table. Let the film be the activity.',
      category: 'Venue',
      costBand: 'medium',
      effort: 'medium',
      tags: ['experiences', 'cozy', 'venue'],
    },
    {
      title: 'A craft station with a real outcome',
      description:
        'Choose one simple make — friendship bracelets, tote bags, flower crowns — and staff it with one patient adult.',
      category: 'Guest experience',
      costBand: 'low',
      effort: 'medium',
      tags: ['experiences', 'diy', 'kids'],
    },
    {
      title: 'A surprise reel, three minutes max',
      description:
        'Collect short video clips from people who cannot be there and play them before the cake. Keep it short and sweet.',
      category: 'Keepsakes',
      costBand: 'free',
      effort: 'low',
      tags: ['photos', 'keepsakes', 'guests'],
    },
    {
      title: 'Late-night snack cart',
      description:
        'A tray of warm cookies, grilled cheese, or noodles at the point when people are about to leave. It buys another hour.',
      category: 'Food & drink',
      costBand: 'medium',
      effort: 'medium',
      tags: ['food', 'experiences', 'cozy'],
    },
    {
      title: 'An era-themed dress code',
      description:
        'Give people a low-stakes reason to dress up: a decade, a colour, or a beloved television show. Keep the guidance simple.',
      category: 'Guest experience',
      costBand: 'free',
      effort: 'low',
      tags: ['playful', 'retro', 'guests'],
    },
    {
      title: 'A sensory-friendly quiet corner',
      description:
        'Offer a low-light room with soft seating, noise-cancelling headphones, and a clear “take a break” invitation.',
      category: 'Accessibility',
      costBand: 'low',
      effort: 'low',
      tags: ['accessibility', 'guests', 'sensory-friendly'],
    },
    {
      title: 'A custom cake topper',
      description:
        'A small 3D-printed or hand-painted topper that references an inside joke makes a standard cake feel personal.',
      category: 'Keepsakes',
      costBand: 'low',
      effort: 'low',
      tags: ['keepsakes', 'decor', 'diy'],
    },
    {
      title: 'Neighbourhood scavenger hunt',
      description:
        'A short list of local landmarks and friendly challenges gets people moving without turning the party into a bootcamp.',
      category: 'Guest experience',
      costBand: 'low',
      effort: 'medium',
      tags: ['experiences', 'outdoor', 'playful'],
    },
    {
      title: 'A brunch birthday',
      description:
        'Daylight, coffee, and a generous table of pastries can be more relaxed — and more affordable — than an evening event.',
      category: 'Food & drink',
      costBand: 'medium',
      effort: 'low',
      tags: ['food', 'cozy', 'minimal'],
    },
  ],
  community: [
    {
      title: 'A potluck map',
      description:
        'Invite people to pin what they are bringing and where it comes from. It turns catering into a conversation.',
      category: 'Food & drink',
      costBand: 'low',
      effort: 'low',
      tags: ['food', 'cultural', 'guests'],
    },
    {
      title: 'A local makers’ market',
      description:
        'Invite a handful of neighbours to sell or show what they make. Keep stall fees low and prioritise local makers.',
      category: 'Programme',
      costBand: 'low',
      effort: 'high',
      tags: ['experiences', 'cultural', 'sustainability'],
    },
    {
      title: 'An open mic with a host',
      description:
        'A named host, a sign-up sheet, and a strict three-minute limit. The host is what makes it feel safe.',
      category: 'Programme',
      costBand: 'low',
      effort: 'medium',
      tags: ['music', 'experiences', 'guests'],
    },
    {
      title: 'An accessibility wayfinding team',
      description:
        'Station volunteers at entrances and decision points with clear maps, and give them the authority to reroute people.',
      category: 'Accessibility',
      costBand: 'low',
      effort: 'medium',
      tags: ['accessibility', 'guests', 'venue'],
    },
    {
      title: 'A repair café corner',
      description:
        'Pair a few people who can mend, sharpen, or rewire with neighbours who bring broken things. Add a sign-up list.',
      category: 'Sustainability',
      costBand: 'low',
      effort: 'high',
      tags: ['sustainability', 'experiences', 'diy'],
    },
    {
      title: 'A community story wall',
      description:
        'Ask people to add a photo, a memory, or a hope for the neighbourhood. Keep pens and large-print cards available.',
      category: 'Keepsakes',
      costBand: 'free',
      effort: 'low',
      tags: ['keepsakes', 'experiences', 'cultural'],
    },
    {
      title: 'A kids’ zone with a named lead',
      description:
        'A fenced or clearly bounded area, simple activities, water, and two adults on a rota. Ask parents what they need.',
      category: 'Guest experience',
      costBand: 'low',
      effort: 'medium',
      tags: ['kids', 'guests', 'accessibility'],
    },
    {
      title: 'Bike valet and a car-share board',
      description:
        'Secure bike parking and a ride-share meeting point make it easier to arrive without driving alone.',
      category: 'Accessibility',
      costBand: 'low',
      effort: 'medium',
      tags: ['sustainability', 'accessibility', 'guests'],
    },
    {
      title: 'A live food demo',
      description:
        'Ask a local cook to demonstrate one dish and share the recipe. It is entertainment, learning, and lunch in one.',
      category: 'Programme',
      costBand: 'low',
      effort: 'medium',
      tags: ['food', 'cultural', 'experiences'],
    },
    {
      title: 'A mural people can help paint',
      description:
        'Prime a large board, sketch the outline, and invite guests to fill it in. Display it somewhere public afterwards.',
      category: 'Decor',
      costBand: 'medium',
      effort: 'high',
      tags: ['decor', 'photos', 'experiences'],
    },
    {
      title: 'Borrowed lighting, not bought',
      description:
        'Ask the venue, partners, or neighbours to lend string lights and lamps. Label everything and return it clean.',
      category: 'Decor',
      costBand: 'low',
      effort: 'medium',
      tags: ['decor', 'sustainability', 'venue'],
    },
    {
      title: 'A volunteer thank-you table',
      description:
        'A visible table with water, snacks, and a real break rota tells volunteers they are not invisible.',
      category: 'Guest experience',
      costBand: 'free',
      effort: 'low',
      tags: ['guests', 'sustainability', 'experiences'],
    },
    {
      title: 'A quiet hour',
      description:
        'Publish one hour with lower sound, softer light, and no programme. It makes the whole event more accessible.',
      category: 'Accessibility',
      costBand: 'free',
      effort: 'low',
      tags: ['accessibility', 'guests', 'sensory-friendly'],
    },
    {
      title: 'A seed and seedling swap',
      description:
        'Invite gardeners to bring spare seeds or cuttings with a simple label. Pair it with a five-minute growing talk.',
      category: 'Sustainability',
      costBand: 'free',
      effort: 'low',
      tags: ['sustainability', 'keepsakes', 'experiences'],
    },
    {
      title: 'A local business raffle',
      description:
        'Ask nearby businesses for small prizes and use the raffle to collect sign-ups or feedback for the next event.',
      category: 'Programme',
      costBand: 'low',
      effort: 'medium',
      tags: ['experiences', 'guests', 'cultural'],
    },
    {
      title: 'A visible rain plan',
      description:
        'Publish what happens if it rains, where to go, and who decides. A plan people can see reduces anxiety.',
      category: 'Venue',
      costBand: 'low',
      effort: 'low',
      tags: ['venue', 'guests', 'outdoor'],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Local savings playbook                                              */
/* ------------------------------------------------------------------ */

export interface SavingsPlaybookEntry {
  id: string;
  title: string;
  detail: string;
  categories: string[];
  /** Fraction of the planned category spend that could be saved. */
  rate: number;
  eventTypes?: EventType[];
}

export const SAVINGS_PLAYBOOK: SavingsPlaybookEntry[] = [
  {
    id: 'digital-invites',
    title: 'Send a digital first invite',
    detail:
      'Use a designed digital invitation and print only for guests who need a physical copy. Most of the cost is in print and postage.',
    categories: ['stationery', 'invitations'],
    rate: 0.6,
  },
  {
    id: 'playlist',
    title: 'Build a playlist instead of booking a DJ',
    detail:
      'A curated playlist, a good speaker, and one friend in charge of transitions can replace a full DJ package for a smaller room.',
    categories: ['music', 'entertainment'],
    rate: 0.5,
    eventTypes: ['wedding', 'birthday'],
  },
  {
    id: 'dessert-table',
    title: 'Serve a dessert table instead of a tiered cake',
    detail:
      'A smaller cutting cake plus a generous dessert spread usually costs less and gives more people something they can eat.',
    categories: ['cake'],
    rate: 0.4,
  },
  {
    id: 'borrowed-decor',
    title: 'Borrow or rent the big decor pieces',
    detail:
      'Ask your venue, community group, or neighbours about lanterns, vases, and signage before buying. Label and return everything.',
    categories: ['decor'],
    rate: 0.35,
  },
  {
    id: 'diy-centrepieces',
    title: 'Keep centrepieces simple and seasonal',
    detail:
      'One in-season stem, a clean vessel, and a handwritten number often looks better than a complex arrangement — and costs less.',
    categories: ['flowers', 'decor'],
    rate: 0.3,
  },
  {
    id: 'signature-drinks',
    title: 'Offer two signatures instead of a full bar',
    detail:
      'A batched cocktail, a zero-proof option, wine, and beer cover most crowds without the cost and waste of a full bar.',
    categories: ['catering', 'food'],
    rate: 0.15,
  },
  {
    id: 'weekday-venue',
    title: 'Ask about a weekday or shoulder-season rate',
    detail:
      'Venues often have more flexibility outside peak Saturdays. Ask directly — the listed price is not always the only price.',
    categories: ['venue'],
    rate: 0.12,
  },
  {
    id: 'vendor-bundle',
    title: 'Ask about a bundle across two services',
    detail:
      'Photography plus video, or catering plus rentals, can sometimes be packaged. Ask for the discount without removing essentials.',
    categories: ['photography', 'catering', 'equipment'],
    rate: 0.05,
  },
  {
    id: 'volunteer-photo',
    title: 'Invite a trusted hobby photographer',
    detail:
      'For a smaller gathering, a skilled friend with a clear shot list can capture the day. Pay them fairly or trade a service.',
    categories: ['photography'],
    rate: 0.5,
    eventTypes: ['birthday', 'community'],
  },
  {
    id: 'potluck',
    title: 'Turn the meal into a shared table',
    detail:
      'A potluck with a sign-up sheet, a few anchor dishes, and clear allergen labels can feed a crowd for much less.',
    categories: ['catering', 'food'],
    rate: 0.25,
    eventTypes: ['community'],
  },
  {
    id: 'borrow-av',
    title: 'Borrow sound and lighting from a partner',
    detail:
      'Libraries, schools, and community groups often lend equipment. Confirm power, insurance, and a backup microphone.',
    categories: ['equipment', 'av'],
    rate: 0.4,
    eventTypes: ['community'],
  },
];

export const BUDGET_TIPS: Record<EventType, Array<{ title: string; detail: string }>> = {
  wedding: [
    {
      title: 'Decide the three things that matter most',
      detail:
        'Protect the parts guests will remember — often food, music, and photos — and stay flexible on the rest.',
    },
    {
      title: 'Ask every venue for the full cost',
      detail:
        'Service charges, staffing, corkage, and cleanup can add 20–30% to the headline hire fee.',
    },
  ],
  birthday: [
    {
      title: 'Pick one headline moment',
      detail:
        'A great cake, a performance, or a meaningful activity is enough. You do not need all three.',
    },
    {
      title: 'Keep the guest list honest',
      detail:
        'Every extra guest adds food, drink, favours, and space. Decide the number before the theme.',
    },
  ],
  community: [
    {
      title: 'Budget for accessibility from the start',
      detail:
        'Interpreters, accessible transport, and quiet space are core costs, not add-ons. Bake them into the first draft.',
    },
    {
      title: 'Ask partners for in-kind support',
      detail:
        'Local businesses may lend equipment or offer prizes in exchange for visible acknowledgement.',
    },
  ],
};
