# CCC1021 SpaceTech — Size of Space & Learning Hub

Interactive cosmic scale visualization and self-learning platform for **CCC1021** (non-science university students). English UI with Traditional Chinese object names.

## Modes

| Mode | Path | Description |
|------|------|-------------|
| **Home** | `/` | Portal to choose tour or hub |
| **Enhanced Tour** | `/tour/` | 3D swipe tour with learn panel, compare, quiz, export |
| **Learning Hub** | `/hub/` | Six chapters with missions, reflections, chapter quizzes |
| **Instructor Dashboard** | `/teacher/` | Import student JSON exports (local, no backend) |

## Features

- 60 cosmic objects with 3D textures (self-hosted, no neal.fun CDN)
- Diameter labels with auto unit scaling
- Traditional Chinese names (繁體中文) for every object
- Chapter minimap, fun facts, misconceptions, volume comparisons
- Informal self-quizzes + optional graded export (JSON)
- Instructor dashboard with CSV export

## Local development

```bash
cd size-of-space
python3 -m http.server 8080
```

- Home: http://localhost:8080/
- Tour: http://localhost:8080/tour/
- Hub: http://localhost:8080/hub/
- Teacher: http://localhost:8080/teacher/

## Tests

```bash
cd size-of-space
node --test format-size.test.js
```

Live URL: **https://ccc1021-size-of-space.shorlol.workers.dev**

## Deploy to Cloudflare (production)

Requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (same as other `dr-data` Workers projects).

```bash
npm ci
npm test
npm run deploy
```

GitHub Actions deploys automatically on push to `main` (`.github/workflows/deploy-cloudflare.yml`).

Temporary preview (no login):

```bash
npm run deploy:preview
```

## Project structure

```
size-of-space/
  index.html          # Student portal (mode selector)
  tour/               # Mode 1 — enhanced 3D tour
  hub/                # Mode 2 — modular learning hub
  teacher/            # Instructor dashboard (separate site)
  shared/             # Chapters, quiz, progress, metadata, UI
  objects.js          # 60 object definitions
  textures-optimized/
  textures-small/
  stickers/
```

## Credit

Made for the **CCC1021 SpaceTech: Moon to Infinite and Beyond**
