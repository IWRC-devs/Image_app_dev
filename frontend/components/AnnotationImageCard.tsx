import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import type { ImageItem } from '@/types';

export function AnnotationImageCard({ image, index, weedName, onAnnotate, onRemove }: {
  image: ImageItem;
  index: number;
  weedName: string | null;
  onAnnotate: () => void;
  onRemove: () => void;
}) {
  const name = weedName?.trim() || 'Weed of interest';
  return (
    <View style={styles.card}>
      <View style={styles.preview}>
        <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove image ${index + 1}`} onPress={onRemove} style={styles.remove}>
          <Ionicons name="close-circle" size={30} color="#ff5a5f" />
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.fileName} numberOfLines={1}>{image.fileName || `Image ${index + 1}`}</ThemedText>
      <ThemedText style={styles.weedName}>{name}</ThemedText>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Annotate image ${index + 1}: ${name}`} onPress={onAnnotate} style={styles.annotate}>
        <Ionicons name="scan-outline" size={22} color="#fff" />
        <ThemedText style={styles.buttonText}>{image.annotations?.length ? 'Edit annotation' : 'Annotate'}</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexBasis: 180, flexGrow: 1, maxWidth: 360, padding: 10, borderRadius: 12, backgroundColor: '#26343d' },
  preview: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#101820', borderRadius: 8, overflow: 'hidden' },
  remove: { position: 'absolute', top: 5, right: 5, backgroundColor: '#fff', borderRadius: 20 },
  fileName: { color: '#d5dee3', fontSize: 13, marginTop: 8 },
  weedName: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 4, marginBottom: 10 },
  annotate: { minHeight: 52, backgroundColor: '#2e7d32', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
