import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, GestureResponderEvent, Image, Modal, PanResponder, Platform, SafeAreaView, StyleSheet,
  TouchableOpacity, View, ViewStyle,
} from 'react-native';
import uuid from 'react-native-uuid';

import { useBatch } from '@/app/context/BatchContext';
import { ThemedText } from '@/components/ThemedText';
import type { BoundingBoxAnnotation, ImageItem } from '@/types';
import { completeAnnotationEdit } from '@/utils/annotationEditing';
import { showAlert } from '@/utils/alerts';
import { saveBatchAnnotations } from '@/utils/batchStore';
import { saveOpenedBatch } from '@/utils/savedBatchEditing';
import {
  AnnotationHistory, CanvasView, Corner, ImageFrame, Point, Size,
  MAX_ZOOM, boxFrame, constrainView, containsPoint, cornerPoints, createHistory, drawBox, fitView,
  hitBox, imageFrame, imagePoint, moveBox, panView, recordEdit, redoEdit, resizeBox, undoEdit, zoomView,
} from '@/utils/annotationCanvas';

type Mode = 'draw' | 'edit' | 'pan';
type Gesture =
  | { kind: 'draw'; before: AnnotationHistory; start: Point; frame: ImageFrame; id: string }
  | { kind: 'edit'; before: AnnotationHistory; start: Point; frame: ImageFrame; box: BoundingBoxAnnotation; corner?: Corner }
  | { kind: 'pan'; start: Point; view: CanvasView }
  | { kind: 'pinch'; midpoint: Point; distance: number; view: CanvasView };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const webGestureStyle: (ViewStyle & { touchAction: string; userSelect: string }) | undefined = Platform.OS === 'web'
  ? { touchAction: 'none', userSelect: 'none' } : undefined;

function ToolButton({ label, icon, onPress, disabled = false, active = false, compact = false }: {
  label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void;
  disabled?: boolean; active?: boolean; compact?: boolean;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }} disabled={disabled} onPress={onPress}
      style={[styles.toolButton, compact && styles.compactButton, active && styles.activeButton, disabled && styles.disabledButton]}>
      <Ionicons name={icon} size={19} color="#fff" />
      {!compact && <ThemedText style={styles.buttonText}>{label}</ThemedText>}
    </TouchableOpacity>
  );
}

