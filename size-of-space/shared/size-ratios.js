/** Reference sizes for student-friendly ratio display */
export const HUMAN_HEIGHT_M = 1.7;
export const EARTH_DIAMETER_KM = 12756.2;

export function diameterKm(radiusKm) {
  return radiusKm * 2;
}

export function humanSizeRatio(radiusKm) {
  const diameterM = diameterKm(radiusKm) * 1000;
  return diameterM / HUMAN_HEIGHT_M;
}

export function earthSizeRatio(radiusKm) {
  return diameterKm(radiusKm) / EARTH_DIAMETER_KM;
}

function formatRatio(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—';
  if (ratio >= 1e9) return `${(ratio / 1e9).toFixed(2)} billion`;
  if (ratio >= 1e6) return `${(ratio / 1e6).toFixed(2)} million`;
  if (ratio >= 1e3) return `${(ratio / 1e3).toFixed(2)} thousand`;
  return ratio.toFixed(2);
}

export function humanRatioLabel(radiusKm, objectName) {
  const ratio = humanSizeRatio(radiusKm);
  return `≈ ${formatRatio(ratio)}× human height (1.7 m)`;
}

export function earthRatioLabel(radiusKm, objectName) {
  const ratio = earthSizeRatio(radiusKm);
  if (objectName === 'Earth') return "≈ 1.00× Earth's diameter";
  return `≈ ${formatRatio(ratio)}× Earth's diameter`;
}
