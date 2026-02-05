# Impossible LLM — Local WebGPU Image Generator (PWA)

A fully static, offline-capable PWA that generates images **locally in the browser** using WebGPU. No servers, no APIs, no analytics.

## Features

- WebGPU-based local image generation (no backend).
- Automatic power profile detection (UltraLow → High).
- Dynamic downgrade on OOM, timeout, or device errors.
- Offline-first PWA with cached assets and model file.
- Manual cache controls for model and app data.

## User Guide

1. **Download the model** using the “Download model” button.
2. **Pick a power profile** in the Power panel.
   - The app auto-detects a safe profile, but you can override it if your hardware can handle more.
3. **Tune resolution + steps** in the Generation panel.
   - More steps increase quality, but they also increase runtime and memory pressure.
   - If the app shows a performance warning, the chosen settings exceed the detected safe limits.
4. **Generate** and export results with Download/Copy.

### Storage & cache

- **Model cache** shows the size of the cached model file.
- **Total storage used** shows overall browser storage usage and quota (when available).
- Use “Clear model cache” to remove the model only, or “Clear all app data” to reset everything.

## Repository Structure

```
/src
/index.html
/icon.svg
/manifest.webmanifest
/sw.js
/models
.github/workflows/pages.yml
README.md
```

## Local Development

1. Build the static site:

```bash
npm run build
```

2. Serve the generated `dist/` folder:

```bash
npm run preview
```

Open `http://localhost:4173`.

## Build

```bash
npm run build
```

The output is written to `dist/`.

## Deploy to GitHub Pages

Deployment uses GitHub Actions:

- Workflow: `.github/workflows/pages.yml`
- Build output: `dist/`

Push to `main` and GitHub Pages will deploy automatically.

## WebGPU & iOS Notes

- WebGPU is required for generation. If unavailable, generation is disabled.
- iPhone 15 Pro Max defaults to **UltraLow** and uses aggressive limits.
- If Safari interrupts generation (tab backgrounded), the app cancels generation and asks to retry.
- Timeouts:
  - Mobile profiles: 60 seconds
  - Desktop profiles: 120 seconds

## Model Catalog & Replacement

The default model placeholder lives at:

```
/models/tiny-model.bin
```

To add or replace models:

1. Drop your WebGPU-compatible model file into `/models/`.
2. Update `MODEL_CATALOG` in `src/constants.js` with the model URL, strength, and description.
3. Rebuild with `npm run build`.

## Limitations

- Image quality prioritizes stability and speed.
- WebGPU support varies by browser and OS; some iOS versions may not enable WebGPU.
- The sample generator uses a lightweight noise-based shader for fast local output.
