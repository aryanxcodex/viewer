# AI Notes

- Started Phase 1 from an empty workspace, using a small React/Vite/OpenSeadragon implementation rather than adding backend services.
- The local environment did not provide libvips or an SVS sample. The repository includes the requested SVS-to-DZI script, while the initial slide configuration deliberately uses OpenSeadragon's public Highsmith sample as a temporary development fallback. It must be replaced before a pathology demo.
- Annotation and measurement geometry is stored in image (level-0) coordinates and projected for rendering on each viewer animation frame.
- The UI was migrated to Tailwind CSS at the user's request. Small local shadcn-compatible Button and Tooltip primitives wrap the Radix Tooltip package, keeping the visual system lightweight while providing accessible tooltips for the drawing controls.
- A user-supplied SVS was converted locally with libvips/OpenSlide into `public/slides/slide-001/slide.dzi`. The static metadata records only synthetic case/display identifiers and the technical dimensions, MPP, scanner family, and objective magnification required by the viewer.
