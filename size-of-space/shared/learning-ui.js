import { QUIZ_BANK, gradeQuiz, quizForChapter } from './quiz-data.js';
import { saveQuizAnswers, exportProgressForTeacher, downloadJson } from './progress.js';
import { createFuzzySelect } from './fuzzy-search.js';

const FULL_QUIZ_TITLE = 'Full Self-Quiz 完整測驗';

function bindSwipeToClose(container, onClose) {
  if (window.matchMedia('(min-width: 601px)').matches) return;

  let startY = 0;
  let dragging = false;

  container.addEventListener('touchstart', (e) => {
    if (!container.classList.contains('open')) return;
    const handle = e.target.closest('.quiz-sidebar-handle, .quiz-sidebar-header');
    if (!handle) return;
    startY = e.touches[0].clientY;
    dragging = true;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const dy = Math.max(0, e.touches[0].clientY - startY);
    container.style.setProperty('--quiz-drag-offset', `${dy}px`);
  }, { passive: true });

  const endDrag = (clientY) => {
    if (!dragging) return;
    dragging = false;
    const dy = Math.max(0, clientY - startY);
    container.style.removeProperty('--quiz-drag-offset');
    if (dy > 72) onClose();
  };

  container.addEventListener('touchend', (e) => {
    endDrag(e.changedTouches[0].clientY);
  }, { passive: true });

  container.addEventListener('touchcancel', () => {
    dragging = false;
    container.style.removeProperty('--quiz-drag-offset');
  }, { passive: true });
}

