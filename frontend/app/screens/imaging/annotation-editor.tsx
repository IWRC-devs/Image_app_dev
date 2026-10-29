import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import uuid from "react-native-uuid";

import { useBatch } from "@/app/context/BatchContext";
import { ThemedText } from "@/components/ThemedText";
import { BoundingBoxAnnotation } from "@/types";
import { completeAnnotationEdit } from '@/utils/annotationEditing';
import { showAlert } from '@/utils/alerts';

const MIN_BOX_SIZE = 0.04;
const HANDLE_SIZE = 26;

type Size = { width: number; height: number };
type Corner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function makeDefaultBox(className?: string | null): BoundingBoxAnnotation {
  return {
    id: uuid.v4() as string,
    classId: 0,
    className: className || "weed_of_interest",
    xCenter: 0.5,
    yCenter: 0.5,
    width: 0.4,
    height: 0.4,
  };
}

function CornerHandle({
  corner,
  box,
  canvas,
  onChange,
}: {
  corner: Corner;
  box: BoundingBoxAnnotation;
  canvas: Size;
  onChange: (box: BoundingBoxAnnotation) => void;
}) {
  const boxRef = useRef(box);
  const startRef = useRef(box);
  boxRef.current = box;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = boxRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const start = startRef.current;
          let left = start.xCenter - start.width / 2;
          let right = start.xCenter + start.width / 2;
          let top = start.yCenter - start.height / 2;
          let bottom = start.yCenter + start.height / 2;
          const dx = gesture.dx / canvas.width;
          const dy = gesture.dy / canvas.height;

          if (corner === "topLeft" || corner === "bottomLeft") {
            left = clamp(left + dx, 0, right - MIN_BOX_SIZE);
          } else {
            right = clamp(right + dx, left + MIN_BOX_SIZE, 1);
          }

          if (corner === "topLeft" || corner === "topRight") {
            top = clamp(top + dy, 0, bottom - MIN_BOX_SIZE);
          } else {
            bottom = clamp(bottom + dy, top + MIN_BOX_SIZE, 1);
          }

          onChangeRef.current({
            ...start,
            xCenter: (left + right) / 2,
            yCenter: (top + bottom) / 2,
            width: right - left,
            height: bottom - top,
          });
        },
      }),
    [canvas.height, canvas.width, corner]
  );

  return <View style={[styles.handle, styles[corner]]} {...responder.panHandlers} />;
}

function BoundingBox({
  box,
  canvas,
  weedName,
  selected,
  onSelect,
  onChange,
}: {
  box: BoundingBoxAnnotation;
  canvas: Size;
  weedName: string;
  selected: boolean;
  onSelect: () => void;
  onChange: (box: BoundingBoxAnnotation) => void;
}) {
  const boxRef = useRef(box);
  const startRef = useRef(box);
  boxRef.current = box;
  const callbacks = useRef({ onSelect, onChange });
  callbacks.current = { onSelect, onChange };

  const moveResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          callbacks.current.onSelect();
          startRef.current = boxRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const start = startRef.current;
          callbacks.current.onChange({
            ...start,
            xCenter: clamp(
              start.xCenter + gesture.dx / canvas.width,
              start.width / 2,
              1 - start.width / 2
            ),
            yCenter: clamp(
              start.yCenter + gesture.dy / canvas.height,
              start.height / 2,
              1 - start.height / 2
            ),
          });
        },
      }),
    [canvas.height, canvas.width]
  );

  const left = (box.xCenter - box.width / 2) * canvas.width;
  const top = (box.yCenter - box.height / 2) * canvas.height;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.box,
        {
          left,
          top,
          width: box.width * canvas.width,
          height: box.height * canvas.height,
          borderColor: selected ? "#00E676" : "#FFEB3B",
        },
      ]}
    >
      <View style={styles.dragSurface} {...moveResponder.panHandlers}>
        <ThemedText style={[styles.boxLabel, { top: top < 24 ? 3 : -24, maxWidth: canvas.width - left }]} numberOfLines={1}>{weedName}</ThemedText>
      </View>
      {selected &&
        (["topLeft", "topRight", "bottomLeft", "bottomRight"] as Corner[]).map(
          (corner) => (
            <CornerHandle
              key={corner}
              corner={corner}
              box={box}
              canvas={canvas}
              onChange={onChange}
            />
          )
        )}
    </View>
  );
}

