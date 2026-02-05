import { MODEL_CACHE, MODEL_URL, PROFILE_LIMITS, PROFILES } from "./constants.js";
import { state } from "./state.js";
import {
  applyProfile,
  clampText,
  populateProfileSelect,
  populateResolutionAndSteps,
  setMessage,
  setPreset,
  setStatus,
  ui,
  updateCharCounts,
} from "./ui.js";

/**
 * Generate a random seed within 32-bit signed integer range.
 * @returns {number}
 */
function randomSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

/**
 * Resolve a numeric seed from input or generate one.
 * @returns {number}
 */
function getSeed() {
  const value = Number(ui.seed.value);
  if (Number.isFinite(value) && ui.seed.value !== "") {
    return value;
  }
  return randomSeed();
}

/**
 * Format a byte count for display.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** index;
  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[index]}`;
}

/**
 * Update cache and storage metrics.
 * @returns {Promise<void>}
 */
async function updateCacheStatus() {
  const cache = await caches.open(MODEL_CACHE);
  const keys = await cache.keys();
  if (keys.length === 0) {
    ui.cacheStatus.textContent = "0 MB";
    if (ui.cacheDetails) {
      ui.cacheDetails.textContent = "0 MB";
    }
    if (ui.storageDetails) {
      const estimate = await navigator.storage?.estimate?.();
      if (estimate) {
        ui.storageDetails.textContent = `${formatBytes(estimate.usage)} / ${formatBytes(
          estimate.quota
        )}`;
      } else {
        ui.storageDetails.textContent = "Unavailable";
      }
    }
    return;
  }
  let totalSize = 0;
  let sizeKnown = false;
  for (const request of keys) {
    const response = await cache.match(request);
    if (response?.headers?.get("content-length")) {
      totalSize += Number(response.headers.get("content-length"));
      sizeKnown = true;
    }
  }
  const cacheDisplay = sizeKnown ? formatBytes(totalSize) : "Unknown";
  ui.cacheStatus.textContent = cacheDisplay;
  if (ui.cacheDetails) {
    ui.cacheDetails.textContent = cacheDisplay;
  }
  if (ui.storageDetails) {
    const estimate = await navigator.storage?.estimate?.();
    if (estimate) {
      ui.storageDetails.textContent = `${formatBytes(estimate.usage)} / ${formatBytes(
        estimate.quota
      )}`;
    } else {
      ui.storageDetails.textContent = "Unavailable";
    }
  }
}

/**
 * Ensure the model file is present in cache.
 * @returns {Promise<Response>}
 */
async function ensureModelCached() {
  const cache = await caches.open(MODEL_CACHE);
  const cached = await cache.match(MODEL_URL);
  if (cached) {
    ui.modelStatus.textContent = "Cached";
    await updateCacheStatus();
    return cached;
  }
  throw new Error("Model not cached");
}

/**
 * Download and cache the model file.
 * @returns {Promise<void>}
 */
async function downloadModel() {
  setMessage("Downloading model…");
  const response = await fetch(MODEL_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to download model");
  }
  const cache = await caches.open(MODEL_CACHE);
  await cache.put(MODEL_URL, response.clone());
  ui.modelStatus.textContent = "Cached";
  await updateCacheStatus();
  setMessage("Model cached for offline use.");
}

/**
 * Fetch the model size and update the download button label.
 * @returns {Promise<void>}
 */
async function updateModelSize() {
  try {
    const response = await fetch(MODEL_URL, { method: "HEAD" });
    if (!response.ok) return;
    const size = Number(response.headers.get("content-length"));
    if (Number.isFinite(size)) {
      const sizeMb = (size / 1024 / 1024).toFixed(2);
      ui.downloadModel.textContent = `Download model (${sizeMb} MB)`;
    }
  } catch {
    ui.downloadModel.textContent = "Download model";
  }
}

/**
 * Detect WebGPU support.
 * @returns {boolean}
 */
function supportsWebGPU() {
  return "gpu" in navigator;
}

