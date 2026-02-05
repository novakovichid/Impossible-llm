import { PROFILE_LIMITS, PROFILES } from "./constants.js";
import { state } from "./state.js";

export const ui = {
  webgpuStatus: document.getElementById("webgpu-status"),
  profileStatus: document.getElementById("profile-status"),
  modelStatus: document.getElementById("model-status"),
  cacheStatus: document.getElementById("cache-status"),
  cacheDetails: document.getElementById("cache-details"),
  storageDetails: document.getElementById("storage-details"),
  powerSelect: document.getElementById("power-select"),
  deviceProfileHint: document.getElementById("device-profile-hint"),
  prompt: document.getElementById("prompt"),
  promptCount: document.getElementById("prompt-count"),
  negativePrompt: document.getElementById("negative-prompt"),
  negativeCount: document.getElementById("negative-count"),
  resolution: document.getElementById("resolution"),
  steps: document.getElementById("steps"),
  performanceWarning: document.getElementById("performance-warning"),
  seed: document.getElementById("seed"),
  seedAuto: document.getElementById("seed-auto"),
  downloadModel: document.getElementById("download-model"),
  generate: document.getElementById("generate"),
  cancel: document.getElementById("cancel"),
  progress: document.querySelector(".progress"),
  progressBar: document.getElementById("progress-bar"),
  statusMessage: document.getElementById("status-message"),
  output: document.getElementById("output"),
  download: document.getElementById("download"),
  copy: document.getElementById("copy"),
  again: document.getElementById("again"),
  newSeed: document.getElementById("new-seed"),
  clearModel: document.getElementById("clear-model"),
  clearAll: document.getElementById("clear-all"),
  presetFast: document.getElementById("preset-fast"),
  presetBalanced: document.getElementById("preset-balanced"),
  presetBest: document.getElementById("preset-best"),
  timeoutDialog: document.getElementById("timeout-dialog"),
  timeoutReduce: document.getElementById("timeout-reduce"),
  timeoutRetry: document.getElementById("timeout-retry"),
  timeoutCancel: document.getElementById("timeout-cancel"),
};

/**
 * Update a status pill with text and a tone (optional).
 * @param {HTMLElement} element
 * @param {string} text
 * @param {string} [type]
 */
export function setStatus(element, text, type = "") {
  element.textContent = text;
  element.dataset.type = type;
}

/**
 * Update the inline status message below controls.
 * @param {string} message
 * @param {string} [tone]
 */
export function setMessage(message, tone = "") {
  ui.statusMessage.textContent = message;
  ui.statusMessage.dataset.tone = tone;
}

/**
 * Refresh character counters for prompt fields.
 */
export function updateCharCounts() {
  const limits = PROFILE_LIMITS[state.selectedProfile];
  ui.promptCount.textContent = `${ui.prompt.value.length} / ${limits.promptLimit}`;
  ui.negativeCount.textContent = `${ui.negativePrompt.value.length} / ${limits.negativeLimit}`;
}

/**
 * Clamp user text to profile limits and refresh counters.
 */
export function clampText() {
  const limits = PROFILE_LIMITS[state.selectedProfile];
  if (ui.prompt.value.length > limits.promptLimit) {
    ui.prompt.value = ui.prompt.value.slice(0, limits.promptLimit);
  }
  if (ui.negativePrompt.value.length > limits.negativeLimit) {
    ui.negativePrompt.value = ui.negativePrompt.value.slice(0, limits.negativeLimit);
  }
  updateCharCounts();
}

/**
 * Populate profile selection options based on available profiles.
 */
export function populateProfileSelect() {
  ui.powerSelect.innerHTML = "";
  const deviceIndex = PROFILES.indexOf(state.deviceProfile);
  PROFILES.forEach((profile, index) => {
    const option = document.createElement("option");
    option.value = profile;
    option.textContent = index > deviceIndex ? `${profile} (may be unstable)` : profile;
    ui.powerSelect.append(option);
  });
  ui.powerSelect.value = state.selectedProfile;
}

/**
 * Populate resolution and step controls for the active profile.
 */
export function populateResolutionAndSteps() {
  const limits = PROFILE_LIMITS[state.selectedProfile];
  ui.resolution.innerHTML = "";
  limits.resolutions.forEach((res) => {
    const option = document.createElement("option");
    option.value = res;
    option.textContent = `${res}x${res}`;
    ui.resolution.append(option);
  });
  ui.steps.innerHTML = "";
  limits.steps.forEach((step) => {
    const option = document.createElement("option");
    option.value = step;
    option.textContent = `${step}`;
    ui.steps.append(option);
  });
}

/**
 * Apply a selected profile and refresh dependent UI.
 * @param {string} profile
 */
export function applyProfile(profile) {
  state.selectedProfile = profile;
  ui.profileStatus.textContent = profile;
  populateProfileSelect();
  populateResolutionAndSteps();
  clampText();
}

/**
 * Apply preset values for fast, balanced, or best settings.
 * @param {"fast" | "balanced" | "best"} type
 */
export function setPreset(type) {
  const limits = PROFILE_LIMITS[state.selectedProfile];
  if (type === "fast") {
    ui.resolution.value = limits.resolutions[0];
    ui.steps.value = limits.steps[0];
  } else if (type === "balanced") {
    ui.resolution.value = limits.resolutions[Math.floor(limits.resolutions.length / 2)];
    ui.steps.value = limits.steps[Math.floor(limits.steps.length / 2)];
  } else if (type === "best") {
    ui.resolution.value = limits.resolutions[limits.resolutions.length - 1];
    ui.steps.value = limits.steps[limits.steps.length - 1];
  }
}
