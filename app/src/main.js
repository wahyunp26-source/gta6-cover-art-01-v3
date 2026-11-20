// Neon Coast Cover Studio — the editor.
// Wires the page: photo tray, panel picking and cropping, layout and grade
// controls, caption text, export. A `?shot=` query sets up a fixed scene for
// a screenshot instead (./shots.js). State is plain JSON so undo/redo is a
// stack of snapshots; photos live outside state as URLs and Image objects.
import { defaultState, drawCover, renderExport, panelRects, loadPhoto, SAMPLE_PHOTOS, LAYOUTS, GRADES, SIZES, ROLES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const trayEl = document.getElementById('tray');
const inspectorEl = document.getElementById('inspector');

let state = defaultState();
let tray = [...SAMPLE_PHOTOS];
let selected = 1; // the hero panel, centre-top
let lastRects = [];
let redrawQueued = false;

const undoStack = [];
const redoStack = [];

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function restore(json) {
  state = JSON.parse(json);
  selected = Math.min(selected, state.panels.length - 1);
  syncControls();
  queueRedraw();
}

function syncHistoryButtons() {
  document.getElementById('undo').disabled = undoStack.length === 0;
  document.getElementById('redo').disabled = redoStack.length === 0;
}

function queueRedraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(async () => {
    redrawQueued = false;
    const size = SIZES[state.size];
    canvas.width = size.w;
    canvas.height = size.h;
    // Keep the preview's aspect honest while the canvas renders at full size.
    canvas.style.aspectRatio = `${size.w} / ${size.h}`;
    await drawCover(canvas, state);
    lastRects = panelRects(state.layout, size.w, size.h);
    highlightSelected();
  });
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ---------------------------------------------------------------------------
// Photo tray: samples plus anything the user drops in.
// ---------------------------------------------------------------------------

function renderTray() {
  trayEl.innerHTML = '';
  tray.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = photo.label;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.label;
    img.draggable = false;
    b.appendChild(img);
    const cap = document.createElement('span');
    cap.textContent = photo.label;
    b.appendChild(cap);
    b.addEventListener('click', () => {
      pushHistory();
      state.panels[selected].photo = photo.src;
      queueRedraw();
      setStatus(`${photo.label} is now panel ${selected + 1}.`);
    });
    trayEl.appendChild(b);
  });
}

async function addUpload(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const label = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Your photo';
  tray.push({ src: dataUrl, label });
  renderTray();
  return dataUrl;
}

// ---------------------------------------------------------------------------
// Panel picking, panning and zooming on the preview canvas.
// ---------------------------------------------------------------------------

function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * canvas.width;
  const y = ((clientY - r.top) / r.height) * canvas.height;
  for (let i = lastRects.length - 1; i >= 0; i--) {
    const p = lastRects[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}

function highlightSelected() {
  const wrap = canvas.parentElement;
  let ring = document.getElementById('sel-ring');
  if (!ring) {
    ring = document.createElement('div');
    ring.id = 'sel-ring';
    wrap.appendChild(ring);
  }
  const rect = lastRects[selected];
  const box = canvas.getBoundingClientRect();
  const wrapBox = wrap.getBoundingClientRect();
  if (!rect) {
    ring.style.display = 'none';
    return;
  }
  const sx = box.width / canvas.width;
  const sy = box.height / canvas.height;
  ring.style.display = 'block';
  ring.style.left = `${box.left - wrapBox.left + rect.x * sx}px`;
  ring.style.top = `${box.top - wrapBox.top + rect.y * sy}px`;
  ring.style.width = `${rect.w * sx}px`;
  ring.style.height = `${rect.h * sy}px`;
  ring.dataset.label = `Panel ${selected + 1} · ${state.panels[selected].role}`;
}

let dragging = null;

canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selected = i;
  syncInspector();
  highlightSelected();
  const panel = state.panels[i];
  dragging = { x: e.clientX, y: e.clientY, px: panel.px, py: panel.py };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const panel = state.panels[selected];
  const r = canvas.getBoundingClientRect();
  const scale = canvas.width / r.width;
  panel.px = dragging.px + (e.clientX - dragging.x) * scale;
  panel.py = dragging.py + (e.clientY - dragging.y) * scale;
  queueRedraw();
});

canvas.addEventListener('pointerup', () => {
  if (dragging) {
    pushHistory();
    dragging = null;
    setStatus(`Panel ${selected + 1} repositioned.`);
  }
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[selected];
  pushHistory();
  panel.zoom = Math.min(2.5, Math.max(1, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  document.getElementById('panel-zoom').value = panel.zoom;
  queueRedraw();
}, { passive: false });

canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const i = panelAt(e.clientX, e.clientY);
  const src = await addUpload(file);
  pushHistory();
  state.panels[i < 0 ? selected : i].photo = src;
  queueRedraw();
  setStatus('Your photo is in. Drag it to position, scroll to zoom.');
});

// ---------------------------------------------------------------------------
// Controls.
// ---------------------------------------------------------------------------

function bindText(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    state[key] = el.value;
    queueRedraw();
  });
  el.addEventListener('change', () => {
    pushHistory();
    setStatus(`${el.dataset.label || key} updated.`);
  });
}

function bindRange(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    state[key] = parseFloat(el.value);
    queueRedraw();
  });
  el.addEventListener('change', pushHistory);
}

