import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.mjs';

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.45 },
    { name: 'nameZh', weight: 0.35 },
    { name: 'type', weight: 0.2 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
};

export function createObjectFuse(objects) {
  return new Fuse(objects, FUSE_OPTIONS);
}

function resultLabel(obj) {
  return `${obj.name} · ${obj.nameZh}`;
}

/** Top search bar — jump to object in tour */
export function createObjectSearchBar(objects, container, { onSelect, placeholder }) {
  const fuse = createObjectFuse(objects);
  const wrap = document.createElement('div');
  wrap.className = 'object-search';
  wrap.innerHTML = `
    <div class="search-input-wrap">
      <span class="search-icon" aria-hidden="true">🔍</span>
      <input type="search" class="search-input" autocomplete="off"
        placeholder="${placeholder || 'Search objects 搜尋天體…'}" aria-label="Search objects">
      <button type="button" class="search-clear" hidden aria-label="Clear">×</button>
    </div>
    <ul class="search-results" hidden></ul>
  `;
  container.appendChild(wrap);

  const input = wrap.querySelector('.search-input');
  const results = wrap.querySelector('.search-results');
  const clearBtn = wrap.querySelector('.search-clear');
  let activeIndex = -1;

  function hideResults() {
    results.hidden = true;
    activeIndex = -1;
  }

  function showResults(items) {
    if (!items.length) {
      results.innerHTML = '<li class="search-empty">No matches 找不到</li>';
      results.hidden = false;
      return;
    }
    results.innerHTML = items.map((obj, i) => `
      <li class="search-result-item" data-index="${obj.index}" data-pos="${i}">
        <span class="result-en">${obj.name}</span>
        <span class="result-zh">${obj.nameZh}</span>
      </li>
    `).join('');
    results.hidden = false;
    activeIndex = 0;
    highlightActive();
  }

  function highlightActive() {
    results.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.classList.toggle('active', i === activeIndex);
    });
  }

  function pick(item) {
    if (!item) return;
    input.value = resultLabel(item);
    clearBtn.hidden = false;
    hideResults();
    onSelect(item);
  }

  function runSearch() {
    const q = input.value.trim();
    clearBtn.hidden = !q;
    if (q.length < 1) {
      hideResults();
      return;
    }
    const hits = fuse.search(q, { limit: 8 }).map((r) => r.item);
    showResults(hits);
  }

  input.addEventListener('input', runSearch);
  input.addEventListener('focus', () => { if (input.value.trim()) runSearch(); });

  input.addEventListener('keydown', (e) => {
    const items = [...results.querySelectorAll('.search-result-item')];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.hidden && input.value.trim()) runSearch();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      highlightActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlightActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const el = items[activeIndex];
      if (el) {
        const obj = objects[Number(el.dataset.index)];
        pick(obj);
      }
    } else if (e.key === 'Escape') {
      hideResults();
      input.blur();
    }
  });

  results.addEventListener('click', (e) => {
    const el = e.target.closest('.search-result-item');
    if (!el) return;
    pick(objects[Number(el.dataset.index)]);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    hideResults();
    input.focus();
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) hideResults();
  });

  return {
    setValue(obj) {
      if (obj) input.value = resultLabel(obj);
    },
    hide: hideResults,
  };
}

/** Fuzzy combobox for compare panel */
export function createFuzzySelect(objects, { label, defaultIndex = 0, onChange }) {
  const fuse = createObjectFuse(objects);
  const id = `fuzzy-${Math.random().toString(36).slice(2, 9)}`;
  const wrap = document.createElement('div');
  wrap.className = 'fuzzy-select';
  wrap.innerHTML = `
    <label for="${id}">${label}</label>
    <div class="fuzzy-input-wrap">
      <input type="text" id="${id}" class="fuzzy-input" autocomplete="off" aria-label="${label}">
      <ul class="fuzzy-results" hidden></ul>
    </div>
  `;

  const input = wrap.querySelector('.fuzzy-input');
  const results = wrap.querySelector('.fuzzy-results');
  let selected = objects[defaultIndex] ?? objects[0];

  function setSelected(obj, { notify = true } = {}) {
    selected = obj;
    input.value = resultLabel(obj);
    results.hidden = true;
    if (notify) onChange?.(obj);
  }

  function showResults(items) {
    if (!items.length) {
      results.innerHTML = '<li class="fuzzy-empty">No matches</li>';
      results.hidden = false;
      return;
    }
    results.innerHTML = items.map((obj) => `
      <li class="fuzzy-result-item" data-index="${obj.index}">
        <span>${obj.name}</span>
        <span class="fuzzy-zh">${obj.nameZh}</span>
      </li>
    `).join('');
    results.hidden = false;
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { results.hidden = true; return; }
    showResults(fuse.search(q, { limit: 6 }).map((r) => r.item));
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) {
      showResults(fuse.search(input.value.trim(), { limit: 6 }).map((r) => r.item));
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = results.querySelector('.fuzzy-result-item');
      if (first) setSelected(objects[Number(first.dataset.index)]);
    }
    if (e.key === 'Escape') results.hidden = true;
  });

  results.addEventListener('click', (e) => {
    const el = e.target.closest('.fuzzy-result-item');
    if (!el) return;
    setSelected(objects[Number(el.dataset.index)]);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) results.hidden = true;
  });

  setSelected(selected, { notify: false });

  return {
    getValue: () => selected,
    setValue: (obj) => setSelected(obj),
    element: wrap,
  };
}
