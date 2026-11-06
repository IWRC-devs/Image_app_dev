import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLLECTOR_PROFILE_KEY, getCollectorProfileError, normalizeCollectorProfile, parseCollectorProfile } from './collectorProfile.ts';
import type { CollectorProfile } from './collectorProfile.ts';

export async function loadCollectorProfile() {
  return parseCollectorProfile(await AsyncStorage.getItem(COLLECTOR_PROFILE_KEY));
}

export async function saveCollectorProfile(value: CollectorProfile) {
  const error = getCollectorProfileError(value);
  if (error) throw new Error(error);
  await AsyncStorage.setItem(COLLECTOR_PROFILE_KEY, JSON.stringify(normalizeCollectorProfile(value)));
}
