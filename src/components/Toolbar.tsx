import type { Tool } from "../types";
import type { ReactNode } from "react";
import { Hand, Maximize, MousePointer2, RotateCcw, Ruler, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
  onDelete: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const tool = (value: Tool, label: string, tip: string, icon: ReactNode) => (
    <Tooltip><TooltipTrigger asChild><Button variant={props.activeTool === value ? "default" : "outline"} className="h-16 flex-col gap-1" onClick={() => props.onToolChange(value)}>{icon}<span className="text-[11px]">{label}</span></Button></TooltipTrigger><TooltipContent>{tip}</TooltipContent></Tooltip>
  );
  return <section className="border-b border-slate-200 pb-5" aria-label="Viewer tools">
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tools</h2>
    <div className="grid grid-cols-3 gap-2">
      {tool("pan", "Pan", "Pan and zoom the slide", <Hand className="h-4 w-4" />)}
      {tool("rectangle", "Rectangle", "Draw an annotation rectangle", <MousePointer2 className="h-4 w-4" />)}
      {tool("line", "Measure", "Measure a distance", <Ruler className="h-4 w-4" />)}
      <Button variant="outline" size="sm" onClick={props.onZoomIn}><ZoomIn className="mr-1 h-3.5 w-3.5" />Zoom in</Button>
      <Button variant="outline" size="sm" onClick={props.onZoomOut}><ZoomOut className="mr-1 h-3.5 w-3.5" />Zoom out</Button>
      <Button variant="outline" size="sm" onClick={props.onFit}><Maximize className="mr-1 h-3.5 w-3.5" />Fit</Button>
      <Button variant="outline" size="sm" onClick={props.onReset}><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset</Button>
      <Button variant="destructive" size="sm" className="col-span-2" onClick={props.onDelete}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete selected</Button>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">Rectangle and Measure: click-drag on the image. Select annotations while Pan is active.</p>
  </section>;
}
