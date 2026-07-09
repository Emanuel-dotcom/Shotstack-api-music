/* =========================================================================
   app.js — Controlerul principal AceVision
   ========================================================================= */
import { Homography, Court, BallTracker, SwingDetector, PoseEngine } from './vision.js';
import {
  SHOT_LABELS, SHOT_COLORS, loadSettings, saveSettings, fmtSpeed,
  listSessions, saveSession, deleteSession, summarize, toCSV,
  drawShotBar, drawSpeedLine, drawCourtMap,
} from './stats.js';

const $ = id => document.getElementById(id);
const settings = loadSettings();

/* ---------------- Starea globală ---------------- */
const state = {
  mode: null,              // 'upload' | 'live'
  running: false,
  video: null,
  stream: null,
  homography: null,
  calibPoints: [],         // puncte tap-uite de utilizator (pixeli video)
  pose: new PoseEngine(),
  ball: new BallTracker(),
  swing: null,
  session: null,           // sesiunea curentă în lucru
  viewSession: null,       // sesiunea afișată în tab-ul Rezultate
  drill: null,             // {zone, hits, attempts} pentru modul antrenament
  rafId: 0,
  lastPoseT: 0,
};

/* ---------------- Navigație (tab-uri) ---------------- */
document.querySelectorAll('.tabbar button').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});
function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + name));
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  // graficele au nevoie de tab-ul vizibil ca să-și măsoare dimensiunea,
  // așa că randăm după activarea tab-ului
  if (name === 'history') renderHistory();
  if (name === 'results') renderResults(state.viewSession || state.session);
  if (name === 'drills') renderDrills();
}

/* ---------------- Rostire vocală (ro-RO) ---------------- */
function speak(text) {
  if (!settings.voice || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ro-RO'; u.rate = 1.05;
  speechSynthesis.speak(u);
}

/* ---------------- Încărcare video / cameră ---------------- */
const video = $('video');
const overlay = $('overlay');
const octx = overlay.getContext('2d');

$('fileInput').addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  stopEverything();
  state.mode = 'upload';
  video.srcObject = null;
  video.src = URL.createObjectURL(f);
  video.muted = true;
  video.playsInline = true;
  video.load();
  video.onloadedmetadata = () => {
    syncOverlay();
    setStatus('Video încărcat. Pasul următor: calibrează terenul (recomandat) sau pornește analiza.');
    $('analyzeControls').hidden = false;
    showTab('analyze');
  };
});

async function startCamera() {
  stopEverything();
  state.mode = 'live';
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch {
    setStatus('Nu am putut porni camera. Verifică permisiunile din browser.', true);
    return;
  }
  video.srcObject = state.stream;
  video.muted = true;
  await video.play();
  syncOverlay();
  $('analyzeControls').hidden = false;
  setStatus('Cameră pornită. Calibrează terenul, apoi apasă „Începe analiza".');
}
$('btnCamera').addEventListener('click', startCamera);

function syncOverlay() {
  overlay.width = video.videoWidth || 640;
  overlay.height = video.videoHeight || 360;
}

