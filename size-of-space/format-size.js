// Converts object radius (km) to a human-readable diameter string.
// Radii match the original neal.fun data: km for solar-system scale,
// h(lightYears) = 9.461e12 * ly for nebulae and galaxies.
const LY_KM = 9.461e12;

export function formatDiameter(radKm) {
  const dKm = radKm * 2;

  if (dKm < 1) {
    const m = dKm * 1000;
    return m < 10 ? `${m.toFixed(1)} m` : `${Math.round(m).toLocaleString('en-US')} m`;
  }

  if (dKm < 1e6) {
    if (dKm < 100) return `${dKm.toFixed(1)} km`;
    return `${Math.round(dKm).toLocaleString('en-US')} km`;
  }

  if (dKm < LY_KM) {
    const millions = dKm / 1e6;
    if (millions < 1000) {
      return `${millions.toLocaleString('en-US', { maximumFractionDigits: 2 })} million km`;
    }
    return `${(dKm / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })} billion km`;
  }

  const dLy = dKm / LY_KM;

  if (dLy < 1e6) {
    if (dLy < 10) return `${dLy.toFixed(1)} light-years`;
    return `${Math.round(dLy).toLocaleString('en-US')} light-years`;
  }

  if (dLy < 1e9) {
    return `${(dLy / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })} million light-years`;
  }

  return `${(dLy / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })} billion light-years`;
}

export function lyToKm(lightYears) {
  return 9461e9 * lightYears;
}
