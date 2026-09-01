import { QUIZ_BANK, gradeQuiz, quizForChapter } from './quiz-data.js';
import { saveQuizAnswers, exportProgressForTeacher, downloadJson } from './progress.js';

/** Build and show informal self-quiz overlay */
export function showQuizOverlay({ chapterId = null, graded = false, onClose } = {}) {
  const questions = chapterId ? quizForChapter(chapterId) : QUIZ_BANK;
  const globalIndices = chapterId
    ? QUIZ_BANK.map((q, i) => (q.chapterId === chapterId ? i : -1)).filter((i) => i >= 0)
    : QUIZ_BANK.map((_, i) => i);

  const overlay = document.createElement('div');
  overlay.className = 'quiz-overlay';
  overlay.innerHTML = `
    <div class="quiz-card">
      <h2>${chapterId ? 'Chapter Quiz' : 'Self-Quiz'}</h2>
      <p class="quiz-meta">${graded ? 'Graded assignment — export your results when done' : 'Informal practice — no grades recorded unless you export'}</p>
      <div id="quiz-body"></div>
      <div class="quiz-actions" id="quiz-actions"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const answers = new Array(QUIZ_BANK.length).fill(-1);
  let current = 0;
  const body = overlay.querySelector('#quiz-body');
  const actions = overlay.querySelector('#quiz-actions');

  function renderQuestion() {
    const q = questions[current];
    const globalIdx = globalIndices[current];
    body.innerHTML = `
      <div class="quiz-question">
        <p><strong>Q${current + 1}/${questions.length}.</strong> ${q.question}</p>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `
            <label class="quiz-option ${answers[globalIdx] === i ? 'selected' : ''}" data-idx="${i}">
              <input type="radio" name="q" value="${i}" ${answers[globalIdx] === i ? 'checked' : ''} hidden>
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>
    `;

    body.querySelectorAll('.quiz-option').forEach((el) => {
      el.addEventListener('click', () => {
        answers[globalIdx] = Number(el.dataset.idx);
        renderQuestion();
      });
    });

    actions.innerHTML = `
      ${current > 0 ? '<button class="btn-secondary" id="quiz-prev">Previous</button>' : ''}
      ${current < questions.length - 1
        ? '<button class="btn-primary" id="quiz-next">Next</button>'
        : '<button class="btn-primary" id="quiz-submit">See Results</button>'}
      <button class="btn-secondary" id="quiz-close">Close</button>
    `;

    overlay.querySelector('#quiz-prev')?.addEventListener('click', () => { current -= 1; renderQuestion(); });
    overlay.querySelector('#quiz-next')?.addEventListener('click', () => { current += 1; renderQuestion(); });
    overlay.querySelector('#quiz-submit')?.addEventListener('click', () => renderResults());
    overlay.querySelector('#quiz-close')?.addEventListener('click', close);
  }

  function renderResults() {
    saveQuizAnswers(answers);
    const gradedSubset = gradeQuiz(answers);
    const subsetCorrect = globalIndices.filter((i) => answers[i] === QUIZ_BANK[i].answer).length;
    const subsetTotal = globalIndices.length;
    const percent = Math.round((subsetCorrect / subsetTotal) * 100);

    body.innerHTML = `
      <div class="quiz-score">
        <div class="score-num">${subsetCorrect}/${subsetTotal}</div>
        <p>${percent}% correct</p>
      </div>
      ${questions.map((q, qi) => {
        const gi = globalIndices[qi];
        const ok = answers[gi] === q.answer;
        return `
          <div class="quiz-question">
            <p>${q.question}</p>
            <p class="quiz-explanation">${ok ? '✓' : '✗'} ${q.explanation}</p>
          </div>
        `;
      }).join('')}
      ${graded ? `
        <div class="export-form" style="margin-top:20px">
          <label>Student Name</label>
          <input type="text" id="export-name" placeholder="Your name">
          <label>Student ID</label>
          <input type="text" id="export-id" placeholder="Student ID">
          <label>Assignment Code</label>
          <input type="text" id="export-code" value="CCC1021-SCALE-01">
        </div>
      ` : ''}
    `;

    actions.innerHTML = `
      ${graded ? '<button class="btn-primary" id="quiz-export">Export for Teacher</button>' : ''}
      <button class="btn-secondary" id="quiz-close">Close</button>
    `;

    overlay.querySelector('#quiz-export')?.addEventListener('click', () => {
      const name = overlay.querySelector('#export-name')?.value?.trim();
      const id = overlay.querySelector('#export-id')?.value?.trim();
      if (!name || !id) {
        alert('Please enter your name and student ID to export.');
        return;
      }
      const data = exportProgressForTeacher({
        studentName: name,
        studentId: id,
        assignmentCode: overlay.querySelector('#export-code')?.value?.trim() || 'CCC1021-SCALE-01',
      });
      data.quizScore = { correct: subsetCorrect, total: subsetTotal, percent };
      data.quizResults = gradedSubset.results.filter((_, i) => globalIndices.includes(i));
      downloadJson(`CCC1021-${id}-quiz.json`, data);
    });
    overlay.querySelector('#quiz-close')?.addEventListener('click', close);
  }

  function close() {
    overlay.remove();
    onClose?.();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  renderQuestion();
}

