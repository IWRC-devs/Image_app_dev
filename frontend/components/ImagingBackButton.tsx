import { Ionicons } from '@expo/vector-icons';
import { type Href, usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { useBatch } from '@/app/context/BatchContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export function ImagingBackButton({ onPress, disabled = false }: {
  onPress?: () => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { batchData } = useBatch();
  const color = useThemeColor({}, 'text');
  const imageList = batchData?.selectedOption === 'capture'
    ? '/screens/imaging/capture-image' : '/screens/imaging/image-selection';
  const previousSteps: Record<string, Href> = {
    '/screens/imaging/location': '/',
    '/screens/imaging/parameters': '/screens/imaging/location',
    '/screens/imaging/image-option': '/screens/imaging/parameters',
    '/screens/imaging/image-selection': '/screens/imaging/image-option',
    '/screens/imaging/capture-image': '/screens/imaging/image-option',
    '/screens/imaging/review-summary': imageList,
    '/screens/imaging/annotation-editor': batchData?.editingSavedBatch
      ? { pathname: '/screens/imaging/saved-batch', params: { batchId: batchData.id ?? '' } } : imageList,
    '/screens/imaging/saved-batch': '/screens/imaging/pending-uploads',
    '/screens/imaging/pending-uploads': '/',
  };

  const goBack = () => {
    // Follow collection steps even after Done replaces the annotation route.
    router.replace(previousSteps[pathname] ?? '/');
  };

  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress ?? goBack}
      style={[styles.button, disabled && styles.disabled]}>
      <Ionicons name="chevron-back" size={24} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
});
