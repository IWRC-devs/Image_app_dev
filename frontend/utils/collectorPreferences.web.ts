import { COLLECTOR_PROFILE_KEY, getCollectorProfileError, normalizeCollectorProfile, parseCollectorProfile } from './collectorProfile.ts';
import type { CollectorProfile } from './collectorProfile.ts';

export async function loadCollectorProfile() {
  return parseCollectorProfile(localStorage.getItem(COLLECTOR_PROFILE_KEY));
}

export async function saveCollectorProfile(value: CollectorProfile) {
  const error = getCollectorProfileError(value);
  if (error) throw new Error(error);
  localStorage.setItem(COLLECTOR_PROFILE_KEY, JSON.stringify(normalizeCollectorProfile(value)));
}
