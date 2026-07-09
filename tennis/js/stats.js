/* =========================================================================
   stats.js — Stocarea sesiunilor (localStorage) + grafice pe canvas
   ========================================================================= */
import { Court } from './vision.js';

const KEY = 'acevision_sessions_v1';
const SETTINGS_KEY = 'acevision_settings_v1';

export const SHOT_LABELS = {
  forehand: 'Forehand', backhand: 'Backhand', serve: 'Serviciu',
  smash: 'Smash', volley: 'Voleu',
};
export const SHOT_COLORS = {
  forehand: '#4ade80', backhand: '#60a5fa', serve: '#facc15',
  smash: '#f87171', volley: '#c084fc',
};

/* ---------------- Setări ---------------- */
export const defaultSettings = {
  handed: 'right', units: 'kmh', voice: true, lineMode: 'singles',
  ballSensitivity: 1, swingSensitivity: 1, fastAnalysis: false,
};
export function loadSettings() {
  try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return { ...defaultSettings }; }
}
export function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

export function fmtSpeed(kmh, units) {
  if (kmh == null) return '–';
  return units === 'mph' ? `${Math.round(kmh * 0.6214)} mph` : `${kmh} km/h`;
}

/* ---------------- Sesiuni ---------------- */
export function listSessions() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveSession(session) {
  const all = listSessions();
  all.unshift(session);
  // păstrăm max 40 de sesiuni ca să nu umplem localStorage
  while (all.length > 40) all.pop();
  try { localStorage.setItem(KEY, JSON.stringify(all)); }
  catch {
    // dacă nu încape (thumbnail-uri mari), le eliminăm și reîncercăm
    all.forEach(s => s.shots?.forEach(sh => delete sh.thumb));
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* plin */ }
  }
}
export function deleteSession(id) {
  localStorage.setItem(KEY, JSON.stringify(listSessions().filter(s => s.id !== id)));
}

export function summarize(session) {
  const counts = {};
  let speedSum = 0, speedN = 0, maxSpeed = 0, maxType = null;
  let inCalls = 0, outCalls = 0;
  for (const s of session.shots || []) {
    counts[s.type] = (counts[s.type] || 0) + 1;
    if (s.speedKmh) {
      speedSum += s.speedKmh; speedN++;
      if (s.speedKmh > maxSpeed) { maxSpeed = s.speedKmh; maxType = s.type; }
    }
  }
  for (const b of session.bounces || []) {
    if (b.call === 'in') inCalls++; else if (b.call === 'out') outCalls++;
  }
  return {
    total: (session.shots || []).length, counts,
    avgSpeed: speedN ? Math.round(speedSum / speedN) : null,
    maxSpeed: maxSpeed || null, maxType,
    inCalls, outCalls,
  };
}

export function toCSV(session) {
  const rows = [['timp_s', 'tip', 'viteza_swing_kmh', 'viteza_minge_kmh']];
  for (const s of session.shots || []) {
    rows.push([(s.t / 1000).toFixed(2), SHOT_LABELS[s.type] || s.type, s.speedKmh ?? '', s.ballSpeedKmh ?? '']);
  }
  return rows.map(r => r.join(',')).join('\n');
}

/* ---------------- Grafice pe canvas ---------------- */
function prepCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300, h = canvas.clientHeight || 160;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

export function drawShotBar(canvas, counts) {
  const { ctx, w, h } = prepCanvas(canvas);
  const types = Object.keys(SHOT_LABELS).filter(t => counts[t]);
  if (!types.length) { drawEmpty(ctx, w, h); return; }
  const max = Math.max(...types.map(t => counts[t]));
  const bw = Math.min(56, (w - 20) / types.length - 12);
  const x0 = (w - types.length * (bw + 12)) / 2 + 6;
  ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  types.forEach((t, i) => {
    const x = x0 + i * (bw + 12);
    const bh = Math.max(3, (counts[t] / max) * (h - 42));
    ctx.fillStyle = SHOT_COLORS[t];
    ctx.beginPath(); ctx.roundRect(x, h - 24 - bh, bw, bh, 5); ctx.fill();
    ctx.fillStyle = '#e7eef7';
    ctx.fillText(String(counts[t]), x + bw / 2, h - 28 - bh);
    ctx.fillStyle = '#93a4b8';
    ctx.fillText(SHOT_LABELS[t], x + bw / 2, h - 8);
  });
}