function setStatus(msg, isError = false) {
  const el = $('status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

/* ---------------- Calibrarea terenului ---------------- */
$('btnCalibrate').addEventListener('click', () => {
  if (!video.videoWidth) { setStatus('Încarcă un video sau pornește camera mai întâi.', true); return; }
  state.calibPoints = [];
  state.homography = null;
  if (state.mode === 'upload') video.pause();
  overlay.classList.add('calibrating');
  promptNextCalibPoint();
});

function promptNextCalibPoint() {
  const i = state.calibPoints.length;
  if (i >= 4) return;
  setStatus(`Calibrare ${i + 1}/4: atinge pe imagine → ${Court.calibrationPoints[i].label}`);
}

overlay.addEventListener('click', e => {
  if (!overlay.classList.contains('calibrating')) return;
  const r = overlay.getBoundingClientRect();
  const pt = {
    x: ((e.clientX - r.left) / r.width) * overlay.width,
    y: ((e.clientY - r.top) / r.height) * overlay.height,
  };
  state.calibPoints.push(pt);
  drawCalibration();
  if (state.calibPoints.length === 4) {
    const dst = Court.calibrationPoints.map(p => ({ x: p.x, y: p.y }));
    state.homography = Homography.from4Points(state.calibPoints, dst);
    overlay.classList.remove('calibrating');
    if (state.homography) {
      setStatus('Teren calibrat ✔ — arbitrajul IN/OUT și vitezele mingii sunt active.');
      speak('Teren calibrat');
    } else {
      setStatus('Calibrare eșuată — punctele sunt coliniare. Încearcă din nou.', true);
      state.calibPoints = [];
    }
  } else {
    promptNextCalibPoint();
  }
});

function drawCalibration() {
  octx.clearRect(0, 0, overlay.width, overlay.height);
  octx.fillStyle = '#facc15';
  octx.strokeStyle = 'rgba(250,204,21,.7)';
  octx.lineWidth = 2;
  state.calibPoints.forEach((p, i) => {
    octx.beginPath(); octx.arc(p.x, p.y, 7, 0, 7); octx.fill();
    octx.font = 'bold 16px system-ui';
    octx.fillText(String(i + 1), p.x + 10, p.y - 8);
  });
  if (state.calibPoints.length > 1) {
    octx.beginPath();
    state.calibPoints.forEach((p, i) => i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y));
    if (state.calibPoints.length === 4) octx.closePath();
    octx.stroke();
  }
}

/* ---------------- Bucla de analiză ---------------- */
$('btnStart').addEventListener('click', () => state.running ? stopAnalysis(true) : startAnalysis());

async function startAnalysis() {
  if (!video.videoWidth) { setStatus('Încarcă un video sau pornește camera mai întâi.', true); return; }
  setStatus('Se încarcă modelul AI (prima dată durează câteva secunde)…');
  try { await state.pose.init(); }
  catch {
    setStatus('Nu am putut încărca modelul AI. Verifică conexiunea la internet și reîncearcă.', true);
    return;
  }

  state.ball = new BallTracker();
  state.ball.sensitivity = settings.ballSensitivity;
  state.swing = new SwingDetector({ handed: settings.handed });
  state.swing.minSpeed = 1 / settings.swingSensitivity;
  state.session = {
    id: 'S' + Date.now(),
    date: new Date().toISOString(),
    mode: state.mode,
    calibrated: !!state.homography,
    shots: [], bounces: [], durationS: 0,
    drill: state.drill ? { zone: state.drill.zone, hits: 0, attempts: 0 } : null,
  };
  state.running = true;
  state.lastPoseT = 0;
  $('btnStart').textContent = '■ Oprește și salvează';
  $('btnStart').classList.add('stop');
  setStatus('Analiză în curs…');
  speak('Analiza a început');

  if (state.mode === 'upload') {
    if (video.ended) video.currentTime = 0;
    video.playbackRate = 1;
    await video.play();
    video.onended = () => stopAnalysis(true);
  }
  loop();
}

function loop() {
  if (!state.running) return;
  const schedule = video.requestVideoFrameCallback
    ? cb => video.requestVideoFrameCallback(cb)
    : cb => (state.rafId = requestAnimationFrame(() => cb(performance.now(), { mediaTime: video.currentTime })));
  schedule((_now, meta) => { processFrame(meta.mediaTime * 1000); loop(); });
}

function processFrame(tMs) {
  if (!state.running || !video.videoWidth) return;
  const W = video.videoWidth, H = video.videoHeight;

  // 1. mingea (fiecare cadru)
  const ballPt = state.ball.process(video, W, H, tMs);

  // 2. pose (poate fi rărit pe telefoane lente)
  let shot = null;
  const poseInterval = settings.fastAnalysis ? 66 : 0;
  if (tMs - state.lastPoseT >= poseInterval) {
    state.lastPoseT = tMs;
    const lm = state.pose.detect(video, tMs);
    if (lm) {
      shot = state.swing.update(lm, tMs, W, H);
      state.lastLandmarks = lm;
    }
  }

  // 3. lovitură nouă detectată
  if (shot) {
    shot = SwingDetector.maybeVolley(shot, state.homography);
    shot.ballSpeedKmh = state.ball.speedAround(tMs, state.homography);
    shot.thumb = captureThumb();
    delete shot.frame;
    state.session.shots.push(shot);
    const label = SHOT_LABELS[shot.type];
    setStatus(`${label} — swing ${fmtSpeed(shot.speedKmh, settings.units)}${shot.ballSpeedKmh ? `, minge ${fmtSpeed(shot.ballSpeedKmh, settings.units)}` : ''}`);
    if (state.mode === 'live') speak(label);
    flashBadge(label, SHOT_COLORS[shot.type]);
  }

  // 4. bounce-uri noi -> arbitraj IN/OUT + drill
  const known = state.session.bounces.length;
  if (state.ball.bounces.length > known) {
    for (const b of state.ball.bounces.slice(known)) {
      const rec = { t: b.t, x: b.x, y: b.y, cx: null, cy: null, call: null };
      if (state.homography) {
        const c = state.homography.apply(b);
        if (c && c.x > -6 && c.x < Court.WIDTH_DOUBLES + 6 && c.y > -8 && c.y < Court.LENGTH + 8) {
          rec.cx = +c.x.toFixed(2); rec.cy = +c.y.toFixed(2);
          rec.call = Court.call(c.x, c.y, settings.lineMode) ? 'in' : 'out';
          if (rec.call === 'out' && state.mode === 'live') speak('Aut!');
          if (state.drill) checkDrillHit(rec);
        }
      }
      state.session.bounces.push(rec);
    }
  }

  drawOverlay(ballPt);
  state.session.durationS = Math.max(state.session.durationS, tMs / 1000);
}

function drawOverlay(ballPt) {
  octx.clearRect(0, 0, overlay.width, overlay.height);
  // schelet simplificat
  const lm = state.lastLandmarks;
  if (lm) {
    const P = i => ({ x: lm[i].x * overlay.width, y: lm[i].y * overlay.height });
    const bones = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28]];
    octx.strokeStyle = 'rgba(74,222,128,.8)'; octx.lineWidth = 2.5;
    for (const [a, b] of bones) {
      if ((lm[a].visibility ?? 1) < 0.3 || (lm[b].visibility ?? 1) < 0.3) continue;
      const pa = P(a), pb = P(b);
      octx.beginPath(); octx.moveTo(pa.x, pa.y); octx.lineTo(pb.x, pb.y); octx.stroke();
    }
  }
  // traiectoria mingii (ultimele ~0.7s)
  const now = state.ball.track.length ? state.ball.track[state.ball.track.length - 1].t : 0;
  const trail = state.ball.track.filter(p => now - p.t < 700);
  if (trail.length > 1) {
    octx.strokeStyle = 'rgba(250,204,21,.9)'; octx.lineWidth = 3;
    octx.beginPath();
    trail.forEach((p, i) => i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y));
    octx.stroke();
  }
  if (ballPt) {
    octx.fillStyle = '#facc15';
    octx.beginPath(); octx.arc(ballPt.x, ballPt.y, 6, 0, 7); octx.fill();
  }
}