function AnnotationCanvas({ image, weedName, onDone }: {
  image: ImageItem; weedName: string; onDone: (boxes: BoundingBoxAnnotation[], source: Size) => void | Promise<void>;
}) {
  const [source, setSource] = useState<Size>({ width: image.width || 1, height: image.height || 1 });
  const [sizeReady, setSizeReady] = useState(Boolean(image.width && image.height));
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [history, setHistory] = useState(() => createHistory(image.annotations));
  const [view, setView] = useState(fitView);
  const [mode, setMode] = useState<Mode>(image.annotations?.length ? 'edit' : 'draw');
  const historyRef = useRef(history);
  const viewRef = useRef(view);
  const gesture = useRef<Gesture | null>(null);
  const origin = useRef<Point>({ x: 0, y: 0 });

  const updateHistory = (next: AnnotationHistory) => { historyRef.current = next; setHistory(next); };
  const updateView = (next: CanvasView) => { viewRef.current = next; setView(next); };

  useEffect(() => {
    if (image.width && image.height) return;
    let active = true;
    Image.getSize(image.uri, (width, height) => {
      if (active) { setSource({ width, height }); setSizeReady(true); }
    }, () => { if (active) showAlert('Image size unavailable', 'Please reopen this image before annotating it.'); });
    return () => { active = false; };
  }, [image.width, image.height, image.uri]);

  const frame = imageFrame(source, viewport, view);

  const cancelGesture = () => {
    const current = gesture.current;
    if (current?.kind === 'draw' || current?.kind === 'edit') updateHistory(current.before);
    gesture.current = null;
  };
  const localTouches = (event: GestureResponderEvent): Point[] =>
    Array.from(event.nativeEvent.touches).map(touch => ({ x: touch.pageX - origin.current.x,
      y: touch.pageY - origin.current.y }));
  const eventPoint = (event: GestureResponderEvent): Point => ({
    x: event.nativeEvent.pageX - origin.current.x, y: event.nativeEvent.pageY - origin.current.y,
  });
  const startPinch = (points: Point[]) => {
    cancelGesture();
    gesture.current = { kind: 'pinch', midpoint: midpoint(points[0], points[1]),
      distance: Math.max(1, distance(points[0], points[1])), view: viewRef.current };
  };

  const startGesture = (event: GestureResponderEvent) => {
    if (!sizeReady) return;
    const native = event.nativeEvent;
    origin.current = { x: native.pageX - native.locationX, y: native.pageY - native.locationY };
    const points = localTouches(event);
    if (points.length >= 2) { startPinch(points); return; }
    const point = eventPoint(event);
    const currentFrame = imageFrame(source, viewport, viewRef.current);
    if (!currentFrame.width || !currentFrame.height) return;
    if (mode === 'pan') { gesture.current = { kind: 'pan', start: point, view: viewRef.current }; return; }
    const before = historyRef.current;
    if (mode === 'draw') {
      if (containsPoint(point, currentFrame)) gesture.current = {
        kind: 'draw', before, start: point, frame: currentFrame, id: uuid.v4() as string,
      };
      return;
    }
    const hit = hitBox(before.present, point, currentFrame);
    updateHistory({ ...before, present: { ...before.present, selectedId: hit?.box.id ?? null } });
    if (hit) gesture.current = { kind: 'edit', before, start: point, frame: currentFrame, ...hit };
  };

  const moveGesture = (event: GestureResponderEvent) => {
    const points = localTouches(event);
    if (points.length >= 2) {
      if (gesture.current?.kind !== 'pinch') startPinch(points);
      const pinch = gesture.current;
      if (pinch?.kind === 'pinch') updateView(zoomView(source, viewport, pinch.view,
        pinch.view.zoom * distance(points[0], points[1]) / pinch.distance,
        pinch.midpoint, midpoint(points[0], points[1])));
      return;
    }
    const current = gesture.current;
    if (!current) return;
    const point = eventPoint(event);
    if (current.kind === 'pinch') return;
    if (current.kind === 'pan') {
      updateView(panView(source, viewport, current.view,
        { x: point.x - current.start.x, y: point.y - current.start.y }));
      return;
    }
    if (current.kind === 'draw') {
      const box = distance(current.start, point) >= 3
        ? drawBox(current.id, weedName, imagePoint(current.start, current.frame), imagePoint(point, current.frame), source) : null;
      updateHistory({ ...current.before, present: { boxes: box
        ? [...current.before.present.boxes, box] : current.before.present.boxes,
        selectedId: box?.id ?? current.before.present.selectedId } });
      return;
    }
    const delta = { x: (point.x - current.start.x) / current.frame.width,
      y: (point.y - current.start.y) / current.frame.height };
    const box = current.corner ? resizeBox(current.box, current.corner, delta, source) : moveBox(current.box, delta);
    updateHistory({ ...current.before, present: { selectedId: box.id,
      boxes: current.before.present.boxes.map(item => item.id === box.id ? box : item) } });
  };

  const finishGesture = () => {
    const current = gesture.current;
    if (current?.kind === 'draw' || current?.kind === 'edit') {
      updateHistory(recordEdit(current.before, historyRef.current.present));
    }
    gesture.current = null;
  };
  // Keep native handlers stable while reading the latest state through callbacks/refs.
  const callbacks = useRef({ startGesture, moveGesture, finishGesture, cancelGesture, startPinch, localTouches });
  callbacks.current = { startGesture, moveGesture, finishGesture, cancelGesture, startPinch, localTouches };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => callbacks.current.startGesture(event),
    onPanResponderStart: event => {
      const points = callbacks.current.localTouches(event);
      if (points.length >= 2) callbacks.current.startPinch(points);
    },
    onPanResponderMove: event => callbacks.current.moveGesture(event),
    onPanResponderEnd: event => {
      const points = callbacks.current.localTouches(event);
      // After a pinch, the remaining finger pans; it must never draw or edit a box.
      if (gesture.current?.kind === 'pinch' && points.length === 1) {
        gesture.current = { kind: 'pan', start: points[0], view: viewRef.current };
      }
    },
    onPanResponderRelease: () => callbacks.current.finishGesture(),
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => callbacks.current.cancelGesture(),
  }), []);

  const boxes = history.present.boxes;
  const selectedIndex = boxes.findIndex(box => box.id === history.present.selectedId);
  const selected = boxes[selectedIndex];
  const deleteSelected = () => {
    if (!selected) return;
    const remaining = boxes.filter(box => box.id !== selected.id);
    updateHistory(recordEdit(historyRef.current, { boxes: remaining,
      selectedId: remaining[Math.min(selectedIndex, remaining.length - 1)]?.id ?? null }));
  };
  const nextBox = () => {
    if (!boxes.length) return;
    const next = boxes[(selectedIndex + 1) % boxes.length];
    setMode('edit');
    updateHistory({ ...historyRef.current, present: { ...historyRef.current.present,
      selectedId: next.id } });
    const rectangle = boxFrame(next, imageFrame(source, viewport, viewRef.current));
    updateView(zoomView(source, viewport, viewRef.current, viewRef.current.zoom,
      { x: rectangle.left + rectangle.width / 2, y: rectangle.top + rectangle.height / 2 },
      { x: viewport.width / 2, y: viewport.height / 2 }));
  };
  const instructions = mode === 'draw' ? 'Drag from one corner of the plant to the opposite corner to draw a box.'
    : mode === 'edit' ? 'Tap a box to select it. Drag inside to move it, or drag a corner to resize.'
      : 'Drag to move the image. Switch to Draw box or Edit boxes to annotate.';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.instructions}>
        <ThemedText style={styles.title} numberOfLines={1}>{weedName}</ThemedText>
        <ThemedText style={styles.helpText}>{instructions} Pinch or use +/− to zoom.</ThemedText>
        <ThemedText style={styles.imageInfo}>
          {source.width} × {source.height} px · {boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}
          {selected ? ` · Selected: instance ${selectedIndex + 1}` : ''}
        </ThemedText>
      </View>
      <View style={styles.modeBar}>
        <ToolButton label="Draw box" icon="create-outline" active={mode === 'draw'} onPress={() => setMode('draw')} />
        <ToolButton label="Edit boxes" icon="scan-outline" active={mode === 'edit'} onPress={() => setMode('edit')} />
        <ToolButton label="Move image" icon="hand-left-outline" active={mode === 'pan'} onPress={() => setMode('pan')} />
      </View>
      <View style={styles.viewport} onLayout={event => {
        cancelGesture();
        const size = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
        setViewport(size);
        updateView(constrainView(source, size, viewRef.current));
      }}>
        {frame.width > 0 && frame.height > 0 && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Image source={{ uri: image.uri }} resizeMode="stretch"
              style={{ position: 'absolute', left: frame.left, top: frame.top, width: frame.width, height: frame.height }} />
            {boxes.map((box, index) => {
              const rectangle = boxFrame(box, frame);
              const isSelected = box.id === history.present.selectedId;
              return (
                <View key={box.id} style={[styles.box, rectangle, { borderWidth: isSelected ? 3 : 2 }]}>
                  <ThemedText numberOfLines={1} style={[styles.boxLabel, { maxWidth: frame.width,
                    top: rectangle.top < 24 ? 2 : -23 }]}>{weedName} · {index + 1}</ThemedText>
                </View>
              );
            })}
            {selected && mode === 'edit' && cornerPoints(boxFrame(selected, frame)).map(({ corner, point }) => (
              <View key={corner} style={[styles.handle, { left: point.x - 13, top: point.y - 13 }]} />
            ))}
          </View>
        )}
        <View style={[StyleSheet.absoluteFill, webGestureStyle]}
          accessibilityLabel="Annotation canvas. Use Draw box to draw, Edit boxes to move or resize, and Move image to pan."
          {...responder.panHandlers} />
      </View>
      <View style={styles.zoomBar}>
        <ToolButton label="Zoom out" compact icon="remove" disabled={view.zoom <= 1}
          onPress={() => updateView(zoomView(source, viewport, viewRef.current, viewRef.current.zoom / 1.5))} />
        <ThemedText style={styles.zoomText}>{Math.round(view.zoom * 100)}%</ThemedText>
        <ToolButton label="Zoom in" compact icon="add" disabled={view.zoom >= MAX_ZOOM}
          onPress={() => updateView(zoomView(source, viewport, viewRef.current, viewRef.current.zoom * 1.5))} />
        <ToolButton label="Fit" icon="expand-outline" onPress={() => updateView(fitView())} />
      </View>
      <View style={styles.toolbar}>
        <ToolButton label="Undo" icon="arrow-undo" disabled={!history.past.length}
          onPress={() => updateHistory(undoEdit(historyRef.current))} />
        <ToolButton label="Redo" icon="arrow-redo" disabled={!history.future.length}
          onPress={() => updateHistory(redoEdit(historyRef.current))} />
        <ToolButton label="Next box" icon="layers-outline" disabled={!boxes.length} onPress={nextBox} />
        <ToolButton label="Delete box" icon="trash-outline" disabled={!selected} onPress={deleteSelected} />
        <ToolButton label="Done" icon="checkmark" active disabled={!sizeReady}
          onPress={() => onDone(historyRef.current.present.boxes, source)} />
      </View>
    </SafeAreaView>
  );
}

