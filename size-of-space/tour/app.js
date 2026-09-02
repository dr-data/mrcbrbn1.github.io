import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { lyToKm, formatDiameter } from '../format-size.js';
import { textureBasePath, stickerBasePath } from '../shared/paths.js';
import { ENRICHED_OBJECTS } from '../shared/objects-enriched.js';
import { CHAPTERS } from '../shared/chapters.js';
import { compareToText, volumeFitLabel } from '../shared/compare.js';
import { markVisited, loadProgress, exportProgressForTeacher, downloadJson } from '../shared/progress.js';
import { createComparePanel, createMinimap, createQuizSidebar } from '../shared/learning-ui.js';
import { createObjectSearchBar } from '../shared/fuzzy-search.js';
import { humanRatioLabel, earthRatioLabel } from '../shared/size-ratios.js';

const SATURN_BODY_RADIUS = 60268;
const SATURN_RING_INNER = 76268;
const SATURN_RING_OUTER = 120268;
const SATURN_CAMERA_RADIUS = 58232;

const isMobile = window.innerWidth < 600;
const isSmallScreen = window.innerWidth <= 380;
const objectGap = isMobile ? 5 : 2;
const textureBase = isSmallScreen ? textureBasePath(true) : textureBasePath(false);
const stickerBase = stickerBasePath();

const state = {
  firstPage: true,
  lastPage: false,
  currentIndex: 0,
  pauseInput: false,
  activeTween: null,
  tweenIndex: -1,
  learnPanelOpen: true,
  sizeDisplayMode: 'default',
};

const els = {
  container: document.getElementById('container'),
  titlePage: document.getElementById('title-page'),
  endPage: document.getElementById('end-page'),
  itemDescription: document.getElementById('item-description'),
  itemTitle: document.getElementById('item-title'),
  itemType: document.getElementById('item-type'),
  itemSize: document.getElementById('item-size'),
  titleCanvas: document.getElementById('title-canvas'),
  endCanvas: document.getElementById('end-canvas'),
  learnPanel: document.getElementById('learn-panel'),
  tourToolbar: document.getElementById('tour-toolbar'),
  minimapHost: document.getElementById('minimap-host'),
  compareHost: document.getElementById('compare-host'),
  searchHost: document.getElementById('search-host'),
  quizSidebar: document.getElementById('quiz-sidebar'),
  quizTab: document.getElementById('quiz-tab'),
  sizeToggles: document.getElementById('size-toggles'),
};

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1e16);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  precision: 'highp',
  powerPreference: 'high-performance',
  logarithmicDepthBuffer: false,
});

let polygonOffset = -0.1;
const objects = ENRICHED_OBJECTS.map((entry) => ({ ...entry }));

const earthObj = objects.find((o) => o.name === 'Earth');
const minimap = createMinimap(CHAPTERS, els.minimapHost, {
  onJump: (index) => navigateToIndex(index),
});
const comparePanel = createComparePanel(objects, els.compareHost);
const quizSidebar = createQuizSidebar(els.quizSidebar);
let objectSearch = null;

function syncQuizChrome(open) {
  document.getElementById('btn-quiz')?.classList.toggle('active', open);
  document.getElementById('btn-quiz')?.setAttribute('aria-expanded', String(open));
  els.quizTab?.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('quiz-open', open);
}

function setQuizPanelOpen(open, opts = {}) {
  if (open && quizSidebar.isOpen()) return;
  if (!open && !quizSidebar.isOpen()) {
    syncQuizChrome(false);
    updateQuizTabVisibility();
    return;
  }

  if (open) {
    quizSidebar.open({
      graded: false,
      ...opts,
      onClose: () => {
        syncQuizChrome(false);
        updateQuizTabVisibility();
        updateUI();
        opts.onClose?.();
      },
    });
    syncQuizChrome(true);
  } else {
    quizSidebar.close({
      onClose: () => {
        syncQuizChrome(false);
        updateQuizTabVisibility();
        updateUI();
        opts.onClose?.();
      },
    });
  }
  updateQuizTabVisibility();
}

