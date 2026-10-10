import { useEffect, useState } from "react";
import slides from "./data/slides.json";
import type { Annotation, Measurement, Point, SelectedItem, Slide, Tool } from "./types";
import { ViewerCanvas } from "./components/ViewerCanvas";
import { Toolbar } from "./components/Toolbar";
import { StatusBar } from "./components/StatusBar";
import { ErrorBanner } from "./components/ErrorBanner";
import { Button } from "./components/ui/button";
import { TooltipProvider } from "./components/ui/tooltip";
import { Edit3, Expand, FileImage, ListTree } from "lucide-react";

const demoSlide = slides[0] as Slide;
type ViewerControls = { zoomIn: () => void; zoomOut: () => void; fit: () => void; reset: () => void; toggleFullScreen: () => void };

export default function App() {
  const [tool, setTool] = useState<Tool>("pan");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [controls, setControls] = useState<ViewerControls | null>(null);

  const addAnnotation = (start: Point, end: Point) => {
    const label = window.prompt("Annotation label", "Region of Interest");
    if (label === null) return;
    const annotation: Annotation = {
      id: crypto.randomUUID(), slideId: demoSlide.id, type: "rectangle",
      geometry: { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) },
      label: label.trim() || "Region of Interest", createdAt: new Date().toISOString(),
    };
    setAnnotations((items) => [...items, annotation]);
    setSelected({ kind: "annotation", id: annotation.id });
  };
  const addMeasurement = (p1: Point, p2: Point) => {
    const measurement: Measurement = { id: crypto.randomUUID(), slideId: demoSlide.id, p1, p2 };
    setMeasurements((items) => [...items, measurement]);
    setSelected({ kind: "measurement", id: measurement.id });
  };
  const deleteSelected = () => {
    if (!selected) return;
    if (selected.kind === "annotation") setAnnotations((items) => items.filter((item) => item.id !== selected.id));
    else setMeasurements((items) => items.filter((item) => item.id !== selected.id));
    setSelected(null);
  };
  const editSelectedLabel = () => {
    if (selected?.kind !== "annotation") return;
    const current = annotations.find((item) => item.id === selected.id);
    if (!current) return;
    const label = window.prompt("Annotation label", current.label);
    if (label === null) return;
    setAnnotations((items) => items.map((item) => item.id === current.id ? { ...item, label: label.trim() || "Region of Interest" } : item));
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Delete") deleteSelected(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  return <TooltipProvider delayDuration={250}><main className="flex h-screen min-w-[900px] flex-col overflow-hidden bg-slate-100">
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-md bg-slate-800 p-2 text-white"><FileImage className="h-5 w-5" /></div><div><h1 className="text-base font-semibold text-slate-900">Digital Pathology Viewer</h1><p className="text-xs text-slate-500">{demoSlide.name} · {demoSlide.caseId}</p></div></div><Button variant="outline" onClick={() => controls?.toggleFullScreen()}><Expand className="mr-2 h-4 w-4" />Full-screen</Button></header>
    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    <div className="flex min-h-0 flex-1">
      <aside className="w-72 shrink-0 overflow-auto border-r border-slate-200 bg-white p-5">
        <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-3"><p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Current slide</p><p className="text-sm font-semibold text-slate-800">{demoSlide.name}</p><p className="mt-1 text-xs text-slate-500">{demoSlide.width?.toLocaleString()} × {demoSlide.height?.toLocaleString()} px</p></div>
        <Toolbar activeTool={tool} onToolChange={setTool} onZoomIn={() => controls?.zoomIn()} onZoomOut={() => controls?.zoomOut()} onFit={() => controls?.fit()} onReset={() => controls?.reset()} onDelete={deleteSelected} />
        <section className="pt-5"><div className="mb-3 flex items-center gap-2"><ListTree className="h-4 w-4 text-slate-500" /><h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Annotations & measurements</h2></div>
          {annotations.length === 0 && measurements.length === 0 && <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">No marks yet.</p>}
          <div className="space-y-2">{annotations.map((item) => <div className="flex gap-1" key={item.id}><Button variant={selected?.kind === "annotation" && selected.id === item.id ? "default" : "outline"} size="sm" className="min-w-0 flex-1 justify-start truncate" onClick={() => setSelected({ kind: "annotation", id: item.id })}>Rectangle: {item.label}</Button>{selected?.kind === "annotation" && selected.id === item.id && <Button variant="outline" size="icon" onClick={editSelectedLabel} title="Edit annotation label"><Edit3 className="h-3.5 w-3.5" /></Button>}</div>)}
          {measurements.map((item) => <Button key={item.id} variant={selected?.kind === "measurement" && selected.id === item.id ? "default" : "outline"} size="sm" className="w-full justify-start" onClick={() => setSelected({ kind: "measurement", id: item.id })}>Measurement</Button>)}</div>
        </section>
      </aside>
      <section className="flex min-w-0 min-h-0 flex-1 flex-col p-4 pl-4"><div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-slate-900 shadow-sm"><ViewerCanvas slide={demoSlide} tool={tool} annotations={annotations} measurements={measurements} selected={selected} onAddAnnotation={addAnnotation} onAddMeasurement={addMeasurement} onSelect={setSelected} onZoomChange={setZoom} onError={setError} onViewerReady={setControls} /><StatusBar slide={demoSlide} zoom={zoom} /></div></section>
    </div>
  </main></TooltipProvider>;
}