function captureThumb() {
  try {
    const c = document.createElement('canvas');
    const scale = 160 / video.videoWidth;
    c.width = 160; c.height = Math.round(video.videoHeight * scale);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.5);
  } catch { return null; }
}

function flashBadge(text, color) {
  const b = $('shotBadge');
  b.textContent = text;
  b.style.background = color;
  b.classList.add('show');
  clearTimeout(flashBadge._t);
  flashBadge._t = setTimeout(() => b.classList.remove('show'), 1200);
}

function stopAnalysis(save) {
  state.running = false;
  cancelAnimationFrame(state.rafId);
  if (state.mode === 'upload') video.pause();
  $('btnStart').textContent = '▶ Începe analiza';
  $('btnStart').classList.remove('stop');
  if (save && state.session && state.session.shots.length + state.session.bounces.length > 0) {
    if (state.drill) {
      state.session.drill = { zone: state.drill.zone, hits: state.drill.hits, attempts: state.drill.attempts };
    }
    saveSession(state.session);
    const s = summarize(state.session);
    setStatus(`Sesiune salvată: ${s.total} lovituri. Vezi tab-ul „Rezultate".`);
    speak(`Sesiune încheiată. ${s.total} lovituri.`);
    state.viewSession = state.session;
    showTab('results');
  } else if (save) {
    setStatus('Analiză oprită — nu s-a detectat nicio lovitură, sesiunea nu a fost salvată.');
  }
}

