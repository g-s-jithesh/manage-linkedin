export const HUMANIZER_VARIANTS = {
  casual: "Casual: write like texting a smart friend. Contractions, short fragments, one light aside, no jargon.",
  professional: "Professional: calm, direct, credible. Concrete numbers and specifics over adjectives. No hype, no slang.",
  storyteller: "Storyteller: open mid-scene with a specific moment, then the lesson. Sensory detail, a turn, a quiet ending.",
} as const;

export type HumanizerVariant = keyof typeof HUMANIZER_VARIANTS;

export const isVariant = (v: unknown): v is HumanizerVariant =>
  typeof v === "string" && v in HUMANIZER_VARIANTS;

const RULES = `Also: never open with "In today's fast-paced world" or similar; no em dashes (use commas or periods); max 3 hashtags, only at the end; avoid "game-changer", "unlock", "journey", "leverage"; mix very short and longer sentences.`;

export const variantPrompt = (v: HumanizerVariant) => `\n      Style variant - ${HUMANIZER_VARIANTS[v]}\n      ${RULES}`;