export default function AnnotationEditorScreen() {
  const { imageId } = useLocalSearchParams<{ imageId: string }>();
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [editorSession, setEditorSession] = useState(0);
  // Tab screens remain mounted. Each visit must start from the current batch,
  // including when two saved batches both contain an image with legacy ID "0".
  useFocusEffect(useCallback(() => { setEditorSession(current => current + 1); }, []));
  const image = batchData?.images.find(item => item.id === imageId);
  if (!batchData || !image) return (
    <SafeAreaView style={styles.screen}><ThemedText style={styles.errorText}>This image is no longer available.</ThemedText></SafeAreaView>
  );
  return <View style={styles.screen}>
    <AnnotationCanvas key={`${batchData.id ?? batchData.name}:${image.id}:${editorSession}`}
      image={image} weedName={batchData.botanicalName || 'Weed of interest'}
    onDone={async (boxes, source) => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        const result = completeAnnotationEdit(batchData, image.id, boxes, source);
        if (batchData.editingSavedBatch) {
          setSaving(true);
          const saved = await saveOpenedBatch(result.batch, saveBatchAnnotations);
          setBatchData(saved);
          router.replace({ pathname: '/screens/imaging/saved-batch', params: { batchId: saved.id! } });
        } else {
          setBatchData(result.batch);
          router.replace(result.route);
        }
      } catch (error) {
        showAlert('Unable to save annotations', error instanceof Error ? error.message : 'Please check your boxes and try again.');
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    }} />
    <Modal visible={saving} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.savingOverlay}>
        <ActivityIndicator size="large" color="#4caf50" />
        <ThemedText style={styles.savingText}>Saving annotations…</ThemedText>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101820' },
  savingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', gap: 16 },
  savingText: { color: '#fff', fontSize: 17 },
  instructions: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  helpText: { color: '#D5DEE3', fontSize: 13, lineHeight: 18, marginTop: 3 },
  imageInfo: { color: '#B5C4CD', fontSize: 12, marginTop: 3 },
  modeBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingBottom: 8 },
  viewport: { flex: 1, minHeight: 100, overflow: 'hidden', backgroundColor: '#000' },
  box: { position: 'absolute', borderWidth: 2, borderColor: '#ff3b30', backgroundColor: 'rgba(255,59,48,0.06)' },
  boxLabel: { position: 'absolute', left: -2, paddingHorizontal: 4, backgroundColor: '#b71c1c',
    color: '#fff', fontSize: 12, lineHeight: 20, fontWeight: '700' },
  handle: { position: 'absolute', width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#101820', backgroundColor: '#ff3b30' },
  zoomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6 },
  zoomText: { color: '#fff', minWidth: 48, textAlign: 'center', fontSize: 13 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#40515A' },
  toolButton: { flexGrow: 1, minHeight: 44, minWidth: 44, paddingHorizontal: 9, paddingVertical: 7,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 7, backgroundColor: '#40515A' },
  compactButton: { flexGrow: 0 },
  activeButton: { backgroundColor: '#236B3A', borderWidth: 1, borderColor: '#66DC8E' },
  disabledButton: { opacity: 0.35 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  errorText: { color: '#fff', padding: 24 },
});