function mountQuizUI({ container, chapterId, graded, title, onClose }) {
  const questions = chapterId ? quizForChapter(chapterId) : QUIZ_BANK;
  const globalIndices = chapterId
    ? QUIZ_BANK.map((q, i) => (q.chapterId === chapterId ? i : -1)).filter((i) => i >= 0)
    : QUIZ_BANK.map((_, i) => i);

  const answers = new Array(QUIZ_BANK.length).fill(-1);
  let current = 0;
  const heading = title || (chapterId ? 'Chapter Quiz 章節測驗' : FULL_QUIZ_TITLE);
  const isSidebar = container.classList.contains('quiz-sidebar');

  const root = document.createElement('div');
  root.className = 'quiz-sidebar-inner';
  root.innerHTML = `
    ${isSidebar ? '<div class="quiz-sidebar-handle" aria-hidden="true"><span></span></div>' : ''}
    <div class="quiz-sidebar-header">
      <h2>${heading}</h2>
      <button type="button" class="quiz-sidebar-close" aria-label="Hide quiz panel">×</button>
    </div>
    <p class="quiz-meta">${graded ? 'Graded — export when done 完成後可匯出' : 'Practice while viewing the tour 邊看邊答，可隨時收起'}</p>
    <div id="quiz-body"></div>
    <div class="quiz-actions" id="quiz-actions"></div>
  `;
  container.appendChild(root);

  const body = root.querySelector('#quiz-body');
  const actions = root.querySelector('#quiz-actions');

  function close() {
    onClose?.();
  }

  root.querySelector('.quiz-sidebar-close').addEventListener('click', close);

  function renderQuestion() {
    const q = questions[current];
    const globalIdx = globalIndices[current];
    body.innerHTML = `
      <div class="quiz-question">
        <p><strong>Q${current + 1}/${questions.length}.</strong> ${q.question}</p>
        <div class="quiz-options">
          ${q.options.map((opt, i) => `
            <label class="quiz-option ${answers[globalIdx] === i ? 'selected' : ''}" data-idx="${i}">
              <input type="radio" name="q" value="${i}" hidden>
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
      ${current > 0 ? '<button class="btn-secondary" id="quiz-prev">Prev</button>' : ''}
      ${current < questions.length - 1
        ? '<button class="btn-primary" id="quiz-next">Next</button>'
        : '<button class="btn-primary" id="quiz-submit">Results</button>'}
    `;

    root.querySelector('#quiz-prev')?.addEventListener('click', () => { current -= 1; renderQuestion(); });
    root.querySelector('#quiz-next')?.addEventListener('click', () => { current += 1; renderQuestion(); });
    root.querySelector('#quiz-submit')?.addEventListener('click', () => renderResults());
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
        <div class="export-form" style="margin-top:16px">
          <label>Name 姓名</label>
          <input type="text" id="export-name" placeholder="Your name">
          <label>Student ID 學號</label>
          <input type="text" id="export-id" placeholder="Student ID">
          <label>Assignment Code</label>
          <input type="text" id="export-code" value="CCC1021-SCALE-01">
        </div>
      ` : ''}
    `;

    actions.innerHTML = `
      ${graded ? '<button class="btn-primary" id="quiz-export">Export</button>' : ''}
      <button class="btn-secondary" id="quiz-done">Done</button>
    `;

    root.querySelector('#quiz-export')?.addEventListener('click', () => {
      const name = root.querySelector('#export-name')?.value?.trim();
      const id = root.querySelector('#export-id')?.value?.trim();
      if (!name || !id) {
        alert('Please enter your name and student ID.');
        return;
      }
      const data = exportProgressForTeacher({
        studentName: name,
        studentId: id,
        assignmentCode: root.querySelector('#export-code')?.value?.trim() || 'CCC1021-SCALE-01',
      });
      data.quizScore = { correct: subsetCorrect, total: subsetTotal, percent };
      data.quizResults = gradedSubset.results.filter((_, i) => globalIndices.includes(i));
      downloadJson(`CCC1021-${id}-quiz.json`, data);
    });
    root.querySelector('#quiz-done')?.addEventListener('click', close);
  }

  renderQuestion();
  return { close };
}

/** Quiz sidebar — keeps 3D tour visible for cross-reference */
export function createQuizSidebar(container) {
  let activeClose = null;

  function closePanel(opts = {}) {
    container.classList.remove('open');
    container.style.removeProperty('--quiz-drag-offset');
    container.innerHTML = '';
    activeClose = null;
    opts.onClose?.();
  }

  bindSwipeToClose(container, () => activeClose?.());

  return {
    open(opts = {}) {
      container.innerHTML = '';
      container.classList.add('open');
      const ui = mountQuizUI({
        container,
        title: opts.title ?? FULL_QUIZ_TITLE,
        ...opts,
        onClose: () => closePanel(opts),
      });
      activeClose = ui.close;
      return ui;
    },
    close(opts = {}) {
      closePanel(opts);
    },
    toggle(opts = {}) {
      if (container.classList.contains('open')) {
        this.close(opts);
        return false;
      }
      this.open(opts);
      return true;
    },
    isOpen: () => container.classList.contains('open'),
  };
}

/** Full-screen overlay quiz (hub / dialogs) */
export function showQuizOverlay({ chapterId = null, graded = false, onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'quiz-overlay';
  const card = document.createElement('div');
  card.className = 'quiz-card';
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const ui = mountQuizUI({
    container: card,
    chapterId,
    graded,
    onClose: () => {
      overlay.remove();
      onClose?.();
    },
  });

  card.querySelector('.quiz-sidebar-close')?.addEventListener('click', () => {
    ui.close();
    overlay.remove();
    onClose?.();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onClose?.();
    }
  });
}

/** Compare panel with Fuse.js fuzzy search */
export function createComparePanel(objects, container) {
  const panel = document.createElement('div');
  panel.className = 'compare-panel learn-panel';
  panel.style.display = 'none';
  panel.innerHTML = `
    <h3>Compare Sizes 比較大小</h3>
    <div id="compare-a-host"></div>
    <div id="compare-b-host"></div>
    <div class="compare-result" id="compare-result"></div>
  `;
  container.appendChild(panel);

  const result = panel.querySelector('#compare-result');
  const earthIdx = objects.find((o) => o.name === 'Earth')?.index ?? 20;

  const selectA = createFuzzySelect(objects, {
    label: 'Object A 天體 A',
    defaultIndex: 0,
    onChange: update,
  });
  const selectB = createFuzzySelect(objects, {
    label: 'Object B 天體 B',
    defaultIndex: earthIdx,
    onChange: update,
  });

  panel.querySelector('#compare-a-host').appendChild(selectA.element);
  panel.querySelector('#compare-b-host').appendChild(selectB.element);

  function update() {
    const a = selectA.getValue();
    const b = selectB.getValue();
    if (!a || !b) return;
    const ratio = a.rad / b.rad;
    const wider = ratio >= 1 ? a : b;
    const narrower = ratio >= 1 ? b : a;
    const r = Math.max(ratio, 1 / ratio);
    const display = r < 10 ? r.toFixed(2) : r.toLocaleString('en-US', { maximumFractionDigits: 2 });
    result.innerHTML = `
      <strong>${wider.name}</strong>（${wider.nameZh}）is about
      <strong>${display}×</strong> wider than
      <strong>${narrower.name}</strong>（${narrower.nameZh}）.
    `;
  }

  update();

  return {
    show: () => { panel.style.display = 'block'; },
    hide: () => { panel.style.display = 'none'; },
    toggle: () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; },
  };
}

/** Chapter minimap */
export function createMinimap(chapters, container) {
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
        const ch = chapters.find((c) => c.id === node.dataset.id);
        const hasVisit = visitedIndices.some((i) => i >= ch.startIndex && i <= ch.endIndex);
        node.classList.toggle('visited', hasVisit);
      });
    },
  };
}
