# The Size of Space — CCC1021 SpaceTech

Standalone interactive visualization of cosmic scale, rebuilt from the [neal.fun Size of Space](https://neal.fun/size-of-space/) experience with CCC1021 branding and diameter labels.

## Features

- Same 3D object sequence, textures, and rendering (spheres, Saturn rings, black holes, galaxy planes)
- Diameter shown in auto-selected units (m → km → million km → light-years → billion light-years)
- Credit: **Made for the CCC1021 SpaceTech: Moon to Infinite and Beyond**

## Local development

```bash
cd size-of-space
python3 -m http.server 8080
```

Open http://localhost:8080

## Run size verification tests

```bash
cd size-of-space
node --test format-size.test.js
```

## Deploy to Cloudflare Pages

1. Create a Cloudflare Pages project connected to this repo.
2. Set **Build output directory** to `size-of-space`.
3. No build command required (static site).
4. Update `SITE_URL` in `config.js` to your Pages domain.

Or with Wrangler:

```bash
npx wrangler pages deploy size-of-space --project-name=size-of-space
```

## Configuration

Edit `size-of-space/config.js`:

| Variable | Purpose |
|----------|---------|
| `SITE_URL` | Canonical URL for meta tags |
| `SITE_NAME` | Header brand text |
| `CREDIT_LINE` | Title / end-screen credit |

Textures are loaded from `neal.fun` CDN to preserve the original visuals.
