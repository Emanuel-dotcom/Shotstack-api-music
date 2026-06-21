import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  random,
} from "remotion";

// ─── Font pool — 40 fonts, covers serif/sans/mono/display/handwriting ─────
const FONTS = [
  "Impact",
  "Arial Black",
  "'Times New Roman', serif",
  "'Courier New', monospace",
  "Georgia, serif",
  "Verdana, sans-serif",
  "Trebuchet MS, sans-serif",
  "Palatino Linotype, serif",
  "'Comic Sans MS', cursive",
  "Tahoma, sans-serif",
  "'Lucida Console', monospace",
  "'Book Antiqua', serif",
  "Garamond, serif",
  "Franklin Gothic Medium, sans-serif",
  "Century Gothic, sans-serif",
  "'Arial Narrow', sans-serif",
  "'MS Gothic', sans-serif",
  "Copperplate, fantasy",
  "Papyrus, fantasy",
  "'Segoe UI', sans-serif",
  "'Helvetica Neue', sans-serif",
  "Futura, sans-serif",
  "Rockwell, serif",
  "'Gill Sans', sans-serif",
  "Optima, sans-serif",
  "Didot, serif",
  "'Bodoni MT', serif",
  "Cambria, serif",
  "Calibri, sans-serif",
  "'Avant Garde', sans-serif",
  "Baskerville, serif",
  "'Brush Script MT', cursive",
  "'Lucida Handwriting', cursive",
  "Perpetua, serif",
  "Consolas, monospace",
  "'Monaco', monospace",
  "'Andale Mono', monospace",
  "Charcoal, sans-serif",
  "Geneva, sans-serif",
  "'Copperplate Gothic Bold', fantasy",
];

// Color pool cycling
const COLORS = [
  "#FFD700", "#ffffff", "#FF4444", "#00FF88",
  "#FF6B00", "#00D4FF", "#FF00FF", "#FFFF00",
  "#FF8C00", "#E0E0E0", "#FF3366", "#39FF14",
];

// Letter spacing pool
const SPACINGS = [2, 4, 8, 12, 16, 20, -2, 0, 24, 6];

// Font weight pool
const WEIGHTS = [100, 300, 400, 700, 800, 900];

// Text size variation
const SIZES = [80, 90, 100, 110, 120, 130, 140, 90, 75, 105];

// Words that flash through
const WORDS = [
  "BUSINESS", "GRIND", "HUSTLE", "MONEY", "VISION",
  "EMPIRE", "MINDSET", "WIN", "RICH", "FOCUS",
  "POWER", "SUCCESS", "GOALS", "ALPHA", "SIGMA",
  "BUSINESS", "BUILD", "RISE", "NO STOP", "BUSINESS",
];

// ─── shake util ──────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shake(frame, active, str = 1) {
  if (!active) return { x: 0, y: 0 };
  const s = Math.floor(frame / 2);
  return { x: (random(`sx${s}`) - 0.5) * 30 * str, y: (random(`sy${s}`) - 0.5) * 30 * str };
}

// ─── Flash ───────────────────────────────────────────────────
function Flash({ frame, beats }) {
  const dist = Math.min(...beats.map((b) => Math.abs(frame - b)));
  const opacity = clamp(interpolate(dist, [0, 4], [1, 0], { extrapolateRight: "clamp" }), 0, 1);
  if (opacity < 0.01) return null;
  return <AbsoluteFill style={{ background: "#fff", opacity, pointerEvents: "none", zIndex: 20 }} />;
}

// ─── The main rapid-font text ─────────────────────────────────
function RapidText({ frame }) {
  // Every 1 frame = new font, color, spacing, weight, size
  const fontIdx   = Math.floor(random(`f${frame}`) * FONTS.length);
  const colorIdx  = Math.floor(random(`c${frame}`) * COLORS.length);
  const spacingIdx= Math.floor(random(`s${frame}`) * SPACINGS.length);
  const weightIdx = Math.floor(random(`w${frame}`) * WEIGHTS.length);
  const sizeIdx   = Math.floor(random(`sz${frame}`) * SIZES.length);

  // Word changes every 8-15 frames
  const wordSlot  = Math.floor(frame / 8) % WORDS.length;
  const word      = WORDS[wordSlot];

  // Slight random position jitter every 3 frames
  const jSlot = Math.floor(frame / 3);
  const jx = (random(`jx${jSlot}`) - 0.5) * 40;
  const jy = (random(`jy${jSlot}`) - 0.5) * 40;

  // Random rotation every 5 frames (small tilt)
  const rSlot = Math.floor(frame / 5);
  const rot   = (random(`rot${rSlot}`) - 0.5) * 8;

  // Italic randomly
  const italic = random(`it${frame}`) > 0.65 ? "italic" : "normal";

  // Text shadow color also cycles
  const shadowColorIdx = Math.floor(random(`sh${frame}`) * COLORS.length);
  const shadowColor = COLORS[shadowColorIdx];

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 15,
      }}
    >
      <div
        style={{
          fontFamily: FONTS[fontIdx],
          fontSize: SIZES[sizeIdx],
          fontWeight: WEIGHTS[weightIdx],
          fontStyle: italic,
          letterSpacing: SPACINGS[spacingIdx],
          color: COLORS[colorIdx],
          textTransform: "uppercase",
          transform: `translate(${jx}px, ${jy}px) rotate(${rot}deg)`,
          textShadow: `0 0 30px ${shadowColor}, 0 4px 0 rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.5)`,
          WebkitTextStroke: `${random(`str${frame}`) > 0.5 ? 2 : 0}px rgba(0,0,0,0.6)`,
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </div>
    </AbsoluteFill>
  );
}

