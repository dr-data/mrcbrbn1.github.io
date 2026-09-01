import { test } from 'node:test';
import assert from 'node:assert/strict';
import { humanSizeRatio, earthSizeRatio, humanRatioLabel, earthRatioLabel } from './shared/size-ratios.js';

test('human ratio for astronaut spacesuit diameter', () => {
  const r = humanSizeRatio(0.0016764);
  assert.ok(r > 1.5 && r < 2.5);
});

test('earth ratio for Earth is 1', () => {
  assert.equal(earthSizeRatio(6378.1).toFixed(2), '1.00');
  assert.match(earthRatioLabel(6378.1, 'Earth'), /1\.00×/);
});

test('Jupiter vs Earth ratio', () => {
  const ratio = earthSizeRatio(69911);
  assert.ok(ratio > 10);
  assert.match(earthRatioLabel(69911, 'Jupiter'), /×/);
});