/**
 * Initialize WebGPU and obtain a device.
 * @returns {Promise<boolean>}
 */
async function initWebGPU() {
  if (!supportsWebGPU()) {
    ui.webgpuStatus.textContent = "Unavailable";
    ui.profileStatus.textContent = "WebGPU required";
    return false;
  }

  try {
    state.gpuAdapter = await navigator.gpu.requestAdapter();
    if (!state.gpuAdapter) {
      ui.webgpuStatus.textContent = "Unavailable";
      ui.profileStatus.textContent = "Adapter not found";
      return false;
    }
    state.gpuDevice = await state.gpuAdapter.requestDevice();
    ui.webgpuStatus.textContent = "Available";
    return true;
  } catch (error) {
    ui.webgpuStatus.textContent = "Unavailable";
    ui.profileStatus.textContent = "Init failed";
    setMessage(`WebGPU init error: ${error.message}`);
    return false;
  }
}

/**
 * Run a simple compute shader to estimate device performance.
 * @returns {Promise<{score: number}>}
 */
async function runSelfTest() {
  if (!state.gpuDevice) return { score: 0 };
  const start = performance.now();
  const size = 64;
  const bufferSize = size * size * 4;
  const buffer = state.gpuDevice.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const readBuffer = state.gpuDevice.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const shaderCode = `
    @group(0) @binding(0) var<storage, read_write> outData : array<u32>;
    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
      if (gid.x >= ${size}u || gid.y >= ${size}u) { return; }
      let idx = gid.y * ${size}u + gid.x;
      outData[idx] = (idx * 1664525u + 1013904223u);
    }
  `;
  const module = state.gpuDevice.createShaderModule({ code: shaderCode });
  const pipeline = state.gpuDevice.createComputePipeline({
    layout: "auto",
    compute: { module, entryPoint: "main" },
  });
  const bindGroup = state.gpuDevice.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer } }],
  });
  const encoder = state.gpuDevice.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(size / 8), Math.ceil(size / 8));
  pass.end();
  encoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, bufferSize);
  state.gpuDevice.queue.submit([encoder.finish()]);
  await state.gpuDevice.queue.onSubmittedWorkDone();
  const end = performance.now();
  readBuffer.destroy();
  buffer.destroy();
  return { score: end - start };
}

/**
 * Estimate a profile based on GPU limits and self-test time.
 * @param {number} selfTestMs
 * @param {number} maxBufferSize
 * @returns {string}
 */
function estimateProfile(selfTestMs, maxBufferSize) {
  const isIPhone = /iPhone/.test(navigator.userAgent);
  if (isIPhone) {
    return "UltraLow";
  }
  if (maxBufferSize < 64 * 1024 * 1024) {
    return "UltraLow";
  }
  if (maxBufferSize < 128 * 1024 * 1024) {
    return "Low";
  }
  if (maxBufferSize < 256 * 1024 * 1024) {
    return "Medium";
  }
  if (selfTestMs > 35) {
    return "Low";
  }
  if (selfTestMs > 20) {
    return "Medium";
  }
  return "High";
}

/**
 * Detect the device profile using runtime checks.
 * @returns {Promise<string>}
 */
async function detectProfile() {
  if (!state.gpuDevice) return "UltraLow";
  const selfTest = await runSelfTest();
  const maxBufferSize = state.gpuAdapter.limits.maxBufferSize || 0;
  return estimateProfile(selfTest.score, maxBufferSize);
}

/**
 * Update the generation progress bar.
 * @param {number} value
 */
function updateProgress(value) {
  ui.progress.hidden = false;
  ui.progressBar.style.width = `${value}%`;
}

/**
 * Reset the progress bar to the hidden state.
 */
function resetProgress() {
  ui.progress.hidden = true;
  ui.progressBar.style.width = "0%";
}

/**
 * Update the device profile hint copy.
 */
function updateDeviceProfileHint() {
  if (!ui.deviceProfileHint) return;
  ui.deviceProfileHint.textContent = `Detected device profile: ${state.deviceProfile}. You can override it if your hardware can handle more.`;
}

