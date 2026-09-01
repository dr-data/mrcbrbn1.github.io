import { QUIZ_BANK, gradeQuiz } from '../shared/quiz-data.js';

const submissions = [];
const zone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const tbody = document.getElementById('submissions-body');
const summary = document.getElementById('summary');

function scoreClass(percent) {
  if (percent >= 80) return 'score-high';
  if (percent >= 60) return 'score-mid';
  return 'score-low';
}

function computeQuizScore(data) {
  if (data.quizScore) return data.quizScore;
  if (!data.quizAnswers || typeof data.quizAnswers !== 'object') return null;
  const answers = Array.isArray(data.quizAnswers)
    ? data.quizAnswers
    : Object.keys(data.quizAnswers).sort((a, b) => Number(a) - Number(b)).map((k) => data.quizAnswers[k]);
  if (!answers.length) return null;
  const graded = gradeQuiz(answers);
  return { correct: graded.score, total: graded.total, percent: graded.percent };
}

function addSubmission(data, filename) {
  const score = computeQuizScore(data);
  const reflectionCount = data.reflections ? Object.values(data.reflections).filter((r) => r?.trim()).length : 0;

  submissions.push({
    filename,
    studentName: data.studentName || 'Unknown',
    studentId: data.studentId || '—',
    assignmentCode: data.assignmentCode || '—',
    visitedCount: data.visitedCount ?? (data.visitedIndices?.length || 0),
    score,
    exportedAt: data.exportedAt || '—',
    reflectionCount,
    raw: data,
  });
  render();
}

function render() {
  if (!submissions.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="opacity:0.5;text-align:center;padding:24px">No submissions yet</td></tr>';
    summary.textContent = '';
    return;
  }

  summary.textContent = `${submissions.length} submission(s) loaded`;

  tbody.innerHTML = submissions.map((s) => {
    const scoreText = s.score ? `${s.score.correct}/${s.score.total} (${s.score.percent}%)` : '—';
    const scoreBadge = s.score
      ? `<span class="score-badge ${scoreClass(s.score.percent)}">${scoreText}</span>`
      : '—';

    return `
      <tr>
        <td>${s.studentName}</td>
        <td>${s.studentId}</td>
        <td>${s.assignmentCode}</td>
        <td>${s.visitedCount}/60</td>
        <td>${scoreBadge}</td>
        <td>${s.exportedAt !== '—' ? new Date(s.exportedAt).toLocaleString() : '—'}</td>
        <td>${s.reflectionCount} chapter(s)</td>
      </tr>
    `;
  }).join('');
}

function handleFiles(files) {
  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        addSubmission(data, file.name);
      } catch {
        alert(`Could not parse ${file.name} — expected JSON export from student portal.`);
      }
    };
    reader.readAsText(file);
  });
}

zone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

zone.addEventListener('dragover', (e) => {
  e.preventDefault();
  zone.classList.add('dragover');
});
zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
zone.addEventListener('drop', (e) => {
  e.preventDefault();
  zone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

document.getElementById('clear-all').addEventListener('click', () => {
  submissions.length = 0;
  render();
});

document.getElementById('export-csv').addEventListener('click', () => {
  if (!submissions.length) return;
  const header = 'Student Name,Student ID,Assignment,Visited,Quiz Correct,Quiz Total,Quiz %,Exported At,Reflections\n';
  const rows = submissions.map((s) => [
    s.studentName,
    s.studentId,
    s.assignmentCode,
    s.visitedCount,
    s.score?.correct ?? '',
    s.score?.total ?? '',
    s.score?.percent ?? '',
    s.exportedAt,
    s.reflectionCount,
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CCC1021-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});
