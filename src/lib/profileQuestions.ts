import type { ProfileQuestion } from "./types";

/** Fallback used while DB questions are loading, and as seeds in the migration. */
export const DEFAULT_PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    key: "about",
    question: "What is your congregation's mission and values?",
    placeholder: "Share your guiding principles and what makes your community unique…",
    display_order: 1,
  },
  {
    key: "experience",
    question: "What experience does your congregation have serving the community during emergencies?",
    placeholder: "Past events, volunteer capacity, relationships with local emergency services…",
    display_order: 2,
  },
  {
    key: "languages",
    question: "What languages are spoken here, and who do you especially welcome?",
    placeholder: "e.g. English and Spanish spoken; Somali interpreter available on request…",
    display_order: 3,
  },
  {
    key: "accessibility",
    question: "What accessibility features or accommodations can visitors expect?",
    placeholder: "e.g. Wheelchair ramp at main entrance, accessible restrooms, hearing loop…",
    display_order: 4,
  },
];

/** Short display labels for each key — used in the resident-facing panel. */
export const PROFILE_LABELS: Record<ProfileQuestion["key"], string> = {
  about:         "Mission & values",
  experience:    "Emergency experience",
  languages:     "Languages & communities",
  accessibility: "Accessibility",
};
