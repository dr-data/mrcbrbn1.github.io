/** CCC1021 chapter map — ordered sections for tour & hub */
export const CHAPTERS = [
  {
    id: 'human-scale',
    title: 'Human Scale',
    titleZh: '人類尺度',
    objective: 'Understand how human-made objects compare to each other in space.',
    takeaway: 'Even our largest rockets are tiny on a cosmic scale.',
    startIndex: 0,
    endIndex: 4,
  },
  {
    id: 'small-bodies',
    title: 'Asteroids & Moons',
    titleZh: '小行星與衛星',
    objective: 'Compare small solar-system bodies and moons to familiar Earth sizes.',
    takeaway: 'Many moons are smaller than Earth, but some are surprisingly large.',
    startIndex: 5,
    endIndex: 16,
  },
  {
    id: 'planets',
    title: 'Planets & the Sun',
    titleZh: '行星與太陽',
    objective: 'Distinguish rocky planets, gas giants, ice giants, and the Sun.',
    takeaway: 'The Sun contains over 99% of the mass in our solar system.',
    startIndex: 17,
    endIndex: 26,
  },
  {
    id: 'stars',
    title: 'Stars & Stellar Giants',
    titleZh: '恆星與巨星',
    objective: 'See how stars vary enormously in size during their lifetimes.',
    takeaway: 'A star\'s diameter does not always mean it has more mass.',
    startIndex: 27,
    endIndex: 35,
  },
  {
    id: 'nebulae-black-holes',
    title: 'Black Holes & Nebulae',
    titleZh: '黑洞與星雲',
    objective: 'Explore event horizons, supernova remnants, and glowing nebulae.',
    takeaway: 'Black hole "size" usually means the event horizon, not a solid surface.',
    startIndex: 36,
    endIndex: 45,
  },
  {
    id: 'cosmos',
    title: 'Galaxies & the Cosmos',
    titleZh: '星系與宇宙',
    objective: 'Grasp the scale of galaxies, superclusters, and the observable universe.',
    takeaway: 'We can only observe a finite region — the observable universe.',
    startIndex: 46,
    endIndex: 59,
  },
];

export function chapterForIndex(index) {
  return CHAPTERS.find((c) => index >= c.startIndex && index <= c.endIndex) ?? CHAPTERS[0];
}

export function chapterProgress(visitedIndices, chapter) {
  const range = chapter.endIndex - chapter.startIndex + 1;
  const visited = visitedIndices.filter((i) => i >= chapter.startIndex && i <= chapter.endIndex).length;
  return Math.round((visited / range) * 100);
}
