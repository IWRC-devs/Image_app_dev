import type { BoundingBoxAnnotation } from '@/types';

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
export type CanvasView = { zoom: number; offset: Point };
export type ImageFrame = { left: number; top: number; width: number; height: number };
export type AnnotationSnapshot = { boxes: BoundingBoxAnnotation[]; selectedId: string | null };
export type AnnotationHistory = {
  past: AnnotationSnapshot[];
  present: AnnotationSnapshot;
  future: AnnotationSnapshot[];
};

export const MAX_ZOOM = 8;
export const fitView = (): CanvasView => ({ zoom: 1, offset: { x: 0, y: 0 } });
export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function fittedSize(source: Size, viewport: Size): Size {
  const scale = Math.min(viewport.width / source.width, viewport.height / source.height);
  return { width: source.width * scale, height: source.height * scale };
}

export function constrainView(source: Size, viewport: Size, view: CanvasView): CanvasView {
  const zoom = clamp(view.zoom, 1, MAX_ZOOM);
  const fit = fittedSize(source, viewport);
  const maxX = Math.max(0, (fit.width * zoom - viewport.width) / 2);
  const maxY = Math.max(0, (fit.height * zoom - viewport.height) / 2);
  return { zoom, offset: { x: maxX ? clamp(view.offset.x, -maxX, maxX) : 0,
    y: maxY ? clamp(view.offset.y, -maxY, maxY) : 0 } };
}

export function imageFrame(source: Size, viewport: Size, view: CanvasView): ImageFrame {
  const fit = fittedSize(source, viewport);
  const safe = constrainView(source, viewport, view);
  const width = fit.width * safe.zoom;
  const height = fit.height * safe.zoom;
  return { left: (viewport.width - width) / 2 + safe.offset.x,
    top: (viewport.height - height) / 2 + safe.offset.y, width, height };
}

export function imagePoint(point: Point, frame: ImageFrame): Point {
  return { x: clamp((point.x - frame.left) / frame.width, 0, 1),
    y: clamp((point.y - frame.top) / frame.height, 0, 1) };
}

export function containsPoint(point: Point, frame: ImageFrame) {
  return point.x >= frame.left && point.x <= frame.left + frame.width &&
    point.y >= frame.top && point.y <= frame.top + frame.height;
}

/** Keep the image position under the pinch midpoint fixed, including a moving midpoint. */
export function zoomView(source: Size, viewport: Size, view: CanvasView, zoom: number,
  anchor: Point = { x: viewport.width / 2, y: viewport.height / 2 }, destination = anchor): CanvasView {
  const frame = imageFrame(source, viewport, view);
  if (!frame.width || !frame.height) return view;
  const x = (anchor.x - frame.left) / frame.width;
  const y = (anchor.y - frame.top) / frame.height;
  const nextZoom = clamp(zoom, 1, MAX_ZOOM);
  const fit = fittedSize(source, viewport);
  return constrainView(source, viewport, { zoom: nextZoom, offset: {
    x: destination.x - viewport.width / 2 - (x - 0.5) * fit.width * nextZoom,
    y: destination.y - viewport.height / 2 - (y - 0.5) * fit.height * nextZoom,
  } });
}

export function panView(source: Size, viewport: Size, view: CanvasView, delta: Point): CanvasView {
  return constrainView(source, viewport, { ...view,
    offset: { x: view.offset.x + delta.x, y: view.offset.y + delta.y } });
}

export function drawBox(id: string, className: string, start: Point, end: Point, source: Size): BoundingBoxAnnotation | null {
  const left = clamp(Math.min(start.x, end.x), 0, 1);
  const right = clamp(Math.max(start.x, end.x), 0, 1);
  const top = clamp(Math.min(start.y, end.y), 0, 1);
  const bottom = clamp(Math.max(start.y, end.y), 0, 1);
  if ((right - left) * source.width < 1 - 1e-6 || (bottom - top) * source.height < 1 - 1e-6) return null;
  return { id, classId: 0, className, xCenter: (left + right) / 2, yCenter: (top + bottom) / 2,
    width: right - left, height: bottom - top };
}

/** Place a usable screen-sized box, keeping its corners in the visible part of the photo. */
export function placeBoxAtTap(id: string, className: string, point: Point, frame: ImageFrame,
  source: Size, viewport: Size): BoundingBoxAnnotation | null {
  if (!frame.width || !frame.height || !containsPoint(point, frame)) return null;
  const left = Math.max(0, frame.left);
  const top = Math.max(0, frame.top);
  const right = Math.min(viewport.width, frame.left + frame.width);
  const bottom = Math.min(viewport.height, frame.top + frame.height);
  if (right <= left || bottom <= top) return null;
  const width = Math.min(96, (right - left) * 0.4);
  const height = Math.min(96, (bottom - top) * 0.4);
  const center = { x: clamp(point.x, left + width / 2, right - width / 2),
    y: clamp(point.y, top + height / 2, bottom - height / 2) };
  return drawBox(id, className,
    imagePoint({ x: center.x - width / 2, y: center.y - height / 2 }, frame),
    imagePoint({ x: center.x + width / 2, y: center.y + height / 2 }, frame), source);
}