export default function AnnotationEditorScreen() {
  const { imageId } = useLocalSearchParams<{ imageId: string }>();
  const router = useRouter();
  const { batchData, setBatchData } = useBatch();
  const image = batchData?.images.find((item) => item.id === imageId);
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [sourceSize, setSourceSize] = useState<Size>({
    width: image?.width || 1,
    height: image?.height || 1,
  });
  const [boxes, setBoxes] = useState<BoundingBoxAnnotation[]>(() =>
    image?.annotations ?? [makeDefaultBox(batchData?.botanicalName)]
  );
  const [selectedId, setSelectedId] = useState<string | null>(() => boxes[0]?.id ?? null);
  const previousImageId = useRef(image?.id);

  useEffect(() => {
    if (previousImageId.current === image?.id) return;
    previousImageId.current = image?.id;
    const annotations = image?.annotations ?? [makeDefaultBox(batchData?.botanicalName)];
    setBoxes(annotations);
    setSelectedId(annotations[0]?.id ?? null);
    setSourceSize({ width: image?.width || 1, height: image?.height || 1 });
  }, [image, batchData?.botanicalName]);

  useEffect(() => {
    if (!image || (image.width && image.height)) return;
    let active = true;
    Image.getSize(image.uri, (width, height) => {
      if (active) setSourceSize({ width, height });
    }, () => {});
    return () => { active = false; };
  }, [image]);

  if (!batchData || !image) {
    return (
      <SafeAreaView style={styles.screen}>
        <ThemedText style={styles.errorText}>This image is no longer available.</ThemedText>
      </SafeAreaView>
    );
  }

  const updateBox = (updated: BoundingBoxAnnotation) => {
    setBoxes((current) => current.map((box) => (box.id === updated.id ? updated : box)));
  };

  const addBox = () => {
    const box = makeDefaultBox(batchData.botanicalName);
    setBoxes((current) => [...current, box]);
    setSelectedId(box.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setBoxes((current) => current.filter((box) => box.id !== selectedId));
    setSelectedId(null);
  };

  const saveAnnotations = () => {
    try {
      const result = completeAnnotationEdit(batchData, image.id, boxes, sourceSize);
      setBatchData(result.batch);
      router.replace(result.route);
    } catch (error) {
      showAlert('Unable to keep annotations', error instanceof Error ? error.message : 'Please check your boxes and try again.');
    }
  };

  const onViewportLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  const sourceRatio = sourceSize.width / sourceSize.height;
  const viewportRatio = viewport.width && viewport.height ? viewport.width / viewport.height : 1;
  const canvas =
    sourceRatio > viewportRatio
      ? { width: viewport.width, height: viewport.width / sourceRatio }
      : { width: viewport.height * sourceRatio, height: viewport.height };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.instructions}>
        <ThemedText style={styles.title}>{batchData.botanicalName || 'Weed of interest'}</ThemedText>
        <ThemedText style={styles.helpText}>
          Drag inside a box to move it. Drag any corner to resize it.
        </ThemedText>
        <ThemedText style={styles.imageInfo}>
          {sourceSize.width} × {sourceSize.height} px · {boxes.length ? `${boxes.length} ${boxes.length === 1 ? 'box' : 'boxes'}` : 'No boxes'}
        </ThemedText>
      </View>

      <View style={styles.viewport} onLayout={onViewportLayout}>
        {canvas.width > 0 && canvas.height > 0 && (
          <Pressable style={[styles.canvas, canvas]} onPress={() => setSelectedId(null)}>
            <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            {boxes.map((box) => (
              <BoundingBox
                key={box.id}
                box={box}
                canvas={canvas}
                weedName={batchData.botanicalName || box.className || 'Weed of interest'}
                selected={box.id === selectedId}
                onSelect={() => setSelectedId(box.id)}
                onChange={updateBox}
              />
            ))}
          </Pressable>
        )}
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.secondaryButton} onPress={addBox}>
          <Ionicons name="add" size={22} color="#fff" />
          <ThemedText style={styles.buttonText}>Add box</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, !selectedId && styles.disabledButton]}
          onPress={deleteSelected}
          disabled={!selectedId}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <ThemedText style={styles.buttonText}>Delete</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={saveAnnotations}>
          <Ionicons name="checkmark" size={22} color="#fff" />
          <ThemedText style={styles.buttonText}>Done</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#101820",
  },
  instructions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
  },
  helpText: {
    color: "#D5DEE3",
    marginTop: 4,
  },
  imageInfo: {
    color: "#9FB2BC",
    fontSize: 13,
    marginTop: 5,
  },
  viewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  canvas: {
    position: "relative",
    backgroundColor: "#000",
  },
  box: {
    position: "absolute",
    borderWidth: 3,
  },
  dragSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,230,118,0.08)",
  },
  boxLabel: {
    position: "absolute",
    left: -3,
    top: -24,
    minWidth: 22,
    paddingHorizontal: 5,
    paddingVertical: 2,
    color: "#101820",
    backgroundColor: "#00E676",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  handle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    borderWidth: 3,
    borderColor: "#101820",
    backgroundColor: "#00E676",
  },
  topLeft: {
    left: -HANDLE_SIZE / 2,
    top: -HANDLE_SIZE / 2,
  },
  topRight: {
    right: -HANDLE_SIZE / 2,
    top: -HANDLE_SIZE / 2,
  },
  bottomLeft: {
    left: -HANDLE_SIZE / 2,
    bottom: -HANDLE_SIZE / 2,
  },
  bottomRight: {
    right: -HANDLE_SIZE / 2,
    bottom: -HANDLE_SIZE / 2,
  },
  toolbar: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#40515A",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 8,
    backgroundColor: "#40515A",
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 8,
    backgroundColor: "#2E7D32",
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  errorText: {
    color: "#fff",
    padding: 24,
  },
});