/** Compare-two-objects panel */
export function createComparePanel(objects, container) {
  const panel = document.createElement('div');
  panel.className = 'compare-panel learn-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <h3>Compare Sizes 比較大小</h3>
    <label>Object A</label>
    <select id="compare-a"></select>
    <label>Object B</label>
    <select id="compare-b"></select>
    <div class="compare-result" id="compare-result"></div>
  `;
  container.appendChild(panel);

  const selA = panel.querySelector('#compare-a');
  const selB = panel.querySelector('#compare-b');
  const result = panel.querySelector('#compare-result');

  objects.forEach((o) => {
    selA.innerHTML += `<option value="${o.index}">${o.name} (${o.nameZh})</option>`;
    selB.innerHTML += `<option value="${o.index}">${o.name} (${o.nameZh})</option>`;
  });
  selB.value = String(objects.find((o) => o.name === 'Earth')?.index ?? 20);

  function update() {
    const a = objects[Number(selA.value)];
    const b = objects[Number(selB.value)];
    const ratio = a.rad / b.rad;
    const wider = ratio >= 1 ? a : b;
    const narrower = ratio >= 1 ? b : a;
    const r = Math.max(ratio, 1 / ratio);
    result.innerHTML = `
      <strong>${wider.name}</strong> (${wider.nameZh}) is about
      <strong>${r < 10 ? r.toFixed(1) : Math.round(r)}×</strong> wider than
      <strong>${narrower.name}</strong> (${narrower.nameZh}).
    `;
  }

  selA.addEventListener('change', update);
  selB.addEventListener('change', update);
  update();

  return {
    show: () => { panel.style.display = 'block'; },
    hide: () => { panel.style.display = 'none'; },
    toggle: () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; },
  };
}

/** Chapter minimap */
export function createMinimap(chapters, container, { onChapterClick } = {}) {
  const el = document.createElement('div');
  el.className = 'minimap';
  el.innerHTML = chapters.map((c) => `
    <div class="minimap-chapter" data-id="${c.id}" data-start="${c.startIndex}" title="${c.title}">
      <span class="minimap-dot"></span>
      <span class="minimap-label">${c.title}</span>
    </div>
  `).join('');
  container.appendChild(el);

  return {
    setActive(index) {
      const chapter = chapters.find((c) => index >= c.startIndex && index <= c.endIndex);
      el.querySelectorAll('.minimap-chapter').forEach((node) => {
        node.classList.toggle('active', node.dataset.id === chapter?.id);
      });
    },
    setVisited(visitedIndices) {
      el.querySelectorAll('.minimap-chapter').forEach((node) => {
        const start = Number(node.dataset.start);
        const ch = chapters.find((c) => c.id === node.dataset.id);
        const hasVisit = visitedIndices.some((i) => i >= ch.startIndex && i <= ch.endIndex);
        node.classList.toggle('visited', hasVisit);
      });
    },
  };
}