function updateQuizTabVisibility() {
  const inTour = !state.firstPage && !state.lastPage && state.currentIndex > 0 && state.currentIndex < objects.length - 1;
  const showTab = inTour && !quizSidebar.isOpen();
  if (els.quizTab) {
    els.quizTab.hidden = !showTab;
  }
}

function toggleQuizPanel() {
  setQuizPanelOpen(!quizSidebar.isOpen());
}

function textureUrl(name) {
  return `${textureBase}/${name}.jpg`;
}

function loadTexture(path) {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(path);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function addSphere(obj, x, parent) {
  const map = loadTexture(textureUrl(obj.texture));
  const geometry = new THREE.SphereGeometry(obj.rad, 36, 36);
  const material = new THREE.MeshBasicMaterial({ map });
  material.polygonOffset = true;
  material.polygonOffsetFactor = polygonOffset;
  polygonOffset -= 0.1;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, obj.rad, 0);
  mesh.frustumCulled = false;
  obj.mesh = mesh;
  parent.add(mesh);

  const shadowMap = loadTexture(textureUrl(obj.texture));
  shadowMap.wrapS = THREE.RepeatWrapping;
  shadowMap.flipY = false;

  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: 0.2 });
  const shadow = new THREE.Mesh(geometry, shadowMat);
  shadow.position.set(x, -obj.rad, 0);
  shadow.frustumCulled = false;
  obj.shadow = shadow;
  parent.add(shadow);
}

function addBlackHole(obj, x, parent) {
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(obj.rad - obj.rad / 20, obj.rad, 50),
    new THREE.MeshBasicMaterial({ color: '#fc2c03', side: THREE.DoubleSide })
  );
  outer.position.set(x, obj.rad, 0);
  outer.frustumCulled = false;
  outer.matrixAutoUpdate = false;
  outer.updateMatrix();

  const inner = new THREE.Mesh(
    new THREE.RingGeometry(0, obj.rad - obj.rad / 20, 30),
    new THREE.MeshBasicMaterial({ color: 'black', side: THREE.DoubleSide })
  );
  inner.position.set(x, obj.rad, 0);
  inner.frustumCulled = false;
  inner.matrixAutoUpdate = false;
  inner.updateMatrix();

  parent.add(outer);
  parent.add(inner);

  const shadowOuter = outer.clone();
  shadowOuter.material = outer.material.clone();
  shadowOuter.material.transparent = true;
  shadowOuter.material.opacity = 0.2;
  shadowOuter.position.set(x, -obj.rad, 0);

  const shadowInner = inner.clone();
  shadowInner.position.set(x, -obj.rad, 0);

  parent.add(shadowOuter);
  parent.add(shadowInner);

  obj.mesh = outer;
  obj.shadow = shadowOuter;
}

function addSaturn(obj, x, parent) {
  const map = loadTexture(textureUrl(obj.texture));
  const bodyGeo = new THREE.SphereGeometry(SATURN_BODY_RADIUS, 36, 36);
  const bodyMat = new THREE.MeshBasicMaterial({ map });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(x, SATURN_BODY_RADIUS, 0);
  body.frustumCulled = false;

  const ringMap = loadTexture(`${textureBasePath()}/saturn-ring2.jpg`);
  ringMap.minFilter = THREE.LinearFilter;
  const ringGeo = new THREE.RingGeometry(SATURN_RING_INNER, SATURN_RING_OUTER, 50);
  const ringMat = new THREE.MeshBasicMaterial({ map: ringMap, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
  const rings = new THREE.Mesh(ringGeo, ringMat);
  rings.position.set(x, SATURN_BODY_RADIUS, 0);
  rings.rotation.x = Math.PI / 1.8;
  rings.frustumCulled = false;

  parent.add(body);
  parent.add(rings);
  obj.mesh = body;

  const shadowMap = loadTexture(textureUrl(obj.texture));
  shadowMap.wrapS = THREE.RepeatWrapping;
  shadowMap.flipY = false;
  const shadowBody = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: 0.2 }));
  shadowBody.position.set(x, -SATURN_BODY_RADIUS, 0);
  shadowBody.frustumCulled = false;

  const shadowRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringMap, transparent: true, opacity: 0.2 }));
  shadowRing.position.set(x, -SATURN_BODY_RADIUS, 0);
  shadowRing.rotation.x = -Math.PI / 1.7;
  shadowRing.frustumCulled = false;

  parent.add(shadowBody);
  parent.add(shadowRing);
  obj.shadow = shadowBody;
}

