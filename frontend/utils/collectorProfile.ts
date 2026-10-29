export type CollectorProfile = {
  collectorName: string;
  collectorEmail: string;
  organization: string;
  locationCountry: string;
  locationState: string;
};

export const COLLECTOR_PROFILE_KEY = 'iwrc_imaging_collector_profile_v1';

export function normalizeCollectorProfile(value: unknown): CollectorProfile {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const text = (key: string) => typeof record[key] === 'string' ? record[key].trim() : '';
  return {
    collectorName: text('collectorName'),
    collectorEmail: text('collectorEmail'),
    organization: text('organization'),
    locationCountry: text('locationCountry'),
    locationState: text('locationState'),
  };
}

export function getCollectorProfileError(value: unknown): string | null {
  const profile = normalizeCollectorProfile(value);
  if (Object.values(profile).some((field) => !field)) {
    return 'Please fill in collector/team name, email address, organization, country and state.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.collectorEmail)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function parseCollectorProfile(saved: string | null): CollectorProfile | null {
  if (!saved) return null;
  try {
    const profile = normalizeCollectorProfile(JSON.parse(saved));
    return getCollectorProfileError(profile) ? null : profile;
  } catch {
    return null;
  }
}
