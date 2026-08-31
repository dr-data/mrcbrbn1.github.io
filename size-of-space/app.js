import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { SPACE_OBJECTS } from './objects.js';
import { formatDiameter, lyToKm } from './format-size.js';
import { TEXTURE_BASE, TEXTURE_BASE_SMALL, STICKER_BASE } from './config.js';

const SATURN_BODY_RADIUS = 60268;
const SATURN_RING_INNER = 76268;
const SATURN_RING_OUTER = 120268;
const SATURN_CAMERA_RADIUS = 58232;

const isMobile = window.innerWidth < 600;
const isSmallScreen = window.innerWidth <= 380;
const objectGap = isMobile ? 5 : 2;
const textureBase = isSmallScreen ? TEXTURE_BASE_SMALL : TEXTURE_BASE;

const state = {
  firstPage: true,
  lastPage: false,
  currentIndex: 0,
  pauseInput: false,
  activeTween: null,
  tweenIndex: -1,
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
const objects = SPACE_OBJECTS.map((entry) => ({ ...entry }));

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

  const ringMap = loadTexture(`${TEXTURE_BASE}/saturn-ring2.jpg`);
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

function updateUI() {
  const onTitle = state.firstPage && state.currentIndex === 0;
  const onEnd = state.lastPage || state.currentIndex >= objects.length - 1;
  const inTour = !state.firstPage && !state.lastPage && state.currentIndex > 0 && state.currentIndex < objects.length - 1;

  els.titlePage.style.left = state.firstPage ? '0' : '-100%';
  els.endPage.style.left = state.lastPage ? '0' : '100%';
  els.endPage.style.display = onEnd && !state.firstPage ? 'block' : 'none';
  els.itemDescription.style.display = inTour ? 'block' : 'none';

  if (inTour) {
    const obj = objects[state.currentIndex];
    els.itemTitle.textContent = obj.name;
    els.itemType.textContent = obj.type;
    els.itemSize.textContent = `${formatDiameter(obj.rad)} diameter`;
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
    { src: `${STICKER_BASE}/jupiter.png`, x: (3 * w) / 4, y: h / 7, size: 30 },
    { src: `${STICKER_BASE}/earth.png`, x: w / 5, y: h / 5, size: 80 },
    { src: `${STICKER_BASE}/saturn.png`, x: (3 * w) / 6, y: (4 * h) / 5, size: 100 },
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
  updateUI();
  animate();

  const hammer = new window.Hammer(els.container);
  hammer.on('swipeleft', goNext);
  hammer.on('swiperight', goPrev);

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
  });

  window.addEventListener('resize', onResize);
}

init();