function addGalaxy(obj, x, parent) {
  const map = loadTexture(textureUrl(obj.texture));
  const geometry = new THREE.PlaneGeometry(obj.rad * 2, obj.rad * 2, 12);
  const material = new THREE.MeshBasicMaterial({ map });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, obj.rad, 0);
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  obj.mesh = mesh;

  const shadowMap = loadTexture(textureUrl(obj.texture));
  shadowMap.wrapS = THREE.RepeatWrapping;
  shadowMap.flipY = false;
  shadowMap.flipX = false;
  const shadow = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, opacity: 0.2 })
  );
  shadow.position.set(x, -obj.rad, 0);
  shadow.frustumCulled = false;
  shadow.matrixAutoUpdate = false;
  shadow.updateMatrix();

  parent.add(mesh);
  parent.add(shadow);
  obj.shadow = shadow;
}

function layoutObjects() {
  let offset = 0;
  objects.forEach((obj, index) => {
    obj.index = index;
    const x = offset + obj.rad;

    if (obj.render === 'sphere') addSphere(obj, x, scene);
    else if (obj.render === 'blackhole') addBlackHole(obj, x, scene);
    else if (obj.render === 'saturn') addSaturn(obj, x, scene);
    else if (obj.render === 'galaxy') addGalaxy(obj, x, scene);

    obj.x = x;
    offset += 2 * obj.rad + obj.rad / objectGap;
  });

  const last = objects[objects.length - 1];
  if (last.mesh) last.mesh.visible = false;
  if (last.shadow) last.shadow.visible = false;
}

function tweenTo(target, duration = 600) {
  const effectiveRad = target.render === 'saturn' ? SATURN_CAMERA_RADIUS : target.rad;
  const zScale = isMobile ? 5 : 4;

  const from = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  const to = { x: target.x, y: effectiveRad, z: effectiveRad * zScale };

  camera.near = from.z / 100;
  camera.far = from.z * 1e7;
  camera.updateProjectionMatrix();

  if (state.activeTween) state.activeTween.stop();

  state.activeTween = new TWEEN.Tween(from)
    .to(to, duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      camera.position.set(from.x, from.y, from.z);
    })
    .onComplete(() => {
      state.activeTween = null;
      state.tweenIndex = target.index;
    })
    .start();
}

function formatSizeLine(obj) {
  if (state.sizeDisplayMode === 'human') return humanRatioLabel(obj.rad, obj.name);
  if (state.sizeDisplayMode === 'earth') return earthRatioLabel(obj.rad, obj.name);
  return `${formatDiameter(obj.rad)} diameter`;
}

function navigateToIndex(index) {
  if (index < 0 || index >= objects.length) return;
  if (state.firstPage) {
    state.firstPage = false;
    state.pauseInput = true;
    setTimeout(() => { state.pauseInput = false; }, 800);
  }
  if (state.lastPage) state.lastPage = false;
  state.currentIndex = index;
  tweenTo(objects[index], transitionTime(state.tweenIndex, index));
  if (index > objects.length - 2) {
    const last = objects[objects.length - 1];
    if (last.mesh) last.mesh.visible = true;
    if (last.shadow) last.shadow.visible = true;
  }
  updateUI();
}

