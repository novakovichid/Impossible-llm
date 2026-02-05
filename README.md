# Impossible LLM — Local WebGPU Image Generator (PWA)

A fully static, offline-capable PWA that generates images **locally in the browser** using WebGPU. No servers, no APIs, no analytics.

## Features

- WebGPU-based local image generation (no backend).
- Automatic power profile detection (UltraLow → High).
- Dynamic downgrade on OOM, timeout, or device errors.
- Offline-first PWA with cached assets and model file.
- Manual cache controls for model and app data.

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

## Model Replacement

The default model placeholder lives at:

```
/models/tiny-model.bin
```

To replace the model:

1. Drop your WebGPU-compatible model file into `/models/`.
2. Update `MODEL_URL` in `src/main.js` to point at the new file.
3. Rebuild with `npm run build`.

## Limitations

- Image quality prioritizes stability and speed.
- WebGPU support varies by browser and OS; some iOS versions may not enable WebGPU.
- The sample generator uses a lightweight noise-based shader for fast local output.
