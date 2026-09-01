import { formatDiameter } from '../format-size.js';

/** Plain-language size comparison for non-science students */
export function compareToText(obj, allObjects) {
  if (obj.compareText) return obj.compareText;

  const earth = allObjects.find((o) => o.name === 'Earth');
  const moon = allObjects.find((o) => o.name === 'Moon');
  if (!earth) return '';

  const ratio = obj.rad / earth.rad;
  if (obj.name === 'Earth') return 'Our home planet — the reference for many comparisons';
  if (obj.name === 'Moon' && moon) return 'About ¼ the width of Earth';
  if (obj.name === 'Sun') return 'About 109× wider than Earth';
  if (obj.name === 'Jupiter') return `About ${(obj.rad / earth.rad).toFixed(0)}× wider than Earth`;
  if (ratio < 0.01) return 'Far smaller than Earth — smaller than a city on a globe';
  if (ratio < 1) return `About ${(ratio * 100).toFixed(0)}% of Earth's width`;
  if (ratio < 10) return `About ${ratio.toFixed(1)}× wider than Earth`;
  if (ratio < 1000) return `About ${Math.round(ratio)}× wider than Earth`;

  return `Vastly larger than Earth — ${formatDiameter(obj.rad)} across`;
}

export function volumeFitCount(largerRad, smallerRad) {
  if (smallerRad <= 0 || largerRad <= smallerRad) return 0;
  return Math.floor((largerRad ** 3) / (smallerRad ** 3));
}

export function volumeFitLabel(larger, smaller) {
  const count = volumeFitCount(larger.rad, smaller.rad);
  if (count < 2) return null;
  const formatted = count >= 1e6 ? `${(count / 1e6).toFixed(1)} million` : count.toLocaleString('en-US');
  return `About ${formatted} ${smaller.name}s could fit inside ${larger.name} (by volume)`;
}

export function sizeRatioText(a, b) {
  const ratio = a.rad / b.rad;
  if (ratio >= 1) {
    return `${a.name} is about ${ratio.toFixed(ratio < 10 ? 1 : 0)}× wider than ${b.name}`;
  }
  return `${b.name} is about ${(b.rad / a.rad).toFixed((b.rad / a.rad) < 10 ? 1 : 0)}× wider than ${a.name}`;
}
