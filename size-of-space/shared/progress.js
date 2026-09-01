const STORAGE_KEY = 'ccc1021-space-progress';

const defaultState = () => ({
  visited: [],
  chapterCompleted: {},
  quizAnswers: {},
  reflections: {},
  gradedSubmissions: [],
  mode: null,
  updatedAt: new Date().toISOString(),
});

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export function saveProgress(state) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function markVisited(index) {
  const state = loadProgress();
  if (!state.visited.includes(index)) state.visited.push(index);
  saveProgress(state);
  return state;
}

export function saveReflection(chapterId, text) {
  const state = loadProgress();
  state.reflections[chapterId] = text;
  saveProgress(state);
  return state;
}

export function saveQuizAnswers(answers) {
  const state = loadProgress();
  state.quizAnswers = answers;
  saveProgress(state);
  return state;
}

export function exportProgressForTeacher({ studentName, studentId, assignmentCode }) {
  const state = loadProgress();
  return {
    course: 'CCC1021 SpaceTech',
    assignmentCode: assignmentCode || 'CCC1021-SCALE-01',
    studentName,
    studentId,
    exportedAt: new Date().toISOString(),
    visitedCount: state.visited.length,
    visitedIndices: state.visited,
    reflections: state.reflections,
    quizAnswers: state.quizAnswers,
  };
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
