// Neon Coast Cover Studio — the cover renderer.
// Draws a GTA-style multi-panel poster on a 2D canvas: photo grid, cast chips,
// striped gradient title over the art, press quote, seals and billing strip.
// Every photo is drawn cover-fit with its own focal point, zoom and pan, then
// graded with a canvas filter and a warm overlay. No network: all assets are
// files under app/ and photos come from the machine or the sample tray.

export const SIZES = {
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  story: { w: 1080, h: 1350, label: 'Story 1080 x 1350' },
};

export const LAYOUTS = {
  grid: { label: 'Vice Grid', hint: 'Six panels, hero centre-top' },
  popout: { label: 'Pop-Out Hero', hint: 'Hero cut-out breaks the grid' },
  slant: { label: 'Slant Cut', hint: 'Diagonal panel dividers' },
};

export const GRADES = {
  sunset: { label: 'Sunset', saturate: 1.3, contrast: 1.06, brightness: 1.03, sepia: 0.22, hue: 0, tint: 'rgba(255,120,40,0.10)' },
  neon: { label: 'Neon', saturate: 1.55, contrast: 1.12, brightness: 1.0, sepia: 0.08, hue: 0, tint: 'rgba(255,40,140,0.08)' },
  vice: { label: 'Vice', saturate: 1.15, contrast: 1.08, brightness: 1.02, sepia: 0.0, hue: -8, tint: 'rgba(40,180,220,0.07)' },
  gold: { label: 'Gold', saturate: 1.35, contrast: 1.04, brightness: 1.05, sepia: 0.38, hue: 0, tint: 'rgba(255,180,60,0.12)' },
};

export const SAMPLE_PHOTOS = [
  { src: 'samples/boulevard.jpg', label: 'Boulevard' },
  { src: 'samples/rooftop.jpg', label: 'Rooftop' },
  { src: 'samples/neon.jpg', label: 'Neon Row' },
  { src: 'samples/pier.jpg', label: 'Old Pier' },
  { src: 'samples/driver.jpg', label: 'Coast Road' },
  { src: 'samples/rider.jpg', label: 'Bike Lane' },
];

export const ROLES = ['THE DRIVER', 'THE BOSS', 'THE CREW', 'THE CAPTAIN', 'THE RACER', 'THE RIDER', 'THE CLOSER', 'THE FIXER', 'THE INSIDER', 'THE LOOKOUT', 'THE NAVIGATOR', 'THE MECHANIC'];

