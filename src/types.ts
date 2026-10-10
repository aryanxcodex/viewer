export interface Slide {
  id: string;
  name: string;
  dziUrl: string;
  caseId?: string;
  specimen?: string;
  stain?: string;
  scanner?: string;
  magnification?: number;
  width?: number;
  height?: number;
  mpp?: number;
  scanDate?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  slideId: string;
  type: "rectangle" | "polygon" | "freehand";
  geometry: { x: number; y: number; width: number; height: number } | { points: Point[] };
  label: string;
  createdAt: string;
}

export interface Measurement {
  id: string;
  slideId: string;
  p1: Point;
  p2: Point;
}

export type Tool = "pan" | "rectangle" | "line";
export type SelectedItem = { kind: "annotation"; id: string } | { kind: "measurement"; id: string } | null;
