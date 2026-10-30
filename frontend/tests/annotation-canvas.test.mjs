import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import {
  addTappedBox, boxFrame, constrainView, createHistory, drawBox, finishBox, fitView, hitBox, imageFrame, imagePoint, placeBoxAtTap,
  moveBox, panView, recordEdit, redoEdit, resizeBox, undoEdit, zoomView,
} from '../utils/annotationCanvas.ts';
import { createBatchArchive } from '../utils/exportBatch.web.ts';
import { normalizeAnnotation } from '../utils/batchMetadata.ts';
import { completeAnnotationEdit } from '../utils/annotationEditing.ts';

const source = { width: 4000, height: 3000 };
const viewport = { width: 360, height: 500 };
const box = { id: 'plant', classId: 0, className: 'Selected species',
  xCenter: 0.5, yCenter: 0.5, width: 0.2, height: 0.2 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const screenPoint = (point, frame) => ({ x: frame.left + point.x * frame.width, y: frame.top + point.y * frame.height });

test('an untouched photo has no accidental default box or undo action', () => {
  const history = createHistory();
  assert.deepEqual(history.present, { boxes: [], selectedId: null });
  assert.equal(undoEdit(history), history);
  assert.equal(redoEdit(history), history);
  assert.equal(drawBox('tap', 'Species', { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, source), null);
});

test('a tap places a visible box with four reachable corners, including zoomed image and viewport edges', () => {
  for (const zoom of [1, 3, 8]) {
    const frame = imageFrame(source, viewport, { zoom, offset: { x: -30, y: 60 } });
    const left = Math.max(0, frame.left);
    const top = Math.max(0, frame.top);
    const right = Math.min(viewport.width, frame.left + frame.width);
    const bottom = Math.min(viewport.height, frame.top + frame.height);
    for (const point of [{ x: left + 1, y: top + 1 }, { x: right - 1, y: bottom - 1 },
      { x: (left + right) / 2, y: (top + bottom) / 2 }]) {
      const placed = placeBoxAtTap('tap', 'Species', point, frame, source, viewport);
      assert.ok(normalizeAnnotation(placed, 0));
      const rectangle = boxFrame(placed, frame);
      assert.ok(rectangle.left >= left - 1e-8 && rectangle.top >= top - 1e-8);
      assert.ok(rectangle.left + rectangle.width <= right + 1e-8);
      assert.ok(rectangle.top + rectangle.height <= bottom + 1e-8);
      assert.ok(rectangle.width >= 40 && rectangle.height >= 40);
    }
  }
  assert.equal(placeBoxAtTap('outside', 'Species', { x: -1, y: -1 }, imageFrame(source, viewport, fitView()), source, viewport), null);
});

test('tap, adjust, Save box, then tap again creates separate instances and preserves undo/redo', () => {
  const frame = imageFrame(source, viewport, fitView());
  const point = { x: 180, y: 250 };
  const empty = finishBox(createHistory());
  const first = addTappedBox(empty, 'first', 'Species', point, frame, source, viewport);
  assert.equal(first.present.selectedId, 'first');
  assert.equal(first.present.boxes.length, 1);
  assert.equal(addTappedBox(first, 'too-soon', 'Species', point, frame, source, viewport), first);
  const adjusted = resizeBox(first.present.boxes[0], 'bottomRight', { x: -0.1, y: -0.1 }, source);
  const edited = recordEdit(first, { boxes: [adjusted], selectedId: 'first' });
  const saved = finishBox(edited);
  assert.equal(saved.present.selectedId, null);
  assert.equal(saved.past.length, edited.past.length);
  // The next instance may overlap the previous one, without changing the saved instance.
  const second = addTappedBox(saved, 'second', 'Species', point, frame, source, viewport);
  assert.equal(second.present.boxes.length, 2);
  assert.equal(second.present.selectedId, 'second');
  assert.deepEqual(second.present.boxes[0], adjusted);
  assert.deepEqual(undoEdit(second).present.boxes, [adjusted]);
  assert.deepEqual(redoEdit(undoEdit(second)).present, second.present);
});

test('two-finger movement at constant spacing pans without changing annotations', () => {
  const history = finishBox(createHistory([box]));
  const before = structuredClone(history);
  const view = { zoom: 3, offset: { x: 0, y: 0 } };
  const anchor = { x: 180, y: 250 };
  const destination = { x: 220, y: 290 };
  const next = zoomView(source, viewport, view, view.zoom, anchor, destination);
  const oldPoint = imagePoint(anchor, imageFrame(source, viewport, view));
  const newPoint = imagePoint(destination, imageFrame(source, viewport, next));
  near(newPoint.x, oldPoint.x);
  near(newPoint.y, oldPoint.y);
  assert.equal(next.zoom, view.zoom);
  assert.deepEqual(history, before);
});

test('image coordinates survive zoom, pan and letterboxing for landscape, portrait and square photos', () => {
  for (const dimensions of [source, { width: 3000, height: 4000 }, { width: 2048, height: 2048 }]) {
    for (const zoom of [1, 2, 4, 8]) {
      const view = constrainView(dimensions, viewport, { zoom, offset: { x: 70, y: -110 } });
      const frame = imageFrame(dimensions, viewport, view);
      const point = { x: 0.61, y: 0.42 };
      const recovered = imagePoint(screenPoint(point, frame), frame);
      near(recovered.x, point.x);
      near(recovered.y, point.y);
      near(frame.width / frame.height, dimensions.width / dimensions.height);
    }
  }
});

test('pinch zoom preserves its focal point and follows a moving midpoint', () => {
  const dimensions = { width: 1000, height: 1000 };
  const size = { width: 400, height: 400 };
  const anchor = { x: 130, y: 170 };
  const before = imagePoint(anchor, imageFrame(dimensions, size, fitView()));
  for (const destination of [anchor, { x: 170, y: 190 }]) {
    const next = zoomView(dimensions, size, fitView(), 4, anchor, destination);
    const after = imagePoint(destination, imageFrame(dimensions, size, next));
    near(after.x, before.x);
    near(after.y, before.y);
  }
});

test('pan and zoom bounds keep the image reachable, and Fit restores its centered size', () => {
  const zoomed = zoomView(source, viewport, fitView(), 100);
  assert.equal(zoomed.zoom, 8);
  const panned = panView(source, viewport, zoomed, { x: 100000, y: -100000 });
  const frame = imageFrame(source, viewport, panned);
  near(frame.left, 0);
  near(frame.top + frame.height, viewport.height);
  assert.deepEqual(zoomView(source, viewport, panned, 0), fitView());
  const fit = imageFrame(source, viewport, fitView());
  near(fit.left, 0);
  near(fit.top, 115);
});

test('drawing supports either direction, image edges and boxes down to one source pixel', () => {
  const a = { x: 0.4, y: 0.4 };
  const b = { x: 0.42, y: 0.42 };
  const forward = drawBox('small', 'Species', a, b, source);
  assert.deepEqual(drawBox('small', 'Species', b, a, source), forward);
  near(forward.width * source.width, 80);
  near(forward.height * source.height, 60);
  assert.ok(normalizeAnnotation(forward, 0));
  const pixel = drawBox('pixel', 'Species', a, { x: a.x + 1 / source.width, y: a.y + 1 / source.height }, source);
  assert.ok(pixel);
  const edge = drawBox('edge', 'Species', { x: 0.9, y: 0.9 }, { x: 1.4, y: 1.4 }, source);
  assert.ok(normalizeAnnotation(edge, 0));
  near(edge.xCenter + edge.width / 2, 1);
});

test('moving and resizing at every corner cannot move a label outside the photo', () => {
  const original = structuredClone(box);
  const moved = moveBox(box, { x: 100, y: -100 });
  near(moved.xCenter + moved.width / 2, 1);
  near(moved.yCenter - moved.height / 2, 0);
  assert.equal(moved.width, box.width);
  for (const corner of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
    const shrink = { x: corner.endsWith('Left') ? 10 : -10, y: corner.startsWith('top') ? 10 : -10 };
    const resized = resizeBox(box, corner, shrink, source);
    near(resized.width * source.width, 1);
    near(resized.height * source.height, 1);
    assert.ok(normalizeAnnotation(resized, 0));
    assert.ok(normalizeAnnotation(resizeBox(box, corner, { x: -shrink.x, y: -shrink.y }, source), 0));
  }
  assert.deepEqual(box, original);
});

test('selected corner handles are hit in screen coordinates even after zoom and pan', () => {
  const frame = imageFrame(source, viewport, { zoom: 4, offset: { x: 50, y: 50 } });
  const rectangle = boxFrame(box, frame);
  const snapshot = { boxes: [box], selectedId: box.id };
  assert.equal(hitBox(snapshot, { x: rectangle.left + 8, y: rectangle.top + 8 }, frame).corner, 'topLeft');
  assert.equal(hitBox(snapshot, screenPoint({ x: box.xCenter, y: box.yCenter }, frame), frame).corner, undefined);
  assert.equal(hitBox(snapshot, { x: -10000, y: -10000 }, frame), undefined);
});

test('undo and redo reverse complete drawing, drag, resize and delete actions without mutating earlier states', () => {
  const empty = createHistory();
  const drawn = recordEdit(empty, { boxes: [box], selectedId: box.id });
  // A gesture may have many previews, but commits only its final position once.
  let lastPreview;
  for (let i = 1; i <= 20; i++) lastPreview = moveBox(box, { x: i / 1000, y: 0 });
  const moved = recordEdit(drawn, { boxes: [lastPreview], selectedId: box.id });
  assert.equal(moved.past.length, 2);
  assert.deepEqual(undoEdit(moved).present.boxes, [box]);
  const resized = recordEdit(moved, { boxes: [resizeBox(lastPreview, 'bottomRight', { x: 0.03, y: 0.04 }, source)], selectedId: box.id });
  const deleted = recordEdit(resized, { boxes: [], selectedId: null });
  assert.deepEqual(undoEdit(deleted).present, resized.present);
  assert.deepEqual(redoEdit(undoEdit(deleted)).present, deleted.present);
  let reversed = deleted;
  for (let i = 0; i < 4; i++) reversed = undoEdit(reversed);
  assert.deepEqual(reversed.present, empty.present);
  const unchanged = recordEdit(undoEdit(deleted), { ...resized.present, selectedId: null });
  assert.equal(unchanged.past.length, resized.past.length);
  assert.equal(unchanged.future.length, 1);
  assert.equal(recordEdit(unchanged, { boxes: [box], selectedId: box.id }).future.length, 0);
  assert.deepEqual(empty.present.boxes, []);
  assert.deepEqual(drawn.present.boxes, [box]);
});

test('a small box drawn in a zoomed view survives Done and exports original-image YOLO coordinates', async () => {
  const frame = imageFrame(source, viewport, { zoom: 4, offset: { x: -100, y: 80 } });
  const start = screenPoint({ x: 0.5, y: 0.4 }, frame);
  const end = screenPoint({ x: 0.52, y: 0.42 }, frame);
  const annotation = drawBox('small', 'Selected species', imagePoint(start, frame), imagePoint(end, frame), source);
  const image = { id: 'photo', uri: 'data:image/jpeg;base64,aW1hZ2U=', ...source };
  const batch = { id: 'batch', name: 'batch', savedAt: '2026-10-29T16:00:00Z',
    botanicalName: 'Selected species', images: [image], selectedOption: 'manual' };
  const completed = completeAnnotationEdit(batch, image.id, [annotation], source);
  const files = unzipSync(await createBatchArchive(completed.batch));
  assert.equal(strFromU8(files['image_001.txt']), '0 0.510000 0.410000 0.020000 0.020000');
  const metadata = JSON.parse(strFromU8(files['batch.txt']));
  const savedBox = metadata.images['image_001.jpg'].bounding_box_coordinates.instance_1;
  near(savedBox.x_center, 0.51);
  near(savedBox.width, 0.02);
  assert.equal(savedBox.weed_name, 'Selected species');
  assert.equal(completed.route, '/screens/imaging/image-selection');
});