function stopEverything() {
  state.running = false;
  cancelAnimationFrame(state.rafId);
  if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
  state.calibPoints = [];
  state.homography = null;
  state.lastLandmarks = null;
  octx.clearRect(0, 0, overlay.width, overlay.height);
}

/* ---------------- Rezultate + highlights ---------------- */
function renderResults(session) {
  const box = $('resultsBody');
  if (!session || !session.shots) {
    box.innerHTML = '<p class="muted">Nicio sesiune activă. Analizează un video sau pornește modul live.</p>';
    return;
  }
  const s = summarize(session);
  box.innerHTML = `
    <div class="statgrid">
      <div class="stat"><b>${s.total}</b><span>Lovituri</span></div>
      <div class="stat"><b>${fmtSpeed(s.avgSpeed, settings.units)}</b><span>Swing mediu</span></div>
      <div class="stat"><b>${fmtSpeed(s.maxSpeed, settings.units)}</b><span>Swing maxim${s.maxType ? ` (${SHOT_LABELS[s.maxType]})` : ''}</span></div>
      <div class="stat"><b>${s.inCalls} / ${s.outCalls}</b><span>IN / OUT</span></div>
    </div>
    ${session.drill ? `<div class="drillResult">🎯 Antrenament: <b>${session.drill.hits}</b> din <b>${session.drill.attempts}</b> mingi în zona țintă</div>` : ''}
    <h3>Distribuția loviturilor</h3><canvas id="chartBar" class="chart"></canvas>
    <h3>Viteza pe parcursul sesiunii</h3><canvas id="chartSpeed" class="chart"></canvas>
    <h3>Harta bounce-urilor ${session.calibrated ? '' : '<small class="muted">(necesită calibrarea terenului)</small>'}</h3>
    <canvas id="chartCourt" class="courtmap"></canvas>
    <h3>Highlights (${session.shots.length})</h3>
    <div id="highlights" class="highlights"></div>
    <div class="row">
      <button id="btnCSV" class="secondary">⬇ Export CSV</button>
    </div>`;
  drawShotBar($('chartBar'), s.counts);
  drawSpeedLine($('chartSpeed'), session.shots, settings.units);
  drawCourtMap($('chartCourt'), session.bounces);
  renderHighlights(session);
  $('btnCSV').addEventListener('click', () => downloadText(`acevision_${session.id}.csv`, toCSV(session)));
}

function renderHighlights(session) {
  const wrap = $('highlights');
  wrap.innerHTML = '';
  const sameVideo = session === state.session && state.mode === 'upload' && video.src;
  session.shots.forEach((shot, i) => {
    const card = document.createElement('div');
    card.className = 'hl';
    card.innerHTML = `
      ${shot.thumb ? `<img src="${shot.thumb}" alt="">` : '<div class="noThumb">🎾</div>'}
      <div class="hlInfo">
        <b style="color:${SHOT_COLORS[shot.type]}">${SHOT_LABELS[shot.type]}</b>
        <span>${(shot.t / 1000).toFixed(1)}s · ${fmtSpeed(shot.speedKmh, settings.units)}${shot.ballSpeedKmh ? ` · minge ${fmtSpeed(shot.ballSpeedKmh, settings.units)}` : ''}</span>
      </div>
      ${sameVideo ? `<div class="hlBtns">
        <button data-act="jump" data-i="${i}">▶</button>
        <button data-act="slow" data-i="${i}">🐢</button>
        <button data-act="clip" data-i="${i}">⬇</button>
      </div>` : ''}`;
    wrap.appendChild(card);
  });
  wrap.onclick = async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const shot = session.shots[+btn.dataset.i];
    if (btn.dataset.act === 'jump') { jumpTo(shot.t, 1); }
    if (btn.dataset.act === 'slow') { jumpTo(shot.t, 0.25); }
    if (btn.dataset.act === 'clip') { btn.disabled = true; await exportClip(shot); btn.disabled = false; }
  };
}