function optionButtons(containerId, options, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  Object.entries(options).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt' + (key === current ? ' on' : '');
    b.textContent = def.label;
    b.title = def.hint || def.label;
    b.addEventListener('click', () => {
      pushHistory();
      onPick(key);
      [...box.children].forEach((c) => c.classList.remove('on'));
      b.classList.add('on');
      queueRedraw();
    });
    box.appendChild(b);
  });
}

function syncControls() {
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('quote').value = state.quote;
  document.getElementById('outlet').value = state.outlet;
  document.getElementById('tagline').value = state.tagline;
  document.getElementById('vol').value = state.vol;
  document.getElementById('warmth').value = state.warmth;
  document.getElementById('saturation').value = state.saturation;
  document.getElementById('vignette').value = state.vignette;
  document.getElementById('grain').value = state.grain;
  optionButtons('layout-pick', LAYOUTS, state.layout, (k) => { state.layout = k; });
  optionButtons('grade-pick', GRADES, state.grade, (k) => { state.grade = k; });
  optionButtons('size-pick', SIZES, state.size, (k) => { state.size = k; });
  syncInspector();
}

function syncInspector() {
  const p = state.panels[selected];
  document.getElementById('panel-title').textContent = `Panel ${selected + 1} — ${p.photo.split('/').pop()}`;
  document.getElementById('panel-role').value = p.role;
  document.getElementById('panel-place').value = p.place;
  document.getElementById('panel-time').value = p.time;
  document.getElementById('panel-caption').value = p.caption;
  document.getElementById('panel-zoom').value = p.zoom;
  document.getElementById('panel-fx').value = p.fx;
  document.getElementById('panel-fy').value = p.fy;
}

function bindInspector() {
  const p = () => state.panels[selected];
  const bind = (id, key, parse = (v) => v) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      p()[key] = parse(el.value);
      queueRedraw();
    });
    el.addEventListener('change', pushHistory);
  };
  bind('panel-role', 'role');
  bind('panel-place', 'place');
  bind('panel-time', 'time');
  bind('panel-caption', 'caption');
  bind('panel-zoom', 'zoom', parseFloat);
  bind('panel-fx', 'fx', parseFloat);
  bind('panel-fy', 'fy', parseFloat);
  document.getElementById('panel-reset').addEventListener('click', () => {
    pushHistory();
    const panel = p();
    panel.fx = 0.5;
    panel.fy = 0.35;
    panel.zoom = 1.1;
    panel.px = 0;
    panel.py = 0;
    syncInspector();
    queueRedraw();
  });
  document.getElementById('panel-role-next').addEventListener('click', () => {
    pushHistory();
    const i = ROLES.indexOf(p().role);
    p().role = ROLES[(i + 1) % ROLES.length];
    syncInspector();
    queueRedraw();
  });
}

function bindActions() {
  document.getElementById('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const src = await addUpload(file);
    pushHistory();
    state.panels[selected].photo = src;
    queueRedraw();
    setStatus('Your photo is in. Drag it to position, scroll to zoom.');
  });
  document.getElementById('autofill').addEventListener('click', () => {
    pushHistory();
    const photos = tray.map((t) => t.src);
    for (let i = photos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photos[i], photos[j]] = [photos[j], photos[i]];
    }
    state.panels.forEach((p, i) => {
      p.photo = photos[i % photos.length];
      p.role = ROLES[i % ROLES.length];
    });
    syncInspector();
    queueRedraw();
    setStatus('Auto-filled with fresh photos and cast roles.');
  });
  document.getElementById('shuffle-layout').addEventListener('click', () => {
    pushHistory();
    const keys = Object.keys(LAYOUTS);
    state.layout = keys[(keys.indexOf(state.layout) + 1) % keys.length];
    syncControls();
    queueRedraw();
    setStatus(`Layout: ${LAYOUTS[state.layout].label}.`);
  });
  document.getElementById('export').addEventListener('click', async () => {
    setStatus('Rendering your PNG…');
    const off = await renderExport(state, state.size);
    const size = SIZES[state.size];
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${size.w}x${size.h}.png`;
      a.click();
      setStatus(`Saved neon-coast-${size.w}x${size.h}.png — share it.`);
    }, 'image/png');
  });
  document.getElementById('undo').addEventListener('click', () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
    syncHistoryButtons();
  });
  document.getElementById('redo').addEventListener('click', () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
    syncHistoryButtons();
  });
  window.addEventListener('resize', highlightSelected);
}

// ---------------------------------------------------------------------------
// Boot.
// ---------------------------------------------------------------------------

const shot = new URLSearchParams(location.search).get('shot');
if (shot && shot !== 'editor') {
  runShot(shot, new URLSearchParams(location.search), state, canvas);
} else {
  bindText('title', 'title');
  bindText('subtitle', 'subtitle');
  bindText('quote', 'quote');
  bindText('outlet', 'outlet');
  bindText('tagline', 'tagline');
  bindText('vol', 'vol');
  bindRange('warmth', 'warmth');
  bindRange('saturation', 'saturation');
  bindRange('vignette', 'vignette');
  bindRange('grain', 'grain');
  bindInspector();
  bindActions();
  renderTray();
  syncControls();
  syncHistoryButtons();
  // Preload the samples so the first paint is instant.
  Promise.all(tray.map((t) => loadPhoto(t.src))).then(queueRedraw);
  queueRedraw();
  setStatus('Pick a panel, drag to position, scroll to zoom — then export.');
}
