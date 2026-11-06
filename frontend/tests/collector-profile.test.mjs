import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLLECTOR_PROFILE_KEY, getCollectorProfileError } from '../utils/collectorProfile.ts';
import { loadCollectorProfile, saveCollectorProfile } from '../utils/collectorPreferences.web.ts';

const entries = new Map();
globalThis.localStorage = {
  getItem: (key) => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, String(value)),
};
const profile = {
  collectorName: 'Sample Collector', collectorEmail: 'collector@example.org',
  organization: 'Example Organization', locationCountry: 'United States', locationState: 'Texas',
};

test('every collector and location field is required, including a valid email', () => {
  assert.equal(getCollectorProfileError(profile), null);
  for (const field of Object.keys(profile)) {
    assert.ok(getCollectorProfileError({ ...profile, [field]: '' }), field);
    assert.ok(getCollectorProfileError({ ...profile, [field]: '   ' }), field);
  }
  assert.ok(getCollectorProfileError({ ...profile, collectorEmail: 'missing-at-sign' }));
});

test('saved defaults survive a fresh page module and later edits replace them', async () => {
  await saveCollectorProfile({ ...profile, collectorName: '  Sample Collector  ' });
  const freshPage = await import(`../utils/collectorPreferences.web.ts?reload=${Date.now()}`);
  assert.deepEqual(await freshPage.loadCollectorProfile(), profile);
  const updated = { ...profile, organization: 'Updated Organization', locationState: 'Colorado' };
  await freshPage.saveCollectorProfile(updated);
  assert.deepEqual(await loadCollectorProfile(), updated);
  await assert.rejects(saveCollectorProfile({ ...profile, collectorEmail: '' }));
  assert.deepEqual(await loadCollectorProfile(), updated);
});

test('missing, malformed or incomplete stored defaults require setup again', async () => {
  entries.clear();
  assert.equal(await loadCollectorProfile(), null);
  entries.set(COLLECTOR_PROFILE_KEY, '{broken JSON');
  assert.equal(await loadCollectorProfile(), null);
  entries.set(COLLECTOR_PROFILE_KEY, JSON.stringify({ collectorName: 'Only a name' }));
  assert.equal(await loadCollectorProfile(), null);
});