/**
 * Show a warning if the current settings exceed detected device limits.
 */
function updatePerformanceWarning() {
  if (!ui.performanceWarning) return;
  const deviceLimits = PROFILE_LIMITS[state.deviceProfile];
  if (!deviceLimits) return;

  const deviceIndex = PROFILES.indexOf(state.deviceProfile);
  const selectedIndex = PROFILES.indexOf(state.selectedProfile);
  const selectedSteps = Number(ui.steps.value);
  const selectedResolution = Number(ui.resolution.value);
  const maxDeviceSteps = Math.max(...deviceLimits.steps);
  const maxDeviceResolution = Math.max(...deviceLimits.resolutions);

  const warnings = [];
  if (selectedIndex > deviceIndex) {
    warnings.push("Profile higher than the detected device capability.");
  }
  if (selectedSteps > maxDeviceSteps) {
    warnings.push(`Steps exceed the detected safe limit (${maxDeviceSteps}).`);
  }
  if (selectedResolution > maxDeviceResolution) {
    warnings.push(`Resolution exceeds the detected safe limit (${maxDeviceResolution}px).`);
  }

  if (warnings.length === 0) {
    ui.performanceWarning.hidden = true;
    ui.performanceWarning.textContent = "";
    return;
  }
  ui.performanceWarning.hidden = false;
  ui.performanceWarning.textContent = `Performance warning: ${warnings.join(" ")}`;
}

/**
 * Generate an image using a compute shader.
 * @param {{resolution: number, steps: number, seed: number}} params
 * @returns {Promise<void>}
 */
async function generateImage({ resolution, steps, seed }) {
  if (!state.gpuDevice) {
    throw new Error("WebGPU device not available");
  }
  state.cancelRequested = false;
  state.cancelReason = "";
  ui.cancel.disabled = false;
  updateProgress(5);

  const pixelCount = resolution * resolution;
  const bufferSize = pixelCount * 4;

  const storageBuffer = state.gpuDevice.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const readBuffer = state.gpuDevice.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  const paramsBuffer = state.gpuDevice.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const shaderCode = `
    struct Params {
      width: u32,
      height: u32,
      seed: u32,
      step: u32,
    };
    @group(0) @binding(0) var<storage, read_write> outData : array<u32>;
    @group(0) @binding(1) var<uniform> params : Params;

    fn lcg(x: u32) -> u32 {
      return 1664525u * x + 1013904223u;
    }

    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
      if (gid.x >= params.width || gid.y >= params.height) {
        return;
      }
      let idx = gid.y * params.width + gid.x;
      var x = params.seed ^ idx ^ params.step;
      x = lcg(x);
      let r = x & 255u;
      let g = (x >> 8u) & 255u;
      let b = (x >> 16u) & 255u;
      outData[idx] = (255u << 24u) | (b << 16u) | (g << 8u) | r;
    }
  `;

  const shaderModule = state.gpuDevice.createShaderModule({ code: shaderCode });
  const pipeline = state.gpuDevice.createComputePipeline({
    layout: "auto",
    compute: { module: shaderModule, entryPoint: "main" },
  });
  const bindGroup = state.gpuDevice.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: storageBuffer } },
      { binding: 1, resource: { buffer: paramsBuffer } },
    ],
  });

  const workgroups = Math.ceil(resolution / 8);

  for (let step = 1; step <= steps; step += 1) {
    if (state.cancelRequested) {
      break;
    }
    const params = new Uint32Array([resolution, resolution, seed, step]);
    state.gpuDevice.queue.writeBuffer(paramsBuffer, 0, params);

    const encoder = state.gpuDevice.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(workgroups, workgroups);
    pass.end();
    if (step === steps) {
      encoder.copyBufferToBuffer(storageBuffer, 0, readBuffer, 0, bufferSize);
    }
    state.gpuDevice.queue.submit([encoder.finish()]);
    await state.gpuDevice.queue.onSubmittedWorkDone();
    updateProgress(5 + Math.round((step / steps) * 95));
  }

  ui.cancel.disabled = true;

  if (state.cancelRequested) {
    storageBuffer.destroy();
    readBuffer.destroy();
    paramsBuffer.destroy();
    if (state.cancelReason === "timeout") {
      throw new Error("Generation timed out");
    }
    throw new Error("Generation cancelled");
  }

  await readBuffer.mapAsync(GPUMapMode.READ);
  const copy = new Uint8Array(readBuffer.getMappedRange()).slice();
  readBuffer.unmap();

  const imageData = new ImageData(
    new Uint8ClampedArray(copy.buffer),
    resolution,
    resolution
  );
  const canvas = ui.output;
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);

  storageBuffer.destroy();
  readBuffer.destroy();
  paramsBuffer.destroy();

  state.latestImageBitmap = await createImageBitmap(canvas);
  resetProgress();
}