export function drawSpeedLine(canvas, shots, units) {
  const { ctx, w, h } = prepCanvas(canvas);
  const pts = (shots || []).filter(s => s.speedKmh);
  if (pts.length < 2) { drawEmpty(ctx, w, h); return; }
  const conv = units === 'mph' ? 0.6214 : 1;
  const vals = pts.map(s => s.speedKmh * conv);
  const vMax = Math.max(...vals) * 1.15, vMin = Math.min(...vals) * 0.85;
  const px = i => 14 + (i / (pts.length - 1)) * (w - 28);
  const py = v => h - 20 - ((v - vMin) / (vMax - vMin || 1)) * (h - 34);
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.beginPath();
  vals.forEach((v, i) => i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v)));
  ctx.stroke();
  vals.forEach((v, i) => {
    ctx.fillStyle = SHOT_COLORS[pts[i].type] || '#4ade80';
    ctx.beginPath(); ctx.arc(px(i), py(v), 3.2, 0, 7); ctx.fill();
  });
  ctx.fillStyle = '#93a4b8'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(units === 'mph' ? 'mph' : 'km/h', 6, 12);
}

function drawEmpty(ctx, w, h) {
  ctx.fillStyle = '#5b6b7d'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Nu există încă date', w / 2, h / 2);
}

/* Desenează terenul văzut de sus + bounce-uri (heatmap simplificat).
   highlightZone: {half,depth,third} opțional, pentru modul antrenament. */
export function drawCourtMap(canvas, bounces, opts = {}) {
  const { ctx, w, h } = prepCanvas(canvas);
  const pad = 14;
  // terenul e desenat vertical: y teren (0..23.77) -> pe verticală
  const scale = Math.min((w - pad * 2) / Court.WIDTH_DOUBLES, (h - pad * 2) / Court.LENGTH);
  const cw = Court.WIDTH_DOUBLES * scale, ch = Court.LENGTH * scale;
  const ox = (w - cw) / 2, oy = (h - ch) / 2;
  const X = mx => ox + mx * scale;
  const Y = my => oy + ch - my * scale; // y=0 (aproape) jos

  // suprafață + zonă evidențiată
  ctx.fillStyle = '#14532d'; ctx.fillRect(ox - 8, oy - 8, cw + 16, ch + 16);
  ctx.fillStyle = '#166534'; ctx.fillRect(ox, oy, cw, ch);
  if (opts.highlightZone) {
    const z = opts.highlightZone;
    const x1 = z.third === 'stânga' ? 0 : z.third === 'centru' ? Court.WIDTH_DOUBLES / 3 : (2 * Court.WIDTH_DOUBLES) / 3;
    const y1 = z.half === 'aproape'
      ? (z.depth === 'scurt' ? Court.NET_Y - Court.SERVICE_DIST : 0)
      : (z.depth === 'scurt' ? Court.NET_Y : Court.NET_Y + Court.SERVICE_DIST);
    const yh = z.depth === 'scurt' ? Court.SERVICE_DIST : Court.NET_Y - Court.SERVICE_DIST;
    ctx.fillStyle = 'rgba(250, 204, 21, .28)';
    ctx.fillRect(X(x1), Y(y1 + yh), (Court.WIDTH_DOUBLES / 3) * scale, yh * scale);
  }

  // liniile
  ctx.strokeStyle = '#e7eef7'; ctx.lineWidth = 1.5;
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke(); };
  ctx.strokeRect(ox, oy, cw, ch); // dublu
  const m = Court.SINGLES_MARGIN;
  line(m, 0, m, Court.LENGTH); line(Court.WIDTH_DOUBLES - m, 0, Court.WIDTH_DOUBLES - m, Court.LENGTH); // simplu
  const sy1 = Court.NET_Y - Court.SERVICE_DIST, sy2 = Court.NET_Y + Court.SERVICE_DIST;
  line(m, sy1, Court.WIDTH_DOUBLES - m, sy1); line(m, sy2, Court.WIDTH_DOUBLES - m, sy2); // linii serviciu
  line(Court.WIDTH_DOUBLES / 2, sy1, Court.WIDTH_DOUBLES / 2, sy2); // linia centrală
  ctx.lineWidth = 3; ctx.strokeStyle = '#0b1220';
  line(0, Court.NET_Y, Court.WIDTH_DOUBLES, Court.NET_Y); // fileul

  // bounce-uri
  for (const b of bounces || []) {
    if (b.cx == null) continue;
    ctx.fillStyle = b.call === 'out' ? 'rgba(248,113,113,.85)' : 'rgba(74,222,128,.8)';
    ctx.beginPath(); ctx.arc(X(b.cx), Y(b.cy), 4, 0, 7); ctx.fill();
    if (b.call === 'out') {
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(X(b.cx), Y(b.cy), 7, 0, 7); ctx.stroke();
    }
  }
  return { X, Y, scale, ox, oy, cw, ch };
}