export function defaultState() {
  return {
    size: 'wide',
    layout: 'grid',
    grade: 'sunset',
    warmth: 0.55,
    saturation: 1.0,
    vignette: 0.5,
    grain: 0.5,
    title: 'NEON COAST',
    subtitle: 'chasing the last light',
    quote: 'A SUNSET THAT NEVER ENDS',
    outlet: 'THE VICE GAZETTE',
    tagline: 'SIX FACES · ONE COAST · NO WAY BACK',
    vol: 'VOL. 01',
    edition: "COLLECTOR'S EDITION",
    studio: 'A NEON COAST PICTURE',
    panels: [
      { photo: 'samples/rooftop.jpg', role: 'THE BOSS', place: 'ROOFTOP 9', time: '7:15 PM', caption: 'CITY LIGHTS, BIG PLANS', fx: 0.52, fy: 0.32, zoom: 1.12, px: 0, py: 0 },
      { photo: 'samples/boulevard.jpg', role: 'THE DRIVER', place: 'PALM ROW', time: '6:42 PM', caption: 'TOP DOWN, NO PLANS', fx: 0.5, fy: 0.8, zoom: 1.05, px: 0, py: 0 },
      { photo: 'samples/neon.jpg', role: 'THE CREW', place: 'NEON ROW', time: '9:15 PM', caption: 'TOO BRIGHT TO HIDE', fx: 0.5, fy: 0.38, zoom: 1.12, px: 0, py: 0 },
      { photo: 'samples/pier.jpg', role: 'THE CAPTAIN', place: 'OLD PIER', time: '5:30 AM', caption: 'FIRST CAST WINS', fx: 0.5, fy: 0.55, zoom: 1.1, px: 0, py: 0 },
      { photo: 'samples/driver.jpg', role: 'THE RACER', place: 'COAST ROAD', time: '6:05 PM', caption: 'LAST LIGHT RUN', fx: 0.35, fy: 0.3, zoom: 1.05, px: 0, py: 0 },
      { photo: 'samples/rider.jpg', role: 'THE RIDER', place: 'BIKE LANE', time: '7:48 PM', caption: 'FULL THROTTLE', fx: 0.5, fy: 0.3, zoom: 1.12, px: 0, py: 0 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Photo loading (cached per src so a redraw never refetches).
// ---------------------------------------------------------------------------

const photoCache = new Map();

export function loadPhoto(src) {
  if (photoCache.has(src)) return photoCache.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  photoCache.set(src, p);
  return p;
}

export async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('60px Pacifico'),
        document.fonts.load('bold 20px Arial'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    await document.fonts.ready;
  } catch {
    // Fall back to system fonts; the cover still draws.
  }
}

export function gradeFilter(state) {
  const g = GRADES[state.grade] || GRADES.sunset;
  const sat = (g.saturate * state.saturation).toFixed(2);
  const sep = (g.sepia * state.warmth).toFixed(2);
  const hue = g.hue ? ` hue-rotate(${g.hue}deg)` : '';
  return `saturate(${sat}) contrast(${g.contrast}) brightness(${g.brightness}) sepia(${sep})${hue}`;
}

// ---------------------------------------------------------------------------
// Geometry: panel rects for each layout, in canvas pixels. The photo grid
// ends above the billing strip so no place chip hides under it.
// ---------------------------------------------------------------------------

export function stripHeight(H) {
  return Math.max(34, H * 0.042);
}

export function panelRects(layout, W, H) {
  const gap = Math.max(4, Math.round(W * 0.004));
  const cols = 3;
  const rows = 2;
  const gridH = H - stripHeight(H);
  const cw = (W - gap * (cols + 1)) / cols;
  const ch = (gridH - gap * (rows + 1)) / rows;
  const rects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: gap + c * (cw + gap),
        y: gap + r * (ch + gap),
        w: cw,
        h: ch,
        slant: layout === 'slant' ? (r === 0 ? 1 : -1) * Math.round(cw * 0.06) : 0,
      });
    }
  }
  return rects;
}

