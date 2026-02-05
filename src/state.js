/**
 * Global runtime state shared across UI and generation flow.
 * @type {{
 *  deviceProfile: string,
 *  selectedProfile: string,
 *  gpuDevice: GPUDevice | null,
 *  gpuAdapter: GPUAdapter | null,
 *  currentSeed: number | null,
 *  cancelRequested: boolean,
 *  cancelReason: string,
 *  latestImageBitmap: ImageBitmap | null
 * }}
 */
export const state = {
  deviceProfile: "UltraLow",
  selectedProfile: "UltraLow",
  gpuDevice: null,
  gpuAdapter: null,
  currentSeed: null,
  cancelRequested: false,
  cancelReason: "",
  latestImageBitmap: null,
};
