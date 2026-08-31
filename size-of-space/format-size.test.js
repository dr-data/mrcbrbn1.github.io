import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDiameter, lyToKm } from './format-size.js';
import { SPACE_OBJECTS } from './objects.js';

const LY_KM = 9.461e12;

test('lyToKm matches original h() function', () => {
  assert.equal(lyToKm(1), 9461e9);
  assert.equal(lyToKm(52850), 9461e9 * 52850);
});

test('formatDiameter — human scale', () => {
  const astronaut = SPACE_OBJECTS.find((o) => o.name === 'Astronaut');
  assert.equal(formatDiameter(astronaut.rad), '3.4 m');
});

test('formatDiameter — Earth equatorial diameter', () => {
  const earth = SPACE_OBJECTS.find((o) => o.name === 'Earth');
  assert.equal(formatDiameter(earth.rad), '12,756 km');
});

test('formatDiameter — Sun', () => {
  const sun = SPACE_OBJECTS.find((o) => o.name === 'Sun');
  assert.equal(formatDiameter(sun.rad), '1.39 million km');
});

test('formatDiameter — Jupiter', () => {
  const jupiter = SPACE_OBJECTS.find((o) => o.name === 'Jupiter');
  assert.equal(formatDiameter(jupiter.rad), '139,822 km');
});

test('formatDiameter — Milky Way', () => {
  const milkyWay = SPACE_OBJECTS.find((o) => o.name === 'Milky Way Galaxy');
  const dLy = (milkyWay.rad * 2) / LY_KM;
  assert.ok(Math.abs(dLy - 105700) < 100, `expected ~105,700 ly, got ${dLy}`);
  assert.equal(formatDiameter(milkyWay.rad), '105,700 light-years');
});

test('formatDiameter — Observable Universe', () => {
  const universe = SPACE_OBJECTS.find((o) => o.name === 'Observable Universe');
  const dLy = (universe.rad * 2) / LY_KM;
  assert.ok(Math.abs(dLy - 93.02e9) < 0.1e9, `expected ~93 billion ly diameter`);
  assert.equal(formatDiameter(universe.rad), '93.02 billion light-years');
});

test('all objects have positive radius', () => {
  SPACE_OBJECTS.forEach((obj) => {
    assert.ok(obj.rad > 0, `${obj.name} must have positive radius`);
  });
});

test('object count matches original game', () => {
  assert.equal(SPACE_OBJECTS.length, 60);
});
