# Digital Pathology Viewer: Phased Implementation Guide

> **Audience:** agentic coding environments (Claude Code, Antigravity, Cursor, etc.)
> **Project:** Educational Digital Pathology Viewer (capstone, not a production or diagnostic product)
> **Stack:** React + TypeScript + Vite + OpenSeadragon (OSD). Optional tiny Node/Express API in a late phase.

Read this whole file before writing code. Work **one phase at a time**. Finish a phase's deliverables, confirm the app runs, then stop and summarize before moving on. Each phase builds on the previous one, so never break earlier phases.

---

## 0. Ground Rules for the Agent

1. **Keep it simple.** This is a capstone. Prefer small, readable code over abstractions. No over-engineering.
2. **Testing is light.** No strict test suites, coverage targets, or CI. A manual checklist per phase is enough. Add a small unit test only for pure helper functions (e.g. distance and coordinate math) if it is cheap. Never block progress on tests.
3. **Verify OpenSeadragon APIs against the official docs** (https://openseadragon.github.io/docs/). Do not invent or guess methods. If unsure, say so and check.
4. **Never load a full slide image into the browser.** Only DZI tiles are loaded.
5. **Annotations and measurements are stored in IMAGE coordinates** (pixels at level 0), never screen pixels, so they stay correct at every zoom level.
6. **Privacy:** all data must be synthetic or anonymized. No real PHI in code, JSON, screenshots, or commits.
7. **Out of scope (do NOT build):** authentication, databases, DICOM/DICOMweb, PACS/LIS, any AI/ML (tumor or cell detection, segmentation), multi-user collaboration, mobile optimization, microservices/cloud/Kubernetes, clinical or diagnostic features.
8. **Browser target:** modern Chrome and Edge only.
9. **Do not spend time on visual polish.** Labelled buttons with tooltips, a clear active-tool state, and visible error banners are enough.
10. **Document as you go.** Keep `README.md` current and maintain a short `AI_NOTES.md` (what was asked, accepted, changed, and why) for significant AI-assisted decisions.
11. At the end of each phase, print: what was built, how to run it, how to verify it, and any known limitations.

---

## 1. Target Project Structure

```
dp-viewer/
├── README.md
├── AI_NOTES.md
├── IMPLEMENTATION_PLAN.md          # this file
├── package.json
├── vite.config.ts
├── scripts/
│   └── convert-to-dzi.sh           # SVS -> DZI helper
├── data/
│   └── raw/                        # original .svs files (git-ignored)
├── public/
│   └── slides/
│       └── slide-001/
│           ├── slide.dzi
│           └── slide_files/        # tile pyramid (git-ignored if large)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts                    # Slide, Annotation, Measurement types
│   ├── components/
│   │   ├── ViewerCanvas.tsx        # the ONE component wrapping OpenSeadragon
│   │   ├── Toolbar.tsx             # tool buttons
│   │   ├── StatusBar.tsx           # zoom | magnification | MPP | dimensions
│   │   └── ErrorBanner.tsx
│   ├── hooks/
│   │   └── useOverlays.ts          # annotation and measurement rendering
│   ├── lib/
│   │   ├── coords.ts               # screen <-> viewport <-> image conversions
│   │   └── measure.ts              # distance math
│   └── data/
│       └── slides.json
└── server/                         # OPTIONAL (Phase 5 only)
```

Adapt as needed, but keep **one** OSD wrapper component.

---

## 2. Core Concepts the Agent Must Respect

**WSI, pyramid, tiles.** A whole slide image is huge (for example 100,000 x 80,000 px). It is stored as a multi-resolution pyramid (Level 0 is full resolution, and each next level is about half the size) cut into small tiles (for example 256 x 256). OSD requests only the tiles that cover the viewport at the current zoom.

**DZI.** Deep Zoom Image is a `.dzi` XML descriptor plus a folder of tiles per level, served as static files. OSD loads it natively with `tileSources: "/slides/slide-001/slide.dzi"`.

**MPP and magnification.**
- MPP = microns per pixel. About 0.25 µm/px is roughly 40x, and 0.5 µm/px is roughly 20x.
- Distance (µm) = pixel distance × MPP, where pixel distance = `sqrt((x2-x1)² + (y2-y1)²)` in image pixels.
- Estimated magnification = scan magnification × (screen pixels per image pixel). Show it as **approximate**.
- This is an educational approximation, not a clinically validated measurement.

**Data shapes**

```ts
// Slide metadata (slides.json). Missing fields display "N/A".
interface Slide {
  id: string;
  name: string;
  dziUrl: string;
  caseId?: string;
  specimen?: string;
  stain?: string;
  scanner?: string;
  magnification?: number; // scan magnification, e.g. 20 or 40
  width?: number;         // level-0 pixels
  height?: number;
  mpp?: number;           // microns per pixel
  scanDate?: string;
}

// Annotation (image coordinates, level 0)
interface Annotation {
  id: string;
  slideId: string;
  type: "rectangle" | "polygon" | "freehand";
  geometry:
    | { x: number; y: number; width: number; height: number }   // rectangle
    | { points: { x: number; y: number }[] };                   // polygon / freehand
  label: string;
  createdAt: string; // ISO string
}

// Measurement (image coordinates)
interface Measurement {
  id: string;
  slideId: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
}
```

---

# PHASE 1: Working Viewer with SVS → DZI and All Core Tools

**Goal:** a user can open the app, see a real whole slide image (converted from `.svs` to DZI) rendered by OpenSeadragon, and use **every core viewer tool**: navigation, annotation, and measurement. Everything later builds on this.

### 1.1 Project setup
- Scaffold with Vite: `npm create vite@latest dp-viewer -- --template react-ts`.
- Install: `npm i openseadragon` and `npm i -D @types/openseadragon`.
- Add `.gitignore` entries for `data/raw/`, and for large tile folders if they exceed a few MB (document how to regenerate them in the README).

### 1.2 SVS → DZI conversion
Create `scripts/convert-to-dzi.sh` and document it in the README.

```bash
# Requires libvips built with OpenSlide support (check: vips --vips-config | grep -i openslide)
# Usage: ./scripts/convert-to-dzi.sh data/raw/sample.svs slide-001
INPUT="$1"; ID="$2"
OUT="public/slides/$ID"
mkdir -p "$OUT"
vips dzsave "$INPUT" "$OUT/slide" --layout dz --tile-size 254 --overlap 1 --suffix .jpg[Q=85]
# Produces: $OUT/slide.dzi and $OUT/slide_files/
```

Also capture the real values for the slide JSON (width, height, MPP, magnification):
```bash
vipsheader -a data/raw/sample.svs | grep -Ei "openslide.mpp|openslide.objective|width|height"
# or: openslide-show-properties data/raw/sample.svs
```

**If libvips lacks OpenSlide support**, use one of these fallbacks (and tell the user which was used):
1. Install a libvips build with OpenSlide (brew, apt `libvips-tools` + `libopenslide`).
2. Use a small Python script with `openslide-python` to read the level and write tiles, or `pyvips` where OpenSlide is available.
3. Use a pre-converted public DZI sample, and note the source and license in the README.

**Sample data guidance:** use public, de-identified samples (OpenSlide test data, TCGA). Confirm the license. A **cropped region is fine**. Commit only small samples.

Create `src/data/slides.json` with one entry for now (`slide-001`) filled with the real values from the conversion. Use synthetic IDs such as `DEMO-CASE-001`.

### 1.3 OpenSeadragon viewer (`ViewerCanvas.tsx`)
- Wrap OSD in **one** React component. Create the viewer **once** in `useEffect`, and call `viewer.destroy()` on unmount. Guard against React 18 StrictMode double-mount.
- Config: `tileSources` from the slide's `dziUrl`, `showNavigator: true` (mini-map in a corner), `showNavigationControl: false` (we build our own labelled buttons), `visibilityRatio`, `minZoomImageRatio`, `gestureSettingsMouse` as sensible defaults.
- Do not re-render per frame. Keep OSD event handlers out of React state where possible, and throttle updates for the status bar.

### 1.4 Navigation tools (all working)
- Click-drag pan, mouse-wheel zoom.
- Buttons: **Zoom in**, **Zoom out**, **Fit to screen** (`viewport.goHome()`), **Reset view**, **Full-screen toggle** (`viewer.setFullScreen`). Verify the exact methods in the docs.
- **Mini-map / navigator** visible, and clicking it moves the view.
- **Status bar:** live zoom ("Zoom 4.2x"), approximate magnification, MPP, image width x height.

### 1.5 Annotation tools
- **Rectangle tool:** click the tool, then click-drag on the image to draw. While drawing, disable pan (for example by setting `event.preventDefaultAction = true` in the `canvas-drag` handler, or toggling mouse navigation; verify in the docs).
- Convert pointer positions to image coordinates (`viewport.pointFromPixel` → `viewport.viewportToImageCoordinates`).
- Render annotations as **OSD overlays or an SVG layer** so they stay aligned during pan and zoom.
- **Label:** after drawing, prompt for or inline-edit a short label (for example "Region of Interest"). Labels are editable later.
- **Select and delete:** click an annotation to select it (visible highlight), then press the Delete button (and the Delete key). Include a simple annotation list in the side panel.
- Annotations are **in-memory only** (React state). No database.

### 1.6 Measurement tool
- **Line tool:** click-drag (or click start, click end) to draw a line between two points in image coordinates.
- Show the length on the image next to the line.
- If `mpp` exists, show µm (switch to mm above about 1000 µm). If not, show pixels with an **"uncalibrated"** note.
- Measurements can be deleted (select + Delete).

### 1.7 Basic UI layout and errors
```
HEADER:      App name | Current slide name | [Full-screen]
SIDE PANEL:  Tools (Pan, Rectangle, Line, Delete) | Annotation list
MAIN AREA:   OpenSeadragon viewer (navigator in a corner)
STATUS BAR:  Zoom | Magnification / MPP | Image width x height
```
- Active tool has a clear visual state. Every button has a label or tooltip.
- If the DZI fails to load (`open-failed` event) or a tile fails, show a clear **ErrorBanner**. The app must not crash.

### Phase 1 Deliverables
- [ ] `npm install && npm run dev` launches the app.
- [ ] `scripts/convert-to-dzi.sh` converts an `.svs` into `public/slides/slide-001/slide.dzi` + tiles.
- [ ] The converted slide opens in OpenSeadragon, and DevTools → Network shows tiles loading as you pan and zoom (only visible tiles).
- [ ] Pan, wheel zoom, zoom buttons, fit, reset, full-screen, and navigator all work.
- [ ] Status bar shows live zoom, approximate magnification, MPP, and dimensions.
- [ ] Rectangle annotation: draw, label, select, delete, and stays aligned at every zoom level.
- [ ] Line measurement: draw, shows length in µm (or px + "uncalibrated").
- [ ] A broken DZI path shows an error banner, not a crash.
- [ ] README has setup, run, and SVS→DZI conversion steps.

**Manual check:** open the slide, zoom into tissue, draw and label a rectangle, zoom out and in (it must stay aligned), measure a feature, press Reset view.

---

# PHASE 2: Slide List and Metadata Panel

**Goal:** support multiple slides and show per-slide metadata.

### Tasks
- Convert **3 to 5** sample slides (or crops) and register them in `slides.json`. Use synthetic metadata.
- Build a **slide list** in the side panel. Selecting a slide opens it in the viewer and updates the header with its name.
- Reuse the **same** OSD viewer instance when switching, using `viewer.open(newDziUrl)` rather than recreating it.
- Build a **metadata panel** showing: Case ID, Slide ID, Specimen type, Stain, Scanner, Scan magnification, Image dimensions (px), MPP, and Date scanned. Any missing field shows `N/A`.
- Keep annotations and measurements **per slide** (filtered by `slideId`). Switching slides must not mix them up.
- A missing or invalid slide shows a clear error, and the app stays usable (other slides can still be selected).

### Phase 2 Deliverables
- [ ] 3 to 5 slides selectable from a list.
- [ ] Metadata panel updates on selection, with `N/A` for missing fields.
- [ ] Annotations and measurements are scoped per slide.
- [ ] An invalid slide entry shows an error banner and the app keeps working.

**Manual check:** switch between all slides, annotate on one, switch away and back, confirm the annotation is still there; add a bad entry to `slides.json` and confirm a graceful error.

---

# PHASE 3: Should-Have Features

**Goal:** richer annotation and quality-of-life features.

### Tasks
- **Polygon annotation:** click to add vertices, double-click to close. **Freehand annotation:** click-drag to draw a path (simplify points if needed). Both are stored in image coordinates, rendered via the SVG overlay, and support label, select, and delete.
- **Export / import annotations as JSON:** a button to download the current slide's annotations (and measurements) as a `.json` file, and a button to import one. Validate the shape defensively and show an error banner on invalid files.
- **Keyboard shortcuts** (show them in a small help tooltip): `V` pan, `R` rectangle, `L` line, `P` polygon, `Delete` delete selected, `F` fit, `0` reset, `Esc` cancel the current drawing or deselect.
- **Magnification indicator** polish: show "≈ 20x" style text in the status bar, clearly marked approximate.

### Phase 3 Deliverables
- [ ] Polygon and freehand annotations work and stay aligned while zooming.
- [ ] JSON export and import round-trips correctly.
- [ ] Keyboard shortcuts work and are listed in the UI.
- [ ] Magnification indicator shown and labelled approximate.

---

# PHASE 4: Robustness and UX Polish

**Goal:** make it demo-ready without over-polishing.

### Tasks
- Make sure errors never crash the app: invalid slide, bad DZI URL, failed tile, bad import file. Use one consistent `ErrorBanner` (dismissible).
- Add a small loading indicator while a slide opens.
- Confirm that the OSD viewer is created once and destroyed on unmount (no leaks on slide switches), and that pan/zoom stays smooth (no per-frame React re-renders).
- Tooltips on every control, and a clear active-tool highlight.
- Small cleanup: remove dead code, consistent naming, short comments on non-obvious logic (especially coordinate conversions).

### Phase 4 Deliverables
- [ ] No crashes from any of the invalid-input scenarios above.
- [ ] Loading state and error banners behave consistently.
- [ ] Smooth pan/zoom on the sample slides.

---

# PHASE 5 (OPTIONAL): Tiny Node/Express API

**Skip this phase if time is short.** Static JSON from Phase 1 to 4 is fully acceptable.

### Tasks
- Add `server/` with Express:
  - `GET /api/slides` returns the slide list.
  - `GET /api/slides/:id` returns one slide.
  - Optionally `GET` / `POST /api/slides/:id/annotations`, persisted to `annotations.json` on disk (no database).
- Frontend: fetch slides from the API with a fallback to the static `slides.json` if the API is unreachable.
- Do **not** add auth, a database, or any cloud infrastructure.

### Phase 5 Deliverables
- [ ] API serves slides (and optionally annotations) from JSON files.
- [ ] The frontend works with the API, and still works without it.

---

# PHASE 6: Documentation and Demo Prep

**Goal:** everything needed for the final demo and evaluation.

### Tasks
- **README.md:** what the project is, prerequisites (Node, libvips with OpenSlide), install, run, SVS→DZI conversion, sample data sources and licenses, and a note that it is not for diagnostic use.
- **Architecture diagram** (Mermaid in the README is fine):
  ```
  Browser → React + TypeScript App → OpenSeadragon Viewer → Static DZI tiles
  (optional) React App → Node.js REST API → slides.json / annotations.json
  ```
- **Short domain overview** (`docs/domain-overview.md`): what is digital pathology, what is a WSI, why pyramids and tiles, what OSD does, and what MPP means. Plain language, about one page.
- **Manual test checklist** (`docs/test-checklist.md`): the end-to-end scenario below. No automated test suite is required.
- **AI_NOTES.md** finalized.
- **Demo script** (5 to 10 minutes), showing network tiles loading while zooming and panning.

### End-to-end acceptance scenario
1. Open the app.
2. See the sample slide list.
3. Select a slide.
4. The viewer opens it.
5. Zoom into tissue.
6. Pan around.
7. Check metadata.
8. Create and label an annotation.
9. Measure a feature.
10. Reset the view or open another slide.

### Phase 6 Deliverables
- [ ] README, architecture diagram, domain overview, manual checklist, AI_NOTES.md.
- [ ] Demo script ready.

---

## Final Acceptance Checklist

- [ ] Application launches successfully.
- [ ] User can select a sample pathology slide.
- [ ] Slide opens using OpenSeadragon (converted from SVS to DZI).
- [ ] User can zoom and pan.
- [ ] User can reset / fit the image.
- [ ] Slide metadata can be viewed.
- [ ] User can create and delete a basic annotation.
- [ ] User can perform a basic distance measurement.
- [ ] Viewer handles invalid input without crashing.
- [ ] No real patient / PHI data is used.
- [ ] Code is documented, and the README explains how to run the app.
- [ ] The team can explain the WSI / tile / pyramid concept in the demo.

> **Remember:** a small, well-understood viewer beats a large one nobody can explain. If a phase is taking too long, ship the Must-Haves and move on.