function updateLearnPanel(obj) {
  if (!obj || !state.learnPanelOpen) {
    els.learnPanel.style.display = 'none';
    return;
  }

  const compare = compareToText(obj, objects);
  const volume = earthObj && obj.name !== 'Earth' ? volumeFitLabel(obj, earthObj) : null;

  els.learnPanel.innerHTML = `
    <h3>${obj.chapter?.title || 'Cosmos'} · ${obj.chapter?.titleZh || ''}</h3>
    <div class="name-zh">${obj.nameZh}</div>
    <div class="fact">${obj.fact}</div>
    ${compare ? `<div class="compare-line">📏 ${compare}</div>` : ''}
    ${volume ? `<div class="volume-line">🔵 ${volume}</div>` : ''}
    ${obj.misconception ? `<div class="misconception"><strong>Common misconception</strong>${obj.misconception}</div>` : ''}
  `;
  els.learnPanel.style.display = 'block';
}

function updateUI() {
  const onTitle = state.firstPage && state.currentIndex === 0;
  const onEnd = state.lastPage || state.currentIndex >= objects.length - 1;
  const inTour = !state.firstPage && !state.lastPage && state.currentIndex > 0 && state.currentIndex < objects.length - 1;

  els.titlePage.style.left = state.firstPage ? '0' : '-100%';
  els.endPage.style.left = state.lastPage ? '0' : '100%';
  els.endPage.style.display = onEnd && !state.firstPage ? 'block' : 'none';
  els.itemDescription.style.display = inTour ? 'block' : 'none';
  els.tourToolbar.style.display = inTour ? 'flex' : 'none';
  els.searchHost.style.display = inTour ? 'block' : 'none';
  updateQuizTabVisibility();

  if (inTour) {
    const obj = objects[state.currentIndex];
    els.itemTitle.innerHTML = `${obj.name}<div class="item-name-zh">${obj.nameZh}</div>`;
    els.itemType.textContent = obj.type;
    els.itemSize.textContent = formatSizeLine(obj);
    objectSearch?.setValue(obj);
    markVisited(state.currentIndex);
    minimap.setActive(state.currentIndex);
    minimap.setVisited(loadProgress().visited);
    updateLearnPanel(obj);
  } else {
    els.learnPanel.style.display = 'none';
  }
}

function transitionTime(fromIndex, toIndex) {
  return Math.min(15 * (Math.abs(state.tweenIndex - toIndex) - 1) + 560, 650);
}

function goNext() {
  if (state.pauseInput) return;

  if (state.lastPage) return;

  if (state.currentIndex === objects.length - 1 && !state.lastPage) {
    state.lastPage = true;
    const universe = {
      x: 10 * lyToKm(46508e6),
      y: 0,
      z: 0,
      rad: lyToKm(46508e6),
      index: objects.length - 1,
      render: 'galaxy',
    };
    tweenTo(universe, 1000);
    updateUI();
    return;
  }

  if (state.firstPage) {
    state.firstPage = false;
    state.pauseInput = true;
    state.currentIndex = 0;
    tweenTo(objects[0], 1500);
    setTimeout(() => {
      state.pauseInput = false;
      state.currentIndex = 0;
      updateUI();
    }, 1500);
    updateUI();
    return;
  }

  if (state.currentIndex < objects.length - 1) {
    const next = state.currentIndex + 1;
    tweenTo(objects[next], transitionTime(state.currentIndex, next));
    state.currentIndex = next;
    if (next > objects.length - 2) {
      const last = objects[objects.length - 1];
      if (last.mesh) last.mesh.visible = true;
      if (last.shadow) last.shadow.visible = true;
    }
    updateUI();
  }
}

