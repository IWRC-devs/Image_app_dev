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
  addTappedBox, boxFrame, constrainView, containsPoint, cornerPoints, createHistory, finishBox, fitView,
  hitBox, imageFrame, moveBox, recordEdit, redoEdit, resizeBox, undoEdit, zoomView,
} from '@/utils/annotationCanvas';

type Mode = 'add' | 'edit';
type Gesture =
  | { kind: 'tap'; before: AnnotationHistory; start: Point; frame: ImageFrame; id: string; moved: boolean }
  | { kind: 'edit'; before: AnnotationHistory; start: Point; frame: ImageFrame; box: BoundingBoxAnnotation; corner?: Corner }
  | { kind: 'ignore' }
  | { kind: 'pinch'; midpoint: Point; distance: number; view: CanvasView };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const webGestureStyle: (ViewStyle & { touchAction: string; userSelect: string }) | undefined = Platform.OS === 'web'
  ? { touchAction: 'none', userSelect: 'none' } : undefined;

function ToolButton({ label, icon, onPress, disabled = false, active = false }: {
  label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void;
  disabled?: boolean; active?: boolean;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled, selected: active }} disabled={disabled} onPress={onPress}
      style={[styles.toolButton, active && styles.activeButton, disabled && styles.disabledButton]}>
      <Ionicons name={icon} size={19} color="#fff" />
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

