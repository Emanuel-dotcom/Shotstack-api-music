/* =========================================================================
   vision.js — Motorul de analiză video AceVision
   - Homography: mapare pixeli video -> metri pe teren (calibrare 4 puncte)
   - CourtModel: dimensiunile oficiale ale terenului + arbitraj IN/OUT
   - BallTracker: detectarea mingii (culoare + mișcare) și a bounce-urilor
   - SwingDetector: detectarea și clasificarea loviturilor din pose landmarks
   - PoseEngine: wrapper peste MediaPipe Pose Landmarker
   ========================================================================= */

/* ---------------- Homography (DLT cu 4 puncte) ---------------- */
export class Homography {
  constructor(m) { this.m = m; } // matrice 3x3 ca array de 9

  // src: 4 puncte {x,y} în pixeli video; dst: 4 puncte {x,y} în metri teren
  static from4Points(src, dst) {
    // Sistem liniar 8x8: A * h = b, h = primele 8 elemente ale matricei H
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const { x, y } = src[i];
      const { x: u, y: v } = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const h = Homography._solve(A, b);
    if (!h) return null;
    return new Homography([h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]);
  }

  static _solve(A, b) {
    // Eliminare gaussiană cu pivotare parțială
    const n = b.length;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++)
        if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      if (Math.abs(M[piv][col]) < 1e-10) return null;
      [M[col], M[piv]] = [M[piv], M[col]];
      for (let r = 0; r < n; r++) {
        if (r === col) continue;
        const f = M[r][col] / M[col][col];
        for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
      }
    }
    return M.map((row, i) => row[n] / row[i]);
  }

  apply(pt) {
    const m = this.m;
    const w = m[6] * pt.x + m[7] * pt.y + m[8];
    if (Math.abs(w) < 1e-10) return null;
    return {
      x: (m[0] * pt.x + m[1] * pt.y + m[2]) / w,
      y: (m[3] * pt.x + m[4] * pt.y + m[5]) / w,
    };
  }
}

/* ---------------- Modelul terenului (dimensiuni ITF, în metri) ----------------
   Origine: colțul apropiat-stânga al terenului de DUBLU.
   Axa X: lățimea (0 .. 10.97), Axa Y: lungimea (0 .. 23.77), fileul la y = 11.885 */
export const Court = {
  LENGTH: 23.77,
  WIDTH_DOUBLES: 10.97,
  WIDTH_SINGLES: 8.23,
  SINGLES_MARGIN: (10.97 - 8.23) / 2, // 1.37 m alee pe fiecare parte
  NET_Y: 23.77 / 2,
  SERVICE_DIST: 6.40, // linia de serviciu, față de fileu

  // Punctele de calibrare cerute utilizatorului (ordine fixă):
  calibrationPoints: [
    { label: 'Colț APROPIAT-STÂNGA (dublu)', x: 0, y: 0 },
    { label: 'Colț APROPIAT-DREAPTA (dublu)', x: 10.97, y: 0 },
    { label: 'Colț DEPĂRTAT-DREAPTA (dublu)', x: 10.97, y: 23.77 },
    { label: 'Colț DEPĂRTAT-STÂNGA (dublu)', x: 0, y: 23.77 },
  ],

  // Arbitraj: mingea e IN dacă bounce-ul cade în teren (cu toleranță în metri).
  call(x, y, mode = 'singles', tol = 0.06) {
    const xMin = mode === 'singles' ? Court.SINGLES_MARGIN : 0;
    const xMax = mode === 'singles' ? Court.SINGLES_MARGIN + Court.WIDTH_SINGLES : Court.WIDTH_DOUBLES;
    const inX = x >= xMin - tol && x <= xMax + tol;
    const inY = y >= -tol && y <= Court.LENGTH + tol;
    return inX && inY;
  },

  // În ce zonă a căzut mingea (pentru heatmap și drill-uri)
  zone(x, y) {
    const half = y < Court.NET_Y ? 'aproape' : 'departe';
    const yFromNet = Math.abs(y - Court.NET_Y);
    const depth = yFromNet < Court.SERVICE_DIST ? 'scurt' : 'lung';
    const third = x < Court.WIDTH_DOUBLES / 3 ? 'stânga' : x < (2 * Court.WIDTH_DOUBLES) / 3 ? 'centru' : 'dreapta';
    return { half, depth, third };
  },
};

