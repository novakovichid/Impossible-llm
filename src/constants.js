export const PROFILES = ["UltraLow", "Low", "Medium", "High"];

export const PROFILE_LIMITS = {
  UltraLow: {
    resolutions: [256, 320],
    steps: [1, 2, 3, 4],
    promptLimit: 300,
    negativeLimit: 150,
    timeoutMs: 60000,
  },
  Low: {
    resolutions: [256, 384],
    steps: [2, 3, 4, 5, 6],
    promptLimit: 400,
    negativeLimit: 200,
    timeoutMs: 90000,
  },
  Medium: {
    resolutions: [256, 384, 512],
    steps: [4, 6, 8, 10, 12],
    promptLimit: 600,
    negativeLimit: 300,
    timeoutMs: 120000,
  },
  High: {
    resolutions: [256, 384, 512, 768],
    steps: [6, 8, 10, 12, 15, 20],
    promptLimit: 800,
    negativeLimit: 400,
    timeoutMs: 120000,
  },
};

export const MODEL_URL = "./models/tiny-model.bin";
export const MODEL_CACHE = "model-cache";