function clipPanel(ctx, rect) {
  ctx.beginPath();
  if (rect.slant) {
    const s = rect.slant;
    ctx.moveTo(rect.x + s, rect.y);
    ctx.lineTo(rect.x + rect.w + s, rect.y);
    ctx.lineTo(rect.x + rect.w - s, rect.y + rect.h);
    ctx.lineTo(rect.x - s, rect.y + rect.h);
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.closePath();
  ctx.clip();
}

// ---------------------------------------------------------------------------
// Small drawing helpers.
// ---------------------------------------------------------------------------

function fitFont(ctx, text, family, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function pill(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function starburst(ctx, cx, cy, rOuter, rInner, points, fill) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = Math.max(2, rOuter * 0.06);
  ctx.strokeStyle = '#5b2d00';
  ctx.stroke();
}

function drawBarcode(ctx, x, y, w, h, seed) {
  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(x - 4, y - 3, w + 8, h + 6);
  let s = seed;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  let bx = x;
  ctx.fillStyle = '#111';
  while (bx < x + w) {
    const bw = 1 + Math.floor(rnd() * 4);
    if (rnd() > 0.42) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1 + Math.floor(rnd() * 3);
  }
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 140;
  t.height = 140;
  const c = t.getContext('2d');
  const img = c.createImageData(140, 140);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = t;
  return t;
}

// ---------------------------------------------------------------------------
// The cover itself.
// ---------------------------------------------------------------------------

export async function drawCover(canvas, state) {
  const size = SIZES[state.size] || SIZES.wide;
  const W = size.w;
  const H = size.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await loadFonts();
  const imgs = await Promise.all(state.panels.map((p) => loadPhoto(p.photo)));
  const grade = GRADES[state.grade] || GRADES.sunset;
  const u = W / 1920; // unit: 1 at wide size

  // Backdrop.
  ctx.fillStyle = '#14081f';
  ctx.fillRect(0, 0, W, H);

  const rects = panelRects(state.layout, W, H);

  if (state.layout === 'popout') {
    drawGridPanels(ctx, state, imgs, rects, u, 1);
    drawPopoutHero(ctx, state, imgs[1], W, H, u);
  } else {
    drawGridPanels(ctx, state, imgs, rects, u, -1);
  }

  // Warm tint over the whole photo field.
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);

  // Scrims: top for the press quote, bottom band for title + credits.
  const topScrim = ctx.createLinearGradient(0, 0, 0, H * 0.16);
  topScrim.addColorStop(0, 'rgba(10,2,20,0.62)');
  topScrim.addColorStop(1, 'rgba(10,2,20,0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, W, H * 0.16);

  const titleTop = state.layout === 'popout' ? H * 0.6 : H * 0.55;
  const titleScrim = ctx.createLinearGradient(0, titleTop - H * 0.06, 0, H);
  titleScrim.addColorStop(0, 'rgba(10,2,20,0)');
  titleScrim.addColorStop(0.45, 'rgba(10,2,20,0.42)');
  titleScrim.addColorStop(1, 'rgba(10,2,20,0.78)');
  ctx.fillStyle = titleScrim;
  ctx.fillRect(0, titleTop - H * 0.06, W, H - titleTop + H * 0.06);

  drawPressQuote(ctx, state, W, H, u);
  drawCornerMarks(ctx, state, W, H, u);
  drawTitleBlock(ctx, state, W, H, u, titleTop, state.layout === 'popout' ? 0.8 : 1);
  drawBillingStrip(ctx, state, W, H, u);

  // Vignette + grain finish.
  if (state.vignette > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(20,0,40,0)');
    vg.addColorStop(1, `rgba(20,0,40,${0.5 * state.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain > 0) {
    ctx.save();
    ctx.globalAlpha = 0.06 * state.grain;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  return canvas;
}

function drawGridPanels(ctx, state, imgs, rects, u, skipIndex) {
  state.panels.forEach((panel, i) => {
    if (i === skipIndex) return;
    const rect = rects[i];
    const img = imgs[i];
    ctx.save();
    clipPanel(ctx, rect);
    if (img) {
      ctx.filter = gradeFilter(state);
      const s = Math.max(rect.w / img.width, rect.h / img.height) * panel.zoom;
      const dw = img.width * s;
      const dh = img.height * s;
      const cx = rect.x + rect.w * panel.fx + panel.px;
      const cy = rect.y + rect.h * panel.fy + panel.py;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#2a1638';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    // Panel inner shade at the bottom so the place chip reads.
    const sh = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = sh;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    // Divider line along the panel's left edge.
    ctx.save();
    ctx.strokeStyle = 'rgba(20,4,32,0.9)';
    ctx.lineWidth = Math.max(3, 5 * u);
    ctx.beginPath();
    if (rect.slant) {
      ctx.moveTo(rect.x + rect.slant, rect.y);
      ctx.lineTo(rect.x - rect.slant, rect.y + rect.h);
    } else {
      ctx.moveTo(rect.x, rect.y);
      ctx.lineTo(rect.x, rect.y + rect.h);
    }
    ctx.stroke();
    ctx.restore();

    // The centre-bottom panel sits under the title block, so its role chip
    // rides at the panel's top instead of under the title.
    drawPanelChips(ctx, panel, rect, u, i === 4);
  });
}

function drawPanelChips(ctx, panel, rect, u, chipAtTop) {
  const pad = 12 * u;
  // Place + time + caption bar, bottom of the panel.
  const barH = 62 * u;
  ctx.fillStyle = 'rgba(8,2,16,0.82)';
  ctx.fillRect(rect.x, rect.y + rect.h - barH, rect.w, barH);
  ctx.fillStyle = '#ff5e7a';
  ctx.fillRect(rect.x, rect.y + rect.h - barH, 5 * u, barH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(25 * u)}px Anton, Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${panel.place}  ·  ${panel.time}`, rect.x + 16 * u, rect.y + rect.h - barH + 20 * u);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `bold ${Math.round(19 * u)}px Arial, sans-serif`;
  ctx.fillText(panel.caption, rect.x + 16 * u, rect.y + rect.h - 16 * u);

  // Role chip: bottom-left of the panel just above the place bar, or at the
  // panel's top when the title block covers the bottom (centre-bottom panel).
  // The press quote owns the top of the cover, so roles live down here like
  // the winners' posters.
  ctx.font = `${Math.round(26 * u)}px Anton, Arial, sans-serif`;
  const roleW = ctx.measureText(panel.role).width + 28 * u;
  const roleH = 40 * u;
  const roleY = chipAtTop ? rect.y + pad : rect.y + rect.h - barH - roleH - 10 * u;
  pill(ctx, rect.x + pad, roleY, roleW, roleH, 5 * u, 'rgba(12,2,24,0.88)');
  ctx.fillStyle = '#ffe45e';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(panel.role, rect.x + pad + 14 * u, roleY + roleH / 2 + 1 * u);
}

function drawPopoutHero(ctx, state, img, W, H, u) {
  const panel = state.panels[1];
  const hw = W * 0.44;
  const hh = H * 0.56;
  const hx = (W - hw) / 2;
  const hy = H * 0.04;
  ctx.save();
  ctx.translate(W / 2, hy + hh / 2);
  ctx.rotate(-0.028);
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 42 * u;
  ctx.shadowOffsetY = 14 * u;
  ctx.fillStyle = '#160a24';
  ctx.fillRect(-hw / 2 - 10 * u, -hh / 2 - 10 * u, hw + 20 * u, hh + 20 * u);
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.rect(-hw / 2, -hh / 2, hw, hh);
  ctx.clip();
  if (img) {
    ctx.filter = gradeFilter(state);
    const s = Math.max(hw / img.width, hh / img.height) * panel.zoom;
    const dw = img.width * s;
    const dh = img.height * s;
    // Same focal math as the grid: the image centre lands at the cut-out's
    // focal point, so a portrait photo's face stays in frame.
    ctx.drawImage(img, -dw / 2 + (panel.fx - 0.5) * dw + panel.px, -dh / 2 + (panel.fy - 0.5) * dh + panel.py, dw, dh);
    ctx.filter = 'none';
  }
  ctx.restore();
  // Hero role chip at the foot of the cut-out, clear of the face.
  const chipY = hy + hh - 58 * u;
  ctx.font = `${Math.round(30 * u)}px Anton, Arial, sans-serif`;
  const rw = ctx.measureText(panel.role).width + 32 * u;
  pill(ctx, W / 2 - rw / 2, chipY, rw, 46 * u, 6 * u, 'rgba(12,2,24,0.9)');
  ctx.fillStyle = '#ffe45e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(panel.role, W / 2, chipY + 24 * u);
}

function drawPressQuote(ctx, state, W, H, u) {
  const y = H * 0.045;
  const stars = '★★★★★';
  const line = `"${state.quote}"  —  ${state.outlet}`;
  ctx.font = `${Math.round(30 * u)}px Arial, sans-serif`;
  const sw = ctx.measureText(stars).width;
  ctx.font = `bold ${Math.round(27 * u)}px Arial, sans-serif`;
  const lw = ctx.measureText(line).width;
  const gap = 22 * u;
  let x = (W - sw - gap - lw) / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd94a';
  ctx.font = `${Math.round(30 * u)}px Arial, sans-serif`;
  ctx.fillText(stars, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(27 * u)}px Arial, sans-serif`;
  ctx.fillText(line, x + sw + gap, y);
}

function drawCornerMarks(ctx, state, W, H, u) {
  // WANTED pill, top-left (kept clear of faces: it sits on the frame edge).
  const wy = H * 0.1;
  ctx.font = `${Math.round(28 * u)}px Anton, Arial, sans-serif`;
  const wText = 'WANTED';
  const wStars = '★★★★★';
  const wW = ctx.measureText(wText).width + 78 * u + 46 * u;
  pill(ctx, 18 * u, wy, wW, 52 * u, 26 * u, 'rgba(8,2,16,0.92)');
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.roundRect(18 * u, wy, wW, 52 * u, 26 * u);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(wText, 18 * u + 20 * u, wy + 27 * u);
  ctx.fillStyle = '#ffd94a';
  ctx.font = `${Math.round(24 * u)}px Arial, sans-serif`;
  ctx.fillText(wStars, 18 * u + 20 * u + ctx.measureText(wText).width + 16 * u, wy + 27 * u);

  // VOL chip, top-right.
  ctx.font = `${Math.round(28 * u)}px Anton, Arial, sans-serif`;
  const vW = ctx.measureText(state.vol).width + 36 * u;
  pill(ctx, W - vW - 18 * u, wy, vW, 52 * u, 6 * u, '#19b8d8');
  ctx.fillStyle = '#08222e';
  ctx.textAlign = 'center';
  ctx.fillText(state.vol, W - vW / 2 - 18 * u, wy + 27 * u);

  // EST. 2026 starburst seal, bottom-right, clear of the place bars.
  const sx = W - 105 * u;
  const sy = H - stripHeight(H) - 96 * u;
  starburst(ctx, sx, sy, 78 * u, 62 * u, 12, '#ffc21c');
  ctx.fillStyle = '#3a2400';
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(24 * u)}px Anton, Arial, sans-serif`;
  ctx.fillText('EST.', sx, sy - 14 * u);
  ctx.fillText('2026', sx, sy + 16 * u);
  ctx.font = `${Math.round(15 * u)}px Arial, sans-serif`;
  ctx.fillText('★★★', sx, sy + 38 * u);

  // COLLECTOR'S EDITION ribbon, bottom-left just above the place bar so it
  // never covers a panel's text.
  ctx.save();
  ctx.translate(150 * u, H - stripHeight(H) - 62 * u - 32 * u);
  ctx.rotate(-0.045);
  ctx.fillStyle = '#ff2e7e';
  ctx.fillRect(-150 * u, -22 * u, 300 * u, 44 * u);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(24 * u)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.edition, 0, 1 * u);
  ctx.restore();
}

function drawTitleBlock(ctx, state, W, H, u, titleTop, scale = 1) {
  const cx = W / 2;
  // Striped sunset gradient for the title letters.
  const titleY = titleTop + H * 0.02;
  const titleSize = fitFont(ctx, state.title, 'Anton, Arial, sans-serif', W * 0.94, Math.round(215 * u * scale));
  const grad = ctx.createLinearGradient(0, titleY, 0, titleY + titleSize);
  grad.addColorStop(0, '#fff3a0');
  grad.addColorStop(0.32, '#ffb347');
  grad.addColorStop(0.55, '#ff5e7a');
  grad.addColorStop(0.78, '#d65cff');
  grad.addColorStop(1, '#8a3ffc');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 26 * u;
  ctx.shadowOffsetY = 10 * u;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1c0533';
  ctx.lineWidth = Math.max(6, 14 * u);
  ctx.strokeText(state.title, cx, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(state.title, cx, titleY);
  ctx.restore();

  // Neon script subtitle, overlapping the title's lower edge.
  const subY = titleY + titleSize * 0.82;
  const subSize = fitFont(ctx, state.subtitle, 'Pacifico, cursive', W * 0.7, Math.round(74 * u * scale));
  ctx.save();
  ctx.translate(cx, subY + subSize / 2);
  ctx.rotate(-0.03);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff2e7e';
  ctx.shadowBlur = 30 * u;
  ctx.fillStyle = '#ffd7ef';
  ctx.font = `${subSize}px Pacifico, cursive`;
  ctx.fillText(state.subtitle, 0, 0);
  ctx.restore();

  // Tagline ribbon under the subtitle.
  const tagY = subY + subSize + H * 0.028;
  ctx.font = `bold ${Math.round(26 * u)}px Arial, sans-serif`;
  const tagW = ctx.measureText(state.tagline).width + 90 * u;
  const tagH = 46 * u;
  pill(ctx, cx - tagW / 2, tagY, tagW, tagH, 4 * u, 'rgba(10,2,22,0.88)');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.tagline, cx, tagY + tagH / 2 + 1 * u);
}

function drawBillingStrip(ctx, state, W, H, u) {
  const stripH = stripHeight(H);
  const y = H - stripH;
  ctx.fillStyle = 'rgba(6,1,12,0.9)';
  ctx.fillRect(0, y, W, stripH);
  ctx.fillStyle = '#ffd94a';
  ctx.font = `bold ${Math.round(22 * u)}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('COMING SOON', 18 * u, y + stripH / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `${Math.round(19 * u)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  const credit = `${state.studio}  ·  STARRING YOU  ·  SHOT ON YOUR OWN CAMERA`;
  ctx.fillText(credit, W / 2 + 30 * u, y + stripH / 2);
  drawBarcode(ctx, W - 150 * u, y + stripH * 0.22, 110 * u, stripH * 0.56, 20261120);
}

// Export at a chosen size: renders the same cover to an offscreen canvas.
export async function renderExport(state, sizeKey) {
  const off = document.createElement('canvas');
  const saved = state.size;
  state.size = sizeKey;
  await drawCover(off, state);
  state.size = saved;
  return off;
}