/* ---------------- Urmărirea mingii ----------------
   Strategie: lucrăm pe un cadru redimensionat (lățime PROC_W). Combinăm:
   1. diferența dintre cadre consecutive (mișcare)
   2. scor de culoare galben-verzui (mingea de tenis)
   Apoi căutăm blob-ul mic cel mai puternic și îl urmărim cu predicție de viteză. */
const PROC_W = 320;

export class BallTracker {
  constructor() {
    this.canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(PROC_W, 180) : document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.prev = null;
    this.track = [];        // istoricul pozițiilor {t, x, y} în pixeli sursă
    this.bounces = [];      // bounce-uri detectate {t, x, y} în pixeli sursă
    this.lost = 0;
    this.sensitivity = 1;   // 0.5 .. 2, din setări
  }

  reset() { this.prev = null; this.track = []; this.bounces = []; this.lost = 0; }

  process(source, srcW, srcH, tMs) {
    const h = Math.max(2, Math.round((PROC_W * srcH) / srcW));
    if (this.canvas.height !== h) { this.canvas.height = h; this.prev = null; }
    this.ctx.drawImage(source, 0, 0, PROC_W, h);
    const cur = this.ctx.getImageData(0, 0, PROC_W, h);
    let best = null;
    if (this.prev) best = this._findBall(this.prev.data, cur.data, PROC_W, h);
    this.prev = cur;
    if (!best) { this.lost++; return null; }
    this.lost = 0;

    const scale = srcW / PROC_W;
    this.scale = scale;
    const pt = { t: tMs, x: best.x * scale, y: best.y * scale };
    this.track.push(pt);
    if (this.track.length > 240) this.track.shift();
    this._checkBounce();
    return pt;
  }

  _findBall(prev, cur, w, h) {
    const diffTh = 28 / this.sensitivity;
    // Restrângem căutarea în jurul ultimei poziții cunoscute (în coordonate
    // de procesare); raza crește cu fiecare cadru în care mingea e pierdută.
    let px = null, py = null, searchR = 1e9;
    const n = this.track.length;
    if (n >= 1 && this.lost < 8 && this.scale) {
      const a = this.track[n - 1];
      px = a.x / this.scale; py = a.y / this.scale;
      searchR = 60 + this.lost * 25;
    }

    let sx = 0, sy = 0, sw = 0, count = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = (y * w + x) * 4;
        const dr = Math.abs(cur[i] - prev[i]);
        const dg = Math.abs(cur[i + 1] - prev[i + 1]);
        const db = Math.abs(cur[i + 2] - prev[i + 2]);
        const motion = dr + dg + db;
        if (motion < diffTh) continue;
        const r = cur[i], g = cur[i + 1], b = cur[i + 2];
        // scor de culoare: mingea e galben-verzuie și luminoasă
        let colorScore = 0;
        if (g > 90 && r > 80 && g >= b + 20 && r >= b - 10) colorScore = (g - b) + (r - b) * 0.5;
        const score = motion * 0.4 + colorScore * 1.6;
        if (score < 60 / this.sensitivity) continue;
        if (px !== null) {
          const d = Math.hypot(x - px, y - py);
          if (d > searchR) continue;
        }
        sx += x * score; sy += y * score; sw += score; count++;
      }
    }
    // blob prea mare = probabil jucătorul, nu mingea
    if (!sw || count < 2 || count > 260) return null;
    return { x: sx / sw, y: sy / sw };
  }

  /* Bounce = minimul local al traiectoriei pe verticală (y crește în jos:
     mingea coboară, atinge y maxim, apoi urcă). Cerem viteze semnificative
     pe ambele ramuri și spațiere minimă între bounce-uri. */
  _checkBounce() {
    const tr = this.track;
    const n = tr.length;
    if (n < 5) return;
    const c = tr[n - 3]; // candidatul (cu 2 puncte de confirmare după el)
    const before = tr[n - 5], after = tr[n - 1];
    const dtB = c.t - before.t, dtA = after.t - c.t;
    if (dtB <= 0 || dtA <= 0 || dtB > 400 || dtA > 400) return;
    const vyB = (c.y - before.y) / dtB; // >0 = coboară
    const vyA = (after.y - c.y) / dtA;  // <0 = urcă
    if (vyB > 0.05 && vyA < -0.03 && c.y >= tr[n - 4].y && c.y >= tr[n - 2].y) {
      const last = this.bounces[this.bounces.length - 1];
      if (!last || c.t - last.t > 700) this.bounces.push({ t: c.t, x: c.x, y: c.y });
    }
  }

  // Viteza mingii (km/h) în jurul momentului tMs, în coordonate teren (necesită homography)
  speedAround(tMs, H, windowMs = 220) {
    if (!H) return null;
    const pts = this.track.filter(p => Math.abs(p.t - tMs) <= windowMs);
    if (pts.length < 3) return null;
    const speeds = [];
    for (let i = 1; i < pts.length; i++) {
      const a = H.apply(pts[i - 1]), b = H.apply(pts[i]);
      const dt = (pts[i].t - pts[i - 1].t) / 1000;
      if (!a || !b || dt <= 0) continue;
      const v = Math.hypot(b.x - a.x, b.y - a.y) / dt; // m/s
      if (v > 1 && v < 70) speeds.push(v);
    }
    if (speeds.length < 2) return null;
    speeds.sort((a, b) => a - b);
    const med = speeds[Math.floor(speeds.length / 2)];
    return Math.round(med * 3.6);
  }
}

