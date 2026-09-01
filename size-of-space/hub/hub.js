import { CHAPTERS, chapterProgress } from '../shared/chapters.js';
import { loadProgress, saveReflection, exportProgressForTeacher, downloadJson } from '../shared/progress.js';
import { showQuizOverlay } from '../shared/learning-ui.js';
import { ENRICHED_OBJECTS } from '../shared/objects-enriched.js';

const grid = document.getElementById('chapter-grid');

function renderChapters() {
  const progress = loadProgress();
  grid.innerHTML = CHAPTERS.map((ch) => {
    const pct = chapterProgress(progress.visited, ch);
    const objectNames = ENRICHED_OBJECTS
      .filter((o) => o.index >= ch.startIndex && o.index <= ch.endIndex)
      .slice(0, 4)
      .map((o) => o.name)
      .join(', ');

    return `
      <article class="chapter-card" data-id="${ch.id}">
        <h3>${ch.title}</h3>
        <div class="chapter-zh">${ch.titleZh}</div>
        <p class="objective"><strong>Objective:</strong> ${ch.objective}</p>
        <div class="chapter-progress-bar"><div class="chapter-progress-fill" style="width:${pct}%"></div></div>
        <p style="font-size:13px;opacity:0.6;margin-bottom:12px">${pct}% explored · Objects: ${objectNames}…</p>
        <div class="recap-card"><strong>Key takeaway</strong>${ch.takeaway}</div>
        <label style="display:block;margin-top:14px;font-size:13px;opacity:0.75">Reflection 反思 (saved locally)</label>
        <textarea class="reflection-input" data-chapter="${ch.id}" placeholder="What surprised you in this chapter?">${progress.reflections[ch.id] || ''}</textarea>
        <div class="chapter-actions" style="margin-top:14px">
          <a class="btn-tour" href="../tour/?chapter=${ch.id}">Start Mission 開始任務</a>
          <button class="btn-quiz" data-quiz="${ch.id}">Chapter Quiz 章節測驗</button>
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.reflection-input').forEach((ta) => {
    ta.addEventListener('change', () => saveReflection(ta.dataset.chapter, ta.value));
    ta.addEventListener('blur', () => saveReflection(ta.dataset.chapter, ta.value));
  });

  grid.querySelectorAll('[data-quiz]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showQuizOverlay({ chapterId: btn.dataset.quiz, graded: false, onClose: renderChapters });
    });
  });
}

document.getElementById('btn-full-quiz').addEventListener('click', () => {
  showQuizOverlay({ graded: false, onClose: renderChapters });
});

document.getElementById('btn-graded-export').addEventListener('click', () => {
  const overlay = document.createElement('div');
  overlay.className = 'quiz-overlay';
  overlay.innerHTML = `
    <div class="quiz-card">
      <h2>Graded Assignment Export</h2>
      <p class="quiz-meta">Complete the full quiz first, then export your results for your instructor.</p>
      <div class="export-form">
        <label>Student Name</label>
        <input type="text" id="export-name" placeholder="Your name">
        <label>Student ID</label>
        <input type="text" id="export-id" placeholder="Student ID">
        <label>Assignment Code</label>
        <input type="text" id="export-code" value="CCC1021-SCALE-01">
      </div>
      <div class="quiz-actions">
        <button class="btn-primary" id="start-graded">Take Graded Quiz & Export</button>
        <button class="btn-secondary" id="export-only">Export Progress Only</button>
        <button class="btn-secondary" id="close-graded">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#start-graded').addEventListener('click', () => {
    overlay.remove();
    showQuizOverlay({ graded: true, onClose: renderChapters });
  });

  overlay.querySelector('#export-only').addEventListener('click', () => {
    const name = overlay.querySelector('#export-name').value.trim();
    const id = overlay.querySelector('#export-id').value.trim();
    if (!name || !id) { alert('Please enter name and student ID.'); return; }
    const data = exportProgressForTeacher({
      studentName: name,
      studentId: id,
      assignmentCode: overlay.querySelector('#export-code').value.trim(),
    });
    downloadJson(`CCC1021-${id}-hub.json`, data);
    overlay.remove();
  });

  overlay.querySelector('#close-graded').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
});

renderChapters();