/**
 * Reduce UI settings to lower resolutions/steps after failures.
 */
function degradeSettings() {
  const limits = PROFILE_LIMITS[state.selectedProfile];
  const currentRes = Number(ui.resolution.value);
  const currentSteps = Number(ui.steps.value);
  const lowerRes = limits.resolutions.find((res) => res < currentRes);
  if (lowerRes) {
    ui.resolution.value = lowerRes;
  }
  const lowerStep = limits.steps.find((step) => step < currentSteps);
  if (lowerStep) {
    ui.steps.value = lowerStep;
  }
  ui.negativePrompt.value = "";
  clampText();
  updatePerformanceWarning();
}

/**
 * Run the generation flow with optional retry logic.
 * @param {{retryOnFailure: boolean}} options
 * @returns {Promise<void>}
 */
async function runGenerationFlow({ retryOnFailure }) {
  const prompt = ui.prompt.value.trim();
  if (!prompt) {
    setMessage("Prompt is required.");
    return;
  }
  try {
    await ensureModelCached();
  } catch (error) {
    setMessage("Model missing. Please download the model first.");
    return;
  }

  const resolution = Number(ui.resolution.value);
  const steps = Number(ui.steps.value);
  const seed = getSeed();
  state.currentSeed = seed;
  ui.seed.value = seed;

  const timeoutMs = PROFILE_LIMITS[state.selectedProfile].timeoutMs;
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    state.cancelRequested = true;
    state.cancelReason = "timeout";
    ui.timeoutDialog.showModal();
  }, timeoutMs);

  setMessage("Generating…");

  try {
    await generateImage({ resolution, steps, seed });
    if (timedOut) {
      setMessage("Generation completed after timeout. Consider reducing settings.");
    } else {
      setMessage("Generation complete.");
    }
  } catch (error) {
    setMessage(`Generation error: ${error.message}`);
    if (retryOnFailure && state.cancelReason !== "user") {
      degradeSettings();
      setMessage("Retrying with reduced settings…");
      await runGenerationFlow({ retryOnFailure: false });
    } else if (!retryOnFailure) {
      setMessage(
        "Generation failed after reducing settings. Please lower the power profile or resolution."
      );
    }
  } finally {
    window.clearTimeout(timeoutId);
    ui.timeoutDialog.close();
    resetProgress();
    ui.cancel.disabled = true;
  }
}

/**
 * Copy the last generated image to the clipboard.
 * @returns {Promise<void>}
 */
async function copyToClipboard() {
  if (!state.latestImageBitmap) {
    setMessage("Nothing to copy yet.");
    return;
  }
  try {
    const blob = await new Promise((resolve) =>
      ui.output.toBlob(resolve, "image/png")
    );
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    setMessage("Copied to clipboard.");
  } catch (error) {
    setMessage(`Copy failed: ${error.message}`);
  }
}

/**
 * Download the last generated image as PNG.
 * @returns {Promise<void>}
 */
