import type { Slide } from "../types";

interface StatusBarProps { slide: Slide; zoom: number; }

export function StatusBar({ slide, zoom }: StatusBarProps) {
  const magnification = slide.magnification ? `≈ ${(slide.magnification * zoom).toFixed(1)}x` : "N/A";
  return <footer className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-slate-200 bg-white px-5 py-2 text-xs text-slate-600">
    <span><b className="font-semibold text-slate-800">Zoom</b> {zoom.toFixed(2)}x</span><span><b className="font-semibold text-slate-800">Approx. magnification</b> {magnification}</span>
    <span><b className="font-semibold text-slate-800">MPP</b> {slide.mpp ? `${slide.mpp} µm/px` : "N/A"}</span>
    <span><b className="font-semibold text-slate-800">Image</b> {slide.width && slide.height ? `${slide.width.toLocaleString()} × ${slide.height.toLocaleString()} px` : "Dimensions N/A"}</span>
  </footer>;
}
