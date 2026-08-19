import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useBatch } from '@/app/context/BatchContext';

function getTabRouteName(props: BottomTabBarButtonProps) {
  const runtimeProps = props as any;
  const directName = runtimeProps.route?.name ?? runtimeProps.to?.split('/').pop() ?? runtimeProps.href?.split('/').pop() ?? '';
  return String(directName).replace(/\?.*$/, '').replace(/#.*$/, '');
}

function canAccessTab(routeName: string, batchData: any) {
  const hasLocation = !!batchData?.locationCountry && !!batchData?.locationState;
  const hasParameters = !!batchData?.botanicalName && !!batchData?.weedBackground && !!batchData?.weedSite && !!batchData?.growthStage && !!batchData?.soilColor && batchData?.lightingId != null;
  const hasSelection = !!batchData?.selectedOption;
  const hasImages = (batchData?.images?.length ?? 0) > 0;

  switch (routeName) {
    case 'location':
      return true;
    case 'parameters':
      return hasLocation;
    case 'image-option':
      return hasLocation && hasParameters;
    case 'review-summary':
      return hasLocation && hasParameters && hasSelection && hasImages;
    default:
      return true;
  }
}

export function HapticTab(props: BottomTabBarButtonProps) {
  const { batchData } = useBatch();
  const routeName = getTabRouteName(props);
  const isAllowed = canAccessTab(routeName, batchData);

  return (
    <PlatformPressable
      {...props}
      disabled={!isAllowed}
      accessibilityState={{ ...props.accessibilityState, disabled: !isAllowed }}
      style={[
        props.style,
        !isAllowed && { opacity: 0.4 },
      ]}
      onPress={(ev) => {
        if (!isAllowed) return;
        props.onPress?.(ev);
      }}
      onPressIn={(ev) => {
        if (!isAllowed) return;
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
