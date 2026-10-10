import type { Point } from "../types";

export function distanceInPixels(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function formatMeasurement(p1: Point, p2: Point, mpp?: number): string {
  const pixels = distanceInPixels(p1, p2);
  if (!mpp) return `${Math.round(pixels)} px (uncalibrated)`;
  const microns = pixels * mpp;
  return microns >= 1000 ? `${(microns / 1000).toFixed(2)} mm` : `${microns.toFixed(1)} µm`;
}
