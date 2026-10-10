# Educational Digital Pathology Viewer

An educational, non-diagnostic whole-slide viewer built with React, TypeScript, and OpenSeadragon. It displays Deep Zoom Image (DZI) tile pyramids: the browser requests only tiles visible at the current pan and zoom level.

## Run

```bash
npm install
npm run dev
```

## Convert an SVS slide to DZI

Install libvips with OpenSlide support, then put only de-identified/public SVS files in `data/raw/` (this directory is ignored by Git):

```bash
vips --vips-config | grep -i openslide
chmod +x scripts/convert-to-dzi.sh
./scripts/convert-to-dzi.sh data/raw/sample.svs slide-001
vipsheader -a data/raw/sample.svs | grep -Ei 'openslide.mpp|openslide.objective|width|height'
```

Update `src/data/slides.json` with the resulting local URL (`/slides/slide-001/slide.dzi`) and the extracted dimensions, MPP, and scan magnification. The generated tile directory is ignored because it can be large.

The initial slide configuration expects the locally generated `slide-001` DZI shown above. Do not commit raw SVS files or large generated tile folders; regenerate them from an appropriately licensed, de-identified source when needed.

## Scope and safety

Annotations and measurements are in-memory only and use level-0 image coordinates. Measurements are educational approximations, not clinically validated. Do not use this project for diagnosis or patient care, and never include PHI.
