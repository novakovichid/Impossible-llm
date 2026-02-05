/**
 * Supported power profiles ordered from lowest to highest performance.
 * @type {string[]}
 */
export const PROFILES = ["UltraLow", "Low", "Medium", "High"];

/**
 * Per-profile limits for UI and safety checks.
 * @type {Record<string, {resolutions: number[], steps: number[], promptLimit: number, negativeLimit: number, timeoutMs: number}>}
 */
export const PROFILE_LIMITS = {
  UltraLow: {
    resolutions: [256, 320],
    steps: [1, 2, 4, 6, 8, 10],
    promptLimit: 300,
    negativeLimit: 150,
    timeoutMs: 60000,
  },
  Low: {
    resolutions: [256, 384],
    steps: [2, 4, 6, 8, 10, 12, 15],
    promptLimit: 400,
    negativeLimit: 200,
    timeoutMs: 90000,
  },
  Medium: {
    resolutions: [256, 384, 512],
    steps: [4, 6, 8, 10, 12, 16, 20, 24],
    promptLimit: 600,
    negativeLimit: 300,
    timeoutMs: 120000,
  },
  High: {
    resolutions: [256, 384, 512, 768],
    steps: [6, 8, 10, 12, 16, 20, 24, 30, 40],
    promptLimit: 800,
    negativeLimit: 400,
    timeoutMs: 120000,
  },
};

/** @type {string} */
export const MODEL_CATALOG = [
  {
    id: "tiny",
    name: "Tiny",
    strength: "Low",
    sizeHint: "~15 MB",
    url: "./models/tiny-model.bin",
    description: "Fastest option for quick previews. Expect more noise and weak structure.",
  },
  {
    id: "base",
    name: "Base",
    strength: "Medium",
    sizeHint: "~150 MB",
    url: "./models/base-model.bin",
    description: "Balanced quality with better coherence and fewer artifacts.",
  },
  {
    id: "xl",
    name: "XL",
    strength: "High",
    sizeHint: "~600 MB",
    url: "./models/xl-model.bin",
    description: "Best clarity and detail, but the slowest and most memory-hungry.",
  },
];

/** @type {string} */
export const DEFAULT_MODEL_ID = "tiny";
/** @type {string} */
export const MODEL_CACHE = "model-cache";