/* ---------------- Detectarea și clasificarea loviturilor ----------------
   Intrare: landmark-uri MediaPipe Pose (33 puncte, coordonate normalizate).
   Detectăm vârfuri de viteză ale încheieturii mâinii dominante; la vârf
   clasificăm după poziția încheieturii față de corp și cap. */
const LM = { NOSE: 0, L_SHOULDER: 11, R_SHOULDER: 12, L_ELBOW: 13, R_ELBOW: 14,
             L_WRIST: 15, R_WRIST: 16, L_HIP: 23, R_HIP: 24, L_ANKLE: 27, R_ANKLE: 28 };

export class SwingDetector {
  constructor({ handed = 'right' } = {}) {
    this.handed = handed;
    this.hist = [];          // {t, wrist:{x,y}, nose, midSh, shL, shR, midHip, ankles}
    this.lastShotT = -1e9;
    this.minSpeed = 1.0;     // viteză minimă normalizată/s pt. un swing (ajustabil)
    this.pending = null;     // vârf în așteptare de confirmare
    this.fastCount = 0;      // cadre consecutive peste prag (anti-jitter)
  }

  update(landmarks, tMs, videoW, videoH) {
    if (!landmarks || landmarks.length < 33) return null;
    const g = i => ({ x: landmarks[i].x * videoW, y: landmarks[i].y * videoH, v: landmarks[i].visibility ?? 1 });
    const wrist = this.handed === 'right' ? g(LM.R_WRIST) : g(LM.L_WRIST);
    if (wrist.v < 0.35) return null;
    const shL = g(LM.L_SHOULDER), shR = g(LM.R_SHOULDER);
    const hipL = g(LM.L_HIP), hipR = g(LM.R_HIP);
    const frame = {
      t: tMs, wrist,
      nose: g(LM.NOSE),
      shL, shR,
      midSh: { x: (shL.x + shR.x) / 2, y: (shL.y + shR.y) / 2 },
      midHip: { x: (hipL.x + hipR.x) / 2, y: (hipL.y + hipR.y) / 2 },
      ankles: { l: g(LM.L_ANKLE), r: g(LM.R_ANKLE) },
    };
    this.hist.push(frame);
    if (this.hist.length > 90) this.hist.shift();
    return this._detect(frame);
  }