// ─── Static bold stamp (freezes for 1 sec at end) ────────────
function FinalStamp({ frame, startFrame }) {
  const localF = frame - startFrame;
  const progress = spring({ frame: localF, fps: 30, config: { damping: 8, stiffness: 300, mass: 0.6 } });
  const scale = interpolate(progress, [0, 1], [3, 1]);
  const opacity = clamp(localF / 6, 0, 1);

  return (
    <AbsoluteFill
      style={{
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 25,
        opacity,
      }}
    >
      <div style={{ position:"absolute", top:0, left:0, right:0, height:6,
        background:"linear-gradient(90deg,#FFD700,#FFA500,#FFD700)" }} />

      <div style={{
        transform: `scale(${scale})`,
        fontFamily: "Impact, 'Arial Black', sans-serif",
        fontSize: 130,
        fontWeight: 900,
        color: "#FFD700",
        letterSpacing: 8,
        textShadow: "0 0 60px rgba(255,215,0,0.8), 0 6px 0 rgba(0,0,0,1)",
        WebkitTextStroke: "3px rgba(0,0,0,0.5)",
      }}>
        BUSINESS
      </div>

      <div style={{
        fontFamily: "Verdana, sans-serif",
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: 12,
        color: "rgba(255,255,255,0.8)",
        textTransform: "uppercase",
      }}>
        IT'S A LIFESTYLE
      </div>

      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:6,
        background:"linear-gradient(90deg,#FFD700,#FFA500,#FFD700)" }} />
    </AbsoluteFill>
  );
}

// ─── Root composition ─────────────────────────────────────────
export function BusinessVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 300 frames total (10s)
  // Beats at 120 BPM → every 15 frames
  const BEATS = Array.from({ length: 22 }, (_, i) => i * 15);

  // Photo scale: zoom pulse on every beat
  let beatPulse = 0;
  for (const b of BEATS) {
    const d = frame - b;
    if (d >= 0 && d < 10) beatPulse = Math.max(beatPulse, interpolate(d, [0, 2, 10], [0.14, 0.14, 0], {}));
  }

  // Dramatic zoom in and out
  const zoomPhase =
    frame < 20  ? interpolate(frame, [0, 20], [2.5, 1.0], { extrapolateRight: "clamp" }) :
    frame < 150 ? 1.0 :
    frame < 200 ? interpolate(frame, [150, 200], [1.0, 1.7], { extrapolateRight: "clamp" }) :
    frame < 230 ? interpolate(frame, [200, 230], [1.7, 1.0], { extrapolateRight: "clamp" }) :
    1.0;

  const photoScale = zoomPhase * (1 + beatPulse);

  // Screen shake
  const shakeActive = (frame >= 30 && frame < 80) || (frame >= 160 && frame < 230) || (frame >= 255 && frame < 285);
  const { x: sx, y: sy } = shake(frame, shakeActive, 1.2);

  // Color grade: contrast + saturation pulses at beats
  const dist = Math.min(...BEATS.map((b) => Math.abs(frame - b)));
  const contrast = clamp(interpolate(dist, [0, 6], [1.7, 1.25], { extrapolateRight: "clamp" }), 1, 2);

  // B&W flicker windows
  const bwWindows = [[45, 75], [150, 180], [240, 260]];
  const inBW = bwWindows.some(([s, e]) => frame >= s && frame < e);
  const flickerSlot = Math.floor(frame / 3);
  const isBW = inBW && random(`bw${flickerSlot}`) > 0.3;

  const photoFilter = `contrast(${contrast}) brightness(1.1) saturate(${isBW ? 0 : 1.4})`;

  // Chromatic aberration on beat
  const aber = clamp(interpolate(dist, [0, 5], [8, 0], { extrapolateRight: "clamp" }), 0, 12);

  // Final stamp starts at frame 270
  const showStamp = frame >= 270;

  // Intro fade
  const introOpacity = clamp(frame / 4, 0, 1);

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden", opacity: introOpacity }}>
      <Audio src={staticFile("music.mp3")} volume={0.7} />

      {/* ── Photo ── */}
      <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)`, overflow: "hidden" }}>
        {/* Chromatic aberration clone */}
        {aber > 1 && (
          <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.3 }}>
            <Img src={staticFile("photos/photo7.jpg")}
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top",
                transform:`scale(${photoScale}) translateX(${aber}px)`,
                filter:"saturate(0) sepia(1) hue-rotate(-30deg) brightness(2)" }} />
          </AbsoluteFill>
        )}

        {/* Main photo */}
        <Img src={staticFile("photos/photo7.jpg")}
          style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top",
            transform:`scale(${photoScale})`, filter: photoFilter }} />

        {/* Cinematic gradient */}
        <AbsoluteFill style={{
          background:"linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.85) 100%)",
          pointerEvents:"none" }} />
      </AbsoluteFill>

      {/* ── Vignette ── */}
      <AbsoluteFill style={{
        background:"radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.8) 100%)",
        pointerEvents:"none", zIndex:5 }} />

      {/* ── Rapid font text (shown while not in final stamp) ── */}
      {!showStamp && <RapidText frame={frame} />}

      {/* ── Beat flashes ── */}
      <Flash frame={frame} beats={BEATS} />

      {/* ── Final stamp ── */}
      {showStamp && <FinalStamp frame={frame} startFrame={270} />}

      {/* ── Gold bars ── */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:5,
        background:"linear-gradient(90deg,#FFD700,#FFA500,#FFD700)", zIndex:30 }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:5,
        background:"linear-gradient(90deg,#FFD700,#FFA500,#FFD700)", zIndex:30 }} />
    </AbsoluteFill>
  );
}
