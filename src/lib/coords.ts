import type OpenSeadragon from "openseadragon";
import type { Point } from "../types";

/** Converts an OSD canvas event's web pixel to level-0 image pixels. */
export function eventToImagePoint(viewer: OpenSeadragon.Viewer, pixel: OpenSeadragon.Point): Point {
  const viewportPoint = viewer.viewport.pointFromPixel(pixel);
  const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);
  return { x: imagePoint.x, y: imagePoint.y };
}

export function imageToViewportPoint(viewer: OpenSeadragon.Viewer, point: Point): OpenSeadragon.Point {
  return viewer.viewport.imageToViewportCoordinates(point.x, point.y);
}