  _detect(cur) {
    const n = this.hist.length;
    if (n < 4) return null;
    const prev = this.hist[n - 3];
    const dt = (cur.t - prev.t) / 1000;
    if (dt <= 0 || dt > 0.5) return null;

    // Scara: distanța umăr-șold ≈ 0.52 m la un adult — ne dă pixeli/metru
    const torsoPx = Math.hypot(cur.midSh.x - cur.midHip.x, cur.midSh.y - cur.midHip.y);
    if (torsoPx < 8) return null;
    const pxPerM = torsoPx / 0.52;

    const distPx = Math.hypot(cur.wrist.x - prev.wrist.x, cur.wrist.y - prev.wrist.y);
    const speedMs = distPx / pxPerM / dt; // viteza încheieturii, m/s

    const THRESH = 5.0 * this.minSpeed; // ~18 km/h la încheietură = swing real

    if (speedMs > THRESH && cur.t - this.lastShotT > 900) {
      // cerem minim 2 cadre consecutive rapide, ca un vârf izolat de zgomot
      // (jitter al modelului de pose) să nu conteze drept lovitură
      this.fastCount++;
      if (this.fastCount >= 2 && (!this.pending || speedMs > this.pending.speedMs)) {
        this.pending = { t: cur.t, speedMs, frame: cur };
      }
    } else {
      this.fastCount = 0;
      if (this.pending && cur.t - this.pending.t > 180) {
        // vârful a trecut — confirmăm lovitura
        const shot = this._classify(this.pending);
        this.pending = null;
        this.lastShotT = shot.t;
        return shot;
      }
    }
    return null;
  }

  _classify({ t, speedMs, frame }) {
    const { wrist, nose, shL, shR, midSh } = frame;
    let type;
    if (wrist.y < nose.y) {
      // deasupra capului: serviciu dacă a existat o fază de pregătire lentă
      // cu mâna sus (aruncarea mingii), altfel smash
      const prep = this.hist.filter(f => t - f.t > 400 && t - f.t < 1600);
      const armUpLong = prep.length > 0 && prep.every(f => f.wrist.y < f.midSh.y);
      type = armUpLong ? 'serve' : 'smash';
    } else {
      // proiectăm încheietura pe axa umerilor; partea dominantă = forehand
      const axX = shR.x - shL.x, axY = shR.y - shL.y;
      const len2 = axX * axX + axY * axY || 1;
      const proj = ((wrist.x - midSh.x) * axX + (wrist.y - midSh.y) * axY) / len2;
      const dominantSide = this.handed === 'right' ? proj > 0 : proj < 0;
      type = dominantSide ? 'forehand' : 'backhand';
    }
    return { t, type, speedKmh: Math.round(speedMs * 3.6), frame };
  }

  // reclasifică un forehand/backhand în voleu dacă jucătorul e lângă fileu
  static maybeVolley(shot, H) {
    if (!H || (shot.type !== 'forehand' && shot.type !== 'backhand')) return shot;
    const { ankles } = shot.frame;
    const foot = { x: (ankles.l.x + ankles.r.x) / 2, y: (ankles.l.y + ankles.r.y) / 2 };
    const pos = H.apply(foot);
    if (pos && Math.abs(pos.y - Court.NET_Y) < 4.5 && pos.x > -3 && pos.x < Court.WIDTH_DOUBLES + 3) {
      return { ...shot, type: 'volley', baseType: shot.type };
    }
    return shot;
  }
}

/* ---------------- Motorul de pose (MediaPipe) ---------------- */
const MP_VERSION = '0.10.14';
const MP_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MP_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export class PoseEngine {
  constructor() { this.landmarker = null; this.loading = null; this.lastTs = -1; }

  async init() {
    if (this.landmarker) return;
    if (!this.loading) {
      this.loading = (async () => {
        const mod = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`);
        const files = await mod.FilesetResolver.forVisionTasks(MP_WASM);
        this.landmarker = await mod.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MP_MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      })();
    }
    await this.loading;
  }

  detect(video, tMs) {
    if (!this.landmarker) return null;
    // MediaPipe cere timestamp-uri strict crescătoare
    const ts = Math.max(Math.round(tMs), this.lastTs + 1);
    this.lastTs = ts;
    try {
      const res = this.landmarker.detectForVideo(video, ts);
      return res.landmarks && res.landmarks[0] ? res.landmarks[0] : null;
    } catch { return null; }
  }
}