async function downloadImage() {
  const blob = await new Promise((resolve) =>
    ui.output.toBlob(resolve, "image/png")
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `impossible-${Date.now()}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Register the service worker for offline support.
 */
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setMessage("Service worker registration failed.");
    });
  }
}

/**
 * Wire up all UI event handlers.
 */
function wireEvents() {
  ui.powerSelect.addEventListener("change", (event) => {
    const value = event.target.value;
    applyProfile(value);
    updatePerformanceWarning();
  });
  ui.prompt.addEventListener("input", clampText);
  ui.negativePrompt.addEventListener("input", clampText);
  ui.resolution.addEventListener("change", updatePerformanceWarning);
  ui.steps.addEventListener("change", updatePerformanceWarning);
  ui.seedAuto.addEventListener("click", () => {
    ui.seed.value = "";
  });
  ui.downloadModel.addEventListener("click", async () => {
    try {
      await downloadModel();
    } catch (error) {
      setMessage(`Download failed: ${error.message}`);
    }
  });
  ui.generate.addEventListener("click", () => {
    runGenerationFlow({ retryOnFailure: true });
  });
  ui.cancel.addEventListener("click", () => {
    state.cancelRequested = true;
    state.cancelReason = "user";
    setMessage("Cancelling…");
  });
  ui.download.addEventListener("click", downloadImage);
  ui.copy.addEventListener("click", copyToClipboard);
  ui.again.addEventListener("click", () => {
    if (state.currentSeed === null) {
      runGenerationFlow({ retryOnFailure: true });
      return;
    }
    ui.seed.value = state.currentSeed;
    runGenerationFlow({ retryOnFailure: true });
  });
  ui.newSeed.addEventListener("click", () => {
    ui.seed.value = randomSeed();
    runGenerationFlow({ retryOnFailure: true });
  });
  ui.clearModel.addEventListener("click", async () => {
    await caches.delete(MODEL_CACHE);
    ui.modelStatus.textContent = "Not loaded";
    await updateCacheStatus();
    setMessage("Model cache cleared.");
  });
  ui.clearAll.addEventListener("click", async () => {
    await caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    ui.modelStatus.textContent = "Not loaded";
    await updateCacheStatus();
    setMessage("All app data cleared.");
  });
  ui.presetFast.addEventListener("click", () => {
    setPreset("fast");
    updatePerformanceWarning();
  });
  ui.presetBalanced.addEventListener("click", () => {
    setPreset("balanced");
    updatePerformanceWarning();
  });
  ui.presetBest.addEventListener("click", () => {
    setPreset("best");
    updatePerformanceWarning();
  });

  ui.timeoutReduce.addEventListener("click", () => {
    ui.timeoutDialog.close();
    degradeSettings();
    runGenerationFlow({ retryOnFailure: false });
  });
  ui.timeoutRetry.addEventListener("click", () => {
    ui.timeoutDialog.close();
    runGenerationFlow({ retryOnFailure: false });
  });
  ui.timeoutCancel.addEventListener("click", () => {
    ui.timeoutDialog.close();
    state.cancelRequested = true;
    state.cancelReason = "user";
    setMessage("Generation cancelled.");
  });
}

/**
 * Initialize the application.
 * @returns {Promise<void>}
 */
async function init() {
  registerServiceWorker();
  wireEvents();
  updateCharCounts();
  updateModelSize();

  const webgpuReady = await initWebGPU();
  if (!webgpuReady) {
    applyProfile("UltraLow");
    ui.generate.disabled = true;
    return;
  }
  state.deviceProfile = await detectProfile();
  state.selectedProfile = state.deviceProfile;
  applyProfile(state.selectedProfile);
  ui.profileStatus.textContent = `${state.selectedProfile} (auto)`;
  updateDeviceProfileHint();
  updatePerformanceWarning();
  await updateCacheStatus();

  try {
    await ensureModelCached();
  } catch {
    ui.modelStatus.textContent = "Not loaded";
  }

  if (document.visibilityState === "hidden") {
    state.cancelRequested = true;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      state.cancelRequested = true;
      setMessage("Tab hidden — generation cancelled to save memory.");
    }
  });
}

init();