export function addTappedBox(history: AnnotationHistory, id: string, className: string, point: Point,
  frame: ImageFrame, source: Size, viewport: Size): AnnotationHistory {
  // Finish the current box explicitly before placing another, including overlapping boxes.
  if (history.present.selectedId) return history;
  const box = placeBoxAtTap(id, className, point, frame, source, viewport);
  return box ? recordEdit(history, { boxes: [...history.present.boxes, box], selectedId: box.id }) : history;
}

/** Call only after persistence succeeds. Selection changes are not an undoable geometry edit. */
export function finishBox(history: AnnotationHistory): AnnotationHistory {
  return { ...history, present: { ...history.present, selectedId: null } };
}

export function moveBox(box: BoundingBoxAnnotation, delta: Point): BoundingBoxAnnotation {
  return { ...box, xCenter: clamp(box.xCenter + delta.x, box.width / 2, 1 - box.width / 2),
    yCenter: clamp(box.yCenter + delta.y, box.height / 2, 1 - box.height / 2) };
}

export function resizeBox(box: BoundingBoxAnnotation, corner: Corner, delta: Point, source: Size): BoundingBoxAnnotation {
  let left = box.xCenter - box.width / 2;
  let right = box.xCenter + box.width / 2;
  let top = box.yCenter - box.height / 2;
  let bottom = box.yCenter + box.height / 2;
  // Minimum is one source pixel, independent of screen size or magnification.
  const minWidth = Math.min(box.width, 1 / source.width);
  const minHeight = Math.min(box.height, 1 / source.height);
  if (corner === 'topLeft' || corner === 'bottomLeft') left = clamp(left + delta.x, 0, right - minWidth);
  else right = clamp(right + delta.x, left + minWidth, 1);
  if (corner === 'topLeft' || corner === 'topRight') top = clamp(top + delta.y, 0, bottom - minHeight);
  else bottom = clamp(bottom + delta.y, top + minHeight, 1);
  return { ...box, xCenter: (left + right) / 2, yCenter: (top + bottom) / 2, width: right - left, height: bottom - top };
}

export function boxFrame(box: BoundingBoxAnnotation, frame: ImageFrame): ImageFrame {
  return { left: frame.left + (box.xCenter - box.width / 2) * frame.width,
    top: frame.top + (box.yCenter - box.height / 2) * frame.height,
    width: box.width * frame.width, height: box.height * frame.height };
}

export function cornerPoints(frame: ImageFrame): { corner: Corner; point: Point }[] {
  return [
    { corner: 'topLeft', point: { x: frame.left, y: frame.top } },
    { corner: 'topRight', point: { x: frame.left + frame.width, y: frame.top } },
    { corner: 'bottomLeft', point: { x: frame.left, y: frame.top + frame.height } },
    { corner: 'bottomRight', point: { x: frame.left + frame.width, y: frame.top + frame.height } },
  ];
}

export function hitBox(snapshot: AnnotationSnapshot, point: Point, frame: ImageFrame) {
  const selected = snapshot.boxes.find(box => box.id === snapshot.selectedId);
  if (selected) {
    const handles = cornerPoints(boxFrame(selected, frame)).map(handle => ({ ...handle,
      distance: Math.hypot(point.x - handle.point.x, point.y - handle.point.y) })).sort((a, b) => a.distance - b.distance);
    if (handles[0].distance <= 18) return { box: selected, corner: handles[0].corner };
  }
  // The most recently drawn box is on top. A separate Next box control handles overlap.
  const box = [...snapshot.boxes].reverse().find(item => containsPoint(point, boxFrame(item, frame)));
  return box ? { box, corner: undefined } : undefined;
}

export function createHistory(boxes: BoundingBoxAnnotation[] = []): AnnotationHistory {
  return { past: [], present: { boxes: boxes.map(box => ({ ...box })), selectedId: boxes[0]?.id ?? null }, future: [] };
}

/** Called at gesture end, so all intermediate drag positions are one undo step. */
export function recordEdit(history: AnnotationHistory, next: AnnotationSnapshot): AnnotationHistory {
  if (JSON.stringify(history.present.boxes) === JSON.stringify(next.boxes)) return { ...history, present: next };
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function undoEdit(history: AnnotationHistory): AnnotationHistory {
  if (!history.past.length) return history;
  return { past: history.past.slice(0, -1), present: history.past[history.past.length - 1],
    future: [history.present, ...history.future] };
}

export function redoEdit(history: AnnotationHistory): AnnotationHistory {
  if (!history.future.length) return history;
  return { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) };
}