function jumpTo(tMs, rate) {
  showTab('analyze');
  if (state.running) stopAnalysis(false);
  video.currentTime = Math.max(0, tMs / 1000 - 1.5);
  video.playbackRate = rate;
  video.play();
  const stopAt = tMs / 1000 + 2;
  const check = () => {
    if (video.currentTime >= stopAt) { video.pause(); video.playbackRate = 1; }
    else if (!video.paused) requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

/* Export clip: redăm segmentul prin canvas.captureStream + MediaRecorder */
async function exportClip(shot) {
  if (!('MediaRecorder' in window)) { setStatus('Browserul nu suportă exportul de clipuri.', true); return; }
  setStatus('Se exportă clipul…');
  const start = Math.max(0, shot.t / 1000 - 2), end = shot.t / 1000 + 2;
  const c = document.createElement('canvas');
  c.width = video.videoWidth; c.height = video.videoHeight;
  const cx = c.getContext('2d');
  const streamOut = c.captureStream(30);
  const mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
  const rec = new MediaRecorder(streamOut, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(res => (rec.onstop = res));

  video.pause(); video.currentTime = start;
  await new Promise(res => (video.onseeked = res));
  rec.start(200);
  video.playbackRate = 1; video.play();
  await new Promise(res => {
    const draw = () => {
      cx.drawImage(video, 0, 0);
      if (video.currentTime >= end || video.ended) { res(); }
      else requestAnimationFrame(draw);
    };
    draw();
  });
  video.pause(); rec.stop();
  await done;
  const blob = new Blob(chunks, { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `highlight_${SHOT_LABELS[shot.type]}_${(shot.t / 1000).toFixed(0)}s.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus('Clip exportat ✔');
}

function downloadText(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name; a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- Istoric ---------------- */
function renderHistory() {
  const wrap = $('historyBody');
  const sessions = listSessions();
  if (!sessions.length) { wrap.innerHTML = '<p class="muted">Nicio sesiune salvată încă.</p>'; return; }
  wrap.innerHTML = '';
  // progres: viteza medie pe ultimele sesiuni
  const prog = document.createElement('div');
  prog.innerHTML = '<h3>Progres — swing mediu pe sesiuni</h3><canvas class="chart" id="progChart"></canvas>';
  wrap.appendChild(prog);
  const progShots = sessions.slice(0, 12).reverse()
    .map(se => ({ type: 'forehand', speedKmh: summarize(se).avgSpeed }))
    .filter(x => x.speedKmh);
  drawSpeedLine($('progChart'), progShots, settings.units);

  sessions.forEach(se => {
    const s = summarize(se);
    const d = new Date(se.date);
    const card = document.createElement('div');
    card.className = 'histCard';
    card.innerHTML = `
      <div>
        <b>${d.toLocaleDateString('ro-RO')} ${d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</b>
        <span class="muted">${se.mode === 'live' ? '📹 Live' : '🎞 Video'} · ${Math.round(se.durationS / 60)} min · ${s.total} lovituri · max ${fmtSpeed(s.maxSpeed, settings.units)}</span>
      </div>
      <div class="hlBtns">
        <button data-open="${se.id}">Vezi</button>
        <button data-del="${se.id}" class="danger">✕</button>
      </div>`;
    wrap.appendChild(card);
  });
  wrap.onclick = e => {
    const open = e.target.closest('button[data-open]');
    const del = e.target.closest('button[data-del]');
    if (open) {
      state.viewSession = listSessions().find(x => x.id === open.dataset.open);
      showTab('results');
    }
    if (del && confirm('Ștergi această sesiune?')) {
      deleteSession(del.dataset.del); renderHistory();
    }
  };
}

/* ---------------- Modul antrenament (drill-uri) ---------------- */
const DRILLS = [
  { id: 'deep-cross', name: 'Adâncime pe diagonală', zone: { half: 'departe', depth: 'lung', third: 'dreapta' }, desc: 'Trimite mingi lungi, în colțul din dreapta al terenului advers.' },
  { id: 'deep-line', name: 'Lung de linie', zone: { half: 'departe', depth: 'lung', third: 'stânga' }, desc: 'Lovituri adânci pe culoarul din stânga.' },
  { id: 'short-center', name: 'Scurtă la centru', zone: { half: 'departe', depth: 'scurt', third: 'centru' }, desc: 'Mingi scurte în careul de serviciu central.' },
];

function renderDrills() {
  const wrap = $('drillList');
  wrap.innerHTML = '';
  DRILLS.forEach(dr => {
    const card = document.createElement('div');
    card.className = 'histCard';
    card.innerHTML = `<div><b>🎯 ${dr.name}</b><span class="muted">${dr.desc}</span></div>
      <button data-drill="${dr.id}">${state.drill?.id === dr.id ? 'Activ ✔' : 'Activează'}</button>`;
    wrap.appendChild(card);
  });
  const preview = $('drillPreview');
  drawCourtMap(preview, [], { highlightZone: state.drill?.zone });
  wrap.onclick = e => {
    const btn = e.target.closest('button[data-drill]');
    if (!btn) return;
    const dr = DRILLS.find(d => d.id === btn.dataset.drill);
    state.drill = state.drill?.id === dr.id ? null : { ...dr, hits: 0, attempts: 0 };
    $('drillStatus').textContent = state.drill
      ? `Drill activ: ${dr.name}. Pornește analiza (cu terenul calibrat) și primești feedback vocal la fiecare minge.`
      : 'Niciun drill activ.';
    renderDrills();
  };
}

function checkDrillHit(bounce) {
  const z = Court.zone(bounce.cx, bounce.cy);
  const t = state.drill.zone;
  state.drill.attempts++;
  const hit = z.half === t.half && z.depth === t.depth && z.third === t.third;
  if (hit) { state.drill.hits++; speak('Țintă!'); }
  else speak(z.depth === 'scurt' && t.depth === 'lung' ? 'Prea scurt' : 'Ratat');
  $('drillStatus').textContent = `Drill: ${state.drill.hits}/${state.drill.attempts} în țintă`;
}

/* ---------------- Setări ---------------- */
function bindSettings() {
  const set = (id, key, evt = 'change', map = v => v) => {
    const el = $(id);
    if (key === 'handed') el.value = settings.handed;
    el.addEventListener(evt, () => {
      settings[key] = map(el.type === 'checkbox' ? el.checked : el.value);
      saveSettings(settings);
    });
  };
  $('setHanded').value = settings.handed;
  $('setUnits').value = settings.units;
  $('setLineMode').value = settings.lineMode;
  $('setVoice').checked = settings.voice;
  $('setFast').checked = settings.fastAnalysis;
  $('setBallSens').value = settings.ballSensitivity;
  $('setSwingSens').value = settings.swingSensitivity;
  set('setHanded', 'handed');
  set('setUnits', 'units');
  set('setLineMode', 'lineMode');
  set('setVoice', 'voice');
  set('setFast', 'fastAnalysis');
  set('setBallSens', 'ballSensitivity', 'input', Number);
  set('setSwingSens', 'swingSensitivity', 'input', Number);
}

/* ---------------- Init ---------------- */
bindSettings();
renderDrills();
showTab('analyze');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
