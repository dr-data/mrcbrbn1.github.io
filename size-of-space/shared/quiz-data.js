import { CHAPTERS } from './chapters.js';

/** Informal self-quiz + optional graded questions for CCC1021 */
export const QUIZ_BANK = [
  {
    chapterId: 'human-scale',
    question: 'Which is larger in diameter: the International Space Station or the Saturn V rocket?',
    options: ['Space Station', 'Saturn V Rocket', 'They are the same size'],
    answer: 0,
    explanation: 'The Space Station (~108 m) is wider than the Saturn V rocket (~111 m length, but smaller diameter).',
  },
  {
    chapterId: 'human-scale',
    question: 'Why do we start the tour with an astronaut?',
    options: ['It is the largest object', 'It gives a human-scale reference point', 'It is the oldest object'],
    answer: 1,
    explanation: 'Starting with a human helps you anchor all later sizes to something familiar.',
  },
  {
    chapterId: 'small-bodies',
    question: 'Which is wider: our Moon or the dwarf planet Pluto?',
    options: ['Moon', 'Pluto', 'Same size'],
    answer: 0,
    explanation: 'The Moon (~3,476 km diameter) is wider than Pluto (~2,390 km).',
  },
  {
    chapterId: 'planets',
    question: 'Which planet is the widest?',
    options: ['Earth', 'Jupiter', 'Saturn'],
    answer: 1,
    explanation: 'Jupiter is the largest planet — about 11× wider than Earth.',
  },
  {
    chapterId: 'planets',
    question: 'True or false: Saturn would sink in water because it is so large.',
    options: ['True', 'False'],
    answer: 1,
    explanation: 'False — Saturn is less dense than water and would float (if you had an enormous ocean).',
  },
  {
    chapterId: 'planets',
    question: 'What powers the Sun?',
    options: ['Chemical burning', 'Nuclear fusion', 'Electricity'],
    answer: 1,
    explanation: 'The Sun fuses hydrogen into helium, releasing enormous energy.',
  },
  {
    chapterId: 'stars',
    question: 'Betelgeuse is very large in diameter. What type of star is it?',
    options: ['White dwarf', 'Red supergiant', 'Neutron star'],
    answer: 1,
    explanation: 'Betelgeuse is a red supergiant near the end of its life.',
  },
  {
    chapterId: 'stars',
    question: 'Does a larger diameter always mean a star has more mass?',
    options: ['Yes, always', 'No, not always'],
    answer: 1,
    explanation: 'Giants can be large in size but relatively low in density compared to compact stars.',
  },
  {
    chapterId: 'nebulae-black-holes',
    question: 'What does the "size" of a black hole usually refer to?',
    options: ['Its solid surface', 'The event horizon', 'Its colour'],
    answer: 1,
    explanation: 'The event horizon is the boundary beyond which light cannot escape.',
  },
  {
    chapterId: 'nebulae-black-holes',
    question: 'Planetary nebulae are named because:',
    options: ['They contain planets', 'They looked like planets in early telescopes', 'They orbit planets'],
    answer: 1,
    explanation: 'Early astronomers thought they looked like planets — a historical naming quirk.',
  },
  {
    chapterId: 'cosmos',
    question: 'The Milky Way is best described as:',
    options: ['A spiral/barred spiral galaxy', 'A single star', 'A planet'],
    answer: 0,
    explanation: 'The Milky Way is our home barred spiral galaxy.',
  },
  {
    chapterId: 'cosmos',
    question: '"Observable universe" means:',
    options: ['Everything that exists', 'The region we can see from Earth', 'Only our galaxy'],
    answer: 1,
    explanation: 'We can only observe light that has had time to reach us since the Big Bang.',
  },
  {
    chapterId: 'cosmos',
    question: 'Andromeda and the Milky Way will:',
    options: ['Never interact', 'Merge in billions of years', 'Explode tomorrow'],
    answer: 1,
    explanation: 'They are on a collision course, but stars will mostly pass by each other.',
  },
];

export function quizForChapter(chapterId) {
  return QUIZ_BANK.filter((q) => q.chapterId === chapterId);
}

export function allQuizQuestions() {
  return QUIZ_BANK;
}

export function gradeQuiz(answers) {
  let correct = 0;
  const results = QUIZ_BANK.map((q, i) => {
    const ok = answers[i] === q.answer;
    if (ok) correct += 1;
    return { ...q, userAnswer: answers[i], correct: ok };
  });
  return {
    score: correct,
    total: QUIZ_BANK.length,
    percent: Math.round((correct / QUIZ_BANK.length) * 100),
    results,
  };
}

export function chapterQuizSummary(chapterId, answers) {
  const questions = quizForChapter(chapterId);
  const indices = QUIZ_BANK.map((q, i) => (q.chapterId === chapterId ? i : -1)).filter((i) => i >= 0);
  let correct = 0;
  indices.forEach((i) => {
    if (answers[i] === QUIZ_BANK[i].answer) correct += 1;
  });
  return { correct, total: questions.length, percent: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
}