function AnnotationCanvas({ image, weedName, onSave, onDone }: {
  image: ImageItem; weedName: string;
  onSave: (boxes: BoundingBoxAnnotation[], source: Size) => Promise<boolean>;
  onDone: (boxes: BoundingBoxAnnotation[], source: Size) => Promise<boolean>;
}) {
  const [source, setSource] = useState<Size>({ width: image.width || 1, height: image.height || 1 });
  const [sizeReady, setSizeReady] = useState(Boolean(image.width && image.height));
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [history, setHistory] = useState(() => finishBox(createHistory(image.annotations)));
  const [savedSignature, setSavedSignature] = useState(() => JSON.stringify(image.annotations ?? []));
  const [savingBox, setSavingBox] = useState(false);
  const [view, setView] = useState(fitView);
  const [mode, setMode] = useState<Mode>('add');
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
    if (current?.kind === 'edit') updateHistory(current.before);
    gesture.current = null;
  };
  const localTouches = (event: GestureResponderEvent): Point[] =>
    Array.from(event.nativeEvent.touches).map(touch => ({ x: touch.pageX - origin.current.x,
      y: touch.pageY - origin.current.y }));
  const eventPoint = (event: GestureResponderEvent): Point => ({
    x: event.nativeEvent.pageX - origin.current.x, y: event.nativeEvent.pageY - origin.current.y,
  });
  const startPinch = (points: Point[]) => {
    if (!sizeReady || savingBox) return;
    cancelGesture();
    gesture.current = { kind: 'pinch', midpoint: midpoint(points[0], points[1]),
      distance: Math.max(1, distance(points[0], points[1])), view: viewRef.current };
  };

  const startGesture = (event: GestureResponderEvent) => {
    if (!sizeReady || savingBox) return;
    const native = event.nativeEvent;
    origin.current = { x: native.pageX - native.locationX, y: native.pageY - native.locationY };
    const points = localTouches(event);
    if (points.length >= 2) { startPinch(points); return; }
    const point = eventPoint(event);
    const currentFrame = imageFrame(source, viewport, viewRef.current);
    if (!currentFrame.width || !currentFrame.height) return;
    const before = historyRef.current;
    if (mode === 'add' && !before.present.selectedId) {
      if (containsPoint(point, currentFrame)) gesture.current = {
        kind: 'tap', before, start: point, frame: currentFrame, id: uuid.v4() as string, moved: false,
      };
      return;
    }
    const hit = hitBox(mode === 'add' ? { ...before.present,
      boxes: before.present.boxes.filter(box => box.id === before.present.selectedId) } : before.present, point, currentFrame);
    if (mode === 'add' && !hit) return;
    updateHistory({ ...before, present: { ...before.present, selectedId: hit?.box.id ?? null } });
    if (hit) gesture.current = { kind: 'edit', before, start: point, frame: currentFrame, ...hit };
  };

  const moveGesture = (event: GestureResponderEvent) => {
    if (!sizeReady || savingBox) return;
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
    if (current.kind === 'pinch' || current.kind === 'ignore') return;
    if (current.kind === 'tap') {
      if (distance(current.start, point) > 8) current.moved = true;
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
    if (current?.kind === 'tap' && !current.moved) {
      updateHistory(addTappedBox(current.before, current.id, weedName, current.start, current.frame, source, viewport));
    } else if (current?.kind === 'edit') {
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
      // Navigation requires two fingers; the remaining finger cannot place or edit a box.
      if (gesture.current?.kind === 'pinch' && points.length === 1) {
        gesture.current = { kind: 'ignore' };
      }
    },
    onPanResponderRelease: () => callbacks.current.finishGesture(),
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => callbacks.current.cancelGesture(),
  }), []);

  const boxes = history.present.boxes;
  const selectedIndex = boxes.findIndex(box => box.id === history.present.selectedId);
  const selected = boxes[selectedIndex];
  const dirty = JSON.stringify(boxes) !== savedSignature;
  const saveBox = async () => {
    if (savingBox) return;
    const snapshot = historyRef.current.present.boxes;
    setSavingBox(true);
    try {
      if (await onSave(snapshot, source)) {
        setSavedSignature(JSON.stringify(snapshot));
        updateHistory(finishBox(historyRef.current));
        setMode('add');
      }
    } finally { setSavingBox(false); }
  };
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
  const instructions = selected ? 'Drag the box or its corners to adjust it. Tap Save box before adding another.'
    : mode === 'add' ? 'Tap the image to place a box with editable corners.' : 'Tap an existing box to edit it.';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.instructions}>
        <ThemedText style={styles.title} numberOfLines={1}>{weedName}</ThemedText>
        <ThemedText style={styles.helpText}>Use two fingers to zoom in/out and move the image.</ThemedText>
        <ThemedText style={[styles.helpText, styles.boxInstructions]} numberOfLines={3}>{instructions}</ThemedText>
        <ThemedText style={styles.imageInfo} numberOfLines={1}>
          {source.width} × {source.height} px · {boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}
          {selected ? ` · Selected: instance ${selectedIndex + 1}` : ''}
        </ThemedText>
      </View>
      <View style={styles.modeBar}>
        <ToolButton label="Tap to add" icon="add-circle-outline" active={mode === 'add'} onPress={() => setMode('add')} />
        <ToolButton label="Edit boxes" icon="scan-outline" active={mode === 'edit'} onPress={() => setMode('edit')} />
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
            {selected && cornerPoints(boxFrame(selected, frame)).map(({ corner, point }) => (
              <View key={corner} style={[styles.handle, { left: point.x - 13, top: point.y - 13 }]} />
            ))}
          </View>
        )}
        <View style={[StyleSheet.absoluteFill, webGestureStyle]}
          accessibilityLabel="Tap to add a box, adjust its corners, then Save box. Use two fingers to zoom and move the image."
          {...responder.panHandlers} />
      </View>
      <View style={styles.toolbar}>
        <ToolButton label="Undo" icon="arrow-undo" disabled={!history.past.length}
          onPress={() => updateHistory(undoEdit(historyRef.current))} />
        <ToolButton label="Redo" icon="arrow-redo" disabled={!history.future.length}
          onPress={() => updateHistory(redoEdit(historyRef.current))} />
        <ToolButton label="Next box" icon="layers-outline" disabled={!boxes.length} onPress={nextBox} />
        <ToolButton label="Delete box" icon="trash-outline" disabled={!selected} onPress={deleteSelected} />
      </View>
      <View style={styles.saveBar}>
        <ToolButton label={savingBox ? 'Saving…' : selected ? 'Save box' : 'Save changes'} icon="save-outline" active
          disabled={!sizeReady || savingBox || (!selected && !dirty)} onPress={saveBox} />
        <ToolButton label="Done" icon="checkmark" disabled={!sizeReady || savingBox}
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
  const persistAnnotations = async (boxes: BoundingBoxAnnotation[], source: Size, close: boolean): Promise<boolean> => {
      if (savingRef.current) return false;
      savingRef.current = true;
      setSaving(true);
      try {
        const result = completeAnnotationEdit(batchData, image.id, boxes, source);
        if (batchData.editingSavedBatch) {
          const saved = await saveOpenedBatch(result.batch, saveBatchAnnotations);
          setBatchData(saved);
          if (close) router.replace({ pathname: '/screens/imaging/saved-batch', params: { batchId: saved.id! } });
        } else {
          setBatchData(result.batch);
          if (close) router.replace(result.route);
        }
        return true;
      } catch (error) {
        showAlert('Unable to save annotations', error instanceof Error ? error.message : 'Please check your boxes and try again.');
        return false;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
  };
  return <View style={styles.screen}>
    <AnnotationCanvas key={`${batchData.id ?? batchData.name}:${image.id}:${editorSession}`}
      image={image} weedName={batchData.botanicalName || 'Weed of interest'}
      onSave={(boxes, source) => persistAnnotations(boxes, source, false)}
      onDone={(boxes, source) => persistAnnotations(boxes, source, true)} />
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
  boxInstructions: { height: 54 },
  imageInfo: { color: '#B5C4CD', fontSize: 12, marginTop: 3 },
  modeBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingBottom: 8 },
  viewport: { flex: 1, minHeight: 100, overflow: 'hidden', backgroundColor: '#000' },
  box: { position: 'absolute', borderWidth: 2, borderColor: '#ff3b30', backgroundColor: 'rgba(255,59,48,0.06)' },
  boxLabel: { position: 'absolute', left: -2, paddingHorizontal: 4, backgroundColor: '#b71c1c',
    color: '#fff', fontSize: 12, lineHeight: 20, fontWeight: '700' },
  handle: { position: 'absolute', width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#101820', backgroundColor: '#ff3b30' },
  saveBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 8 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#40515A' },
  toolButton: { flexGrow: 1, minHeight: 44, minWidth: 44, paddingHorizontal: 9, paddingVertical: 7,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 7, backgroundColor: '#40515A' },
  activeButton: { backgroundColor: '#236B3A', borderWidth: 1, borderColor: '#66DC8E' },
  disabledButton: { opacity: 0.35 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  errorText: { color: '#fff', padding: 24 },
});