function goPrev() {
  if (state.pauseInput) return;

  if (state.lastPage) {
    state.lastPage = false;
    state.pauseInput = true;
    tweenTo(objects[objects.length - 1], 1500);
    setTimeout(() => {
      state.pauseInput = false;
    }, 1500);
    updateUI();
    return;
  }

  if (state.currentIndex === 0 && !state.firstPage) {
    state.firstPage = true;
    tweenTo({ x: -0.05, y: 0, z: 0, rad: 0.01, index: -1, render: 'sphere' });
    updateUI();
    return;
  }

  if (state.currentIndex > 0) {
    const prev = state.currentIndex - 1;
    tweenTo(objects[prev], transitionTime(state.currentIndex, prev));
    state.currentIndex = prev;
    if (prev < objects.length - 3) {
      const last = objects[objects.length - 1];
      if (last.mesh) last.mesh.visible = false;
      if (last.shadow) last.shadow.visible = false;
    }
    updateUI();
  }
}

function renderTitleCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = window.innerWidth);
  const h = (canvas.height = window.innerHeight);

  const stickers = [
    { src: `${stickerBase}/jupiter.png`, x: (3 * w) / 4, y: h / 7, size: 30 },
    { src: `${stickerBase}/earth.png`, x: w / 5, y: h / 5, size: 80 },
    { src: `${stickerBase}/saturn.png`, x: (3 * w) / 6, y: (4 * h) / 5, size: 100 },
  ];

  stickers.forEach(({ src, x, y, size }) => {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, 256, 256, x, y, size, size);
    img.src = src;
  });

  ctx.shadowBlur = 10;
  ctx.shadowColor = 'white';

  const step = w < 500 ? 30 : 70;
  const margin = w < 500 ? 70 : 120;
  const maxDot = w < 500 ? 4 : 7;

  for (let x = 0; x < w; x += step) {
    for (let y = 0; y < h; y += step) {
      if (w - x < 10) continue;
      if (w - x < margin) {
        if (Math.random() < 0.6) continue;
      } else if (Math.random() < 0.3) continue;

      const px = x + (50 * Math.random() - 25);
      const py = y + (50 * Math.random() - 25);
      const fade = px < window.innerWidth ? 1 : (w - px) / (w - window.innerWidth);

      if (Math.random() < 0.2) ctx.fillStyle = `rgba(116, 185, 255, ${fade})`;
      else if (Math.random() < 0.2) ctx.fillStyle = `rgba(255, 107, 129, ${fade})`;
      else ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;

      ctx.beginPath();
      ctx.arc(px, py, Math.random() * maxDot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function showExportDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'quiz-overlay';
  overlay.innerHTML = `
    <div class="quiz-card">
      <h2>Export Assignment 匯出作業</h2>
      <p class="quiz-meta">Download your progress as JSON for your instructor</p>
      <div class="export-form">
        <label>Student Name 姓名</label>
        <input type="text" id="export-name" placeholder="Your name">
        <label>Student ID 學號</label>
        <input type="text" id="export-id" placeholder="Student ID">
        <label>Assignment Code 作業代碼</label>
        <input type="text" id="export-code" value="CCC1021-SCALE-01">
      </div>
      <div class="quiz-actions">
        <button class="btn-primary" id="do-export">Download JSON</button>
        <button class="btn-secondary" id="close-export">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#do-export').addEventListener('click', () => {
    const name = overlay.querySelector('#export-name').value.trim();
    const id = overlay.querySelector('#export-id').value.trim();
    if (!name || !id) {
      alert('Please enter your name and student ID.');
      return;
    }
    const data = exportProgressForTeacher({
      studentName: name,
      studentId: id,
      assignmentCode: overlay.querySelector('#export-code').value.trim() || 'CCC1021-SCALE-01',
    });
    downloadJson(`CCC1021-${id}-progress.json`, data);
    overlay.remove();
  });
  overlay.querySelector('#close-export').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function animate() {
  requestAnimationFrame(animate);
  TWEEN.update();

  objects.forEach((obj) => {
    if (!obj.mesh || obj.render === 'galaxy' || obj.render === 'blackhole') return;

    if (obj.name === 'Venus') {
      obj.mesh.rotation.y -= 0.01;
      if (obj.shadow) obj.shadow.rotation.y -= 0.01;
      return;
    }

    if (obj.name === 'Uranus') {
      obj.mesh.rotation.x += 0.01;
      if (obj.shadow) obj.shadow.rotation.x += 0.01;
      return;
    }

    obj.mesh.rotation.y += 0.01;
    if (obj.shadow) obj.shadow.rotation.y += 0.01;
  });

  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderTitleCanvas(els.titleCanvas);
  renderTitleCanvas(els.endCanvas);
}

function initLearningControls() {
  document.getElementById('btn-learn').addEventListener('click', () => {
    state.learnPanelOpen = !state.learnPanelOpen;
    document.getElementById('btn-learn').classList.toggle('active', state.learnPanelOpen);
    if (state.learnPanelOpen && objects[state.currentIndex]) updateLearnPanel(objects[state.currentIndex]);
    else els.learnPanel.style.display = 'none';
  });

  document.getElementById('btn-compare').addEventListener('click', () => {
    comparePanel.toggle();
    document.getElementById('btn-compare').classList.toggle('active');
  });

  document.getElementById('btn-quiz').addEventListener('click', toggleQuizPanel);

  els.quizTab?.addEventListener('click', () => setQuizPanelOpen(true));

  document.getElementById('btn-export').addEventListener('click', showExportDialog);
  document.getElementById('btn-end-quiz')?.addEventListener('click', () => {
    setQuizPanelOpen(true);
  });

  els.sizeToggles?.querySelectorAll('.size-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sizeDisplayMode = btn.dataset.mode;
      els.sizeToggles.querySelectorAll('.size-toggle').forEach((b) => b.classList.toggle('active', b === btn));
      if (objects[state.currentIndex]) {
        els.itemSize.textContent = formatSizeLine(objects[state.currentIndex]);
      }
    });
  });

  document.getElementById('btn-learn').classList.add('active');
}

function init() {
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.domElement.id = 'renderer';
  renderer.setSize(window.innerWidth, window.innerHeight);
  els.container.appendChild(renderer.domElement);

  layoutObjects();
  camera.position.set(-0.05, 0, 0);
  tweenTo({ x: -0.05, y: 0, z: 0, rad: 0.01, index: -1, render: 'sphere' }, 0);

  renderTitleCanvas(els.titleCanvas);
  renderTitleCanvas(els.endCanvas);
  initLearningControls();
  objectSearch = createObjectSearchBar(objects, els.searchHost, {
    onSelect: (obj) => navigateToIndex(obj.index),
  });
  minimap.setVisited(loadProgress().visited);
  updateUI();
  animate();

  const hammer = new window.Hammer(els.container);
  hammer.on('swipeleft', goNext);
  hammer.on('swiperight', goPrev);

  const handleNavKey = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    }
  };

  window.addEventListener('keydown', handleNavKey);

  els.titlePage.addEventListener('click', (e) => {
    if (!state.firstPage) return;
    if (e.target.closest('a, button')) return;
    goNext();
  });

  els.titlePage.querySelector('.title-instructions')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goNext();
    }
  });

  els.endPage.addEventListener('click', (e) => {
    if (!state.lastPage) return;
    if (e.target.closest('a, button')) return;
    goPrev();
  });

  window.addEventListener('resize', onResize);

  const startChapter = new URLSearchParams(window.location.search).get('chapter');
  if (startChapter) {
    const ch = CHAPTERS.find((c) => c.id === startChapter);
    if (ch) {
      state.firstPage = false;
      state.currentIndex = ch.startIndex;
      tweenTo(objects[ch.startIndex], 800);
      setTimeout(updateUI, 900);
    }
  }
}

init();
