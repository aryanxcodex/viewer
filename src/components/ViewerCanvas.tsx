import { useEffect, useRef, useState } from "react";
import OpenSeadragon from "openseadragon";
import type { Annotation, Measurement, Point, SelectedItem, Slide, Tool } from "../types";
import { eventToImagePoint } from "../lib/coords";
import { formatMeasurement } from "../lib/measure";

type Draft = { kind: "rectangle"; start: Point; end: Point } | { kind: "line"; start: Point; end: Point } | null;

interface ViewerCanvasProps {
  slide: Slide;
  tool: Tool;
  annotations: Annotation[];
  measurements: Measurement[];
  selected: SelectedItem;
  onAddAnnotation: (start: Point, end: Point) => void;
  onAddMeasurement: (start: Point, end: Point) => void;
  onSelect: (selection: SelectedItem) => void;
  onZoomChange: (zoom: number) => void;
  onError: (message: string) => void;
  onViewerReady: (controls: { zoomIn: () => void; zoomOut: () => void; fit: () => void; reset: () => void; toggleFullScreen: () => void }) => void;
}

export function ViewerCanvas(props: ViewerCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const latest = useRef(props);
  const draftRef = useRef<Draft>(null);
  const lastProjectionAt = useRef(0);
  const [draft, setDraft] = useState<Draft>(null);
  const [, setFrame] = useState(0);
  latest.current = props;

  useEffect(() => {
    if (!hostRef.current || viewerRef.current) return;
    const viewer = OpenSeadragon({
      element: hostRef.current, tileSources: latest.current.slide.dziUrl,
      showNavigator: true, showNavigationControl: false, visibilityRatio: 1,
      minZoomImageRatio: 0.8, maxZoomPixelRatio: 2,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: true, dragToPan: true, flickEnabled: true },
    });
    viewerRef.current = viewer;
    const point = (event: { position: OpenSeadragon.Point }) => eventToImagePoint(viewer, event.position);
    // OSD emits `animation` every frame. Projecting at 10 fps keeps overlays aligned
    // while avoiding a React render for every viewer frame.
    const redraw = () => {
      const now = performance.now();
      if (now - lastProjectionAt.current < 100) return;
      lastProjectionAt.current = now;
      setFrame((frame) => frame + 1);
      latest.current.onZoomChange(viewer.viewport.getZoom(true));
    };
    viewer.addHandler("animation", redraw);
    viewer.addHandler("open", redraw);
    viewer.addHandler("open-failed", () => latest.current.onError(`Could not open slide: ${latest.current.slide.dziUrl}`));
    viewer.addHandler("tile-load-failed", () => latest.current.onError("A slide tile failed to load. Check the DZI and tile files."));
    viewer.addHandler("canvas-press", (event: any) => {
      const active = latest.current.tool;
      if (active === "pan") return;
      event.preventDefaultAction = true;
      const start = point(event);
      const next: Draft = { kind: active, start, end: start };
      draftRef.current = next; setDraft(next);
    });
    viewer.addHandler("canvas-drag", (event: any) => {
      const current = draftRef.current;
      if (!current) return;
      event.preventDefaultAction = true;
      const next = { ...current, end: point(event) } as Draft;
      draftRef.current = next; setDraft(next);
    });
    viewer.addHandler("canvas-release", (event: any) => {
      const current = draftRef.current;
      if (!current) return;
      event.preventDefaultAction = true;
      const end = point(event);
      const dx = Math.abs(end.x - current.start.x), dy = Math.abs(end.y - current.start.y);
      if (dx > 2 || dy > 2) {
        if (current.kind === "rectangle") latest.current.onAddAnnotation(current.start, end);
        else latest.current.onAddMeasurement(current.start, end);
      }
      draftRef.current = null; setDraft(null);
    });
    viewer.addHandler("canvas-click", (event: any) => {
      if (latest.current.tool !== "pan" || !event.quick) return;
      const hit = point(event);
      const annotation = [...latest.current.annotations].reverse().find((item) => {
        if (!("width" in item.geometry)) return false;
        const g = item.geometry;
        return hit.x >= g.x && hit.x <= g.x + g.width && hit.y >= g.y && hit.y <= g.y + g.height;
      });
      latest.current.onSelect(annotation ? { kind: "annotation", id: annotation.id } : null);
    });
    latest.current.onViewerReady({
      zoomIn: () => viewer.viewport.zoomBy(1.5), zoomOut: () => viewer.viewport.zoomBy(1 / 1.5),
      fit: () => viewer.viewport.goHome(), reset: () => viewer.viewport.goHome(true),
      toggleFullScreen: () => viewer.setFullScreen(!viewer.isFullPage()),
    });
    return () => { viewer.destroy(); viewerRef.current = null; };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) viewer.open(props.slide.dziUrl);
  }, [props.slide.id, props.slide.dziUrl]);

  const project = (p: Point) => {
    const viewer = viewerRef.current;
    return viewer ? viewer.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(p.x, p.y)) : new OpenSeadragon.Point(0, 0);
  };
  const rectangle = (start: Point, end: Point) => {
    const a = project(start), b = project(end);
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
  };

  return <div className="viewer-shell">
    <div ref={hostRef} className="osd-host" aria-label="Whole slide image viewer" />
    <svg className="drawing-layer" aria-hidden="true">
      {props.annotations.map((annotation) => {
        if (!("width" in annotation.geometry)) return null;
        const g = annotation.geometry, box = rectangle({ x: g.x, y: g.y }, { x: g.x + g.width, y: g.y + g.height });
        const selected = props.selected?.kind === "annotation" && props.selected.id === annotation.id;
        return <g key={annotation.id}><rect className={selected ? "selected annotation" : "annotation"} {...box} /><text x={box.x} y={box.y - 6}>{annotation.label}</text></g>;
      })}
      {props.measurements.map((measurement) => {
        const a = project(measurement.p1), b = project(measurement.p2), selected = props.selected?.kind === "measurement" && props.selected.id === measurement.id;
        return <g key={measurement.id}><line className={selected ? "selected measurement" : "measurement"} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6}>{formatMeasurement(measurement.p1, measurement.p2, props.slide.mpp)}</text></g>;
      })}
      {draft && (() => { const box = rectangle(draft.start, draft.end); return draft.kind === "rectangle" ? <rect className="draft" {...box} /> : <line className="draft" x1={project(draft.start).x} y1={project(draft.start).y} x2={project(draft.end).x} y2={project(draft.end).y} />; })()}
    </svg>
  </div>;
}
