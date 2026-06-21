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

// ─── Constants ───────────────────────────────────────────────
const PHOTO = staticFile("photos/photo7.jpg");
const FPS = 30;
// 120 BPM → beat every 15 frames
const BEATS = Array.from({ length: 22 }, (_, i) => i * 15);

// Text slams: { frame, text, size, color, dir: "left"|"right"|"top"|"bottom" }
const TEXTS = [
  { frame: 0,   text: "BUSINESS",  size: 110, color: "#FFD700", dir: "bottom" },
  { frame: 60,  text: "MINDSET",   size: 72,  color: "#ffffff", dir: "left"   },
  { frame: 90,  text: "GRIND",     size: 96,  color: "#FFD700", dir: "right"  },
  { frame: 120, text: "HUSTLE",    size: 80,  color: "#ffffff", dir: "left"   },
  { frame: 150, text: "VISION",    size: 96,  color: "#FFD700", dir: "bottom" },
  { frame: 195, text: "EMPIRE",    size: 110, color: "#ffffff", dir: "top"    },
  { frame: 240, text: "NO DAYS",   size: 68,  color: "#FFD700", dir: "left"   },
  { frame: 255, text: "OFF",       size: 96,  color: "#ffffff", dir: "right"  },
  { frame: 270, text: "BUSINESS",  size: 120, color: "#FFD700", dir: "bottom" },
];

// ─── Utilities ────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function nearestBeatDist(frame) {
  return Math.min(...BEATS.map((b) => Math.abs(frame - b)));
}

function useShake(frame, active) {
  if (!active)  return { x: 0, y: 0 };
  const slot = Math.floor(frame / 2);
  return {
    x: (random(`sx${slot}`) - 0.5) * 28,
    y: (random(`sy${slot}`) - 0.5) * 28,
  };
}

// ─── White Flash ──────────────────────────────────────────────
function Flash({ frame }) {
  const dist = nearestBeatDist(frame);
  const opacity = interpolate(dist, [0, 5], [0.85, 0], { extrapolateRight: "clamp" });
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ background: "#fff", opacity, pointerEvents: "none" }} />
  );
}

// ─── Vignette ────────────────────────────────────────────────
function Vignette() {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)",
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Grain ───────────────────────────────────────────────────
function Grain({ frame }) {
  const seed = Math.floor(frame / 3);
  return (
    <AbsoluteFill
      style={{
        opacity: 0.06,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${seed}'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Gold Bars ───────────────────────────────────────────────
function GoldBars() {
  return (
    <>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:6,
        background:"linear-gradient(90deg,#FFD700,#FFA500,#FFD700)", zIndex:10 }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:6,
        background:"linear-gradient(90deg,#FFD700,#FFA500,#FFD700)", zIndex:10 }} />
    </>
  );
}

// ─── Text Slam ────────────────────────────────────────────────
function TextSlam({ frame, fps, item }) {
  const localF = frame - item.frame;
  if (localF < 0) return null;

  const duration = item.duration ?? 20;
  if (localF > duration + 6) return null;

  const enter = spring({ frame: localF, fps, config: { damping: 9, stiffness: 240, mass: 0.7 } });
  const exitT = clamp((localF - duration) / 6, 0, 1);
  const exitOpacity = 1 - exitT;

  // Entry direction
  const DIST = 300;
  const offsets = {
    left:   { x: interpolate(enter, [0,1], [-DIST, 0]), y: 0 },
    right:  { x: interpolate(enter, [0,1], [DIST, 0]),  y: 0 },
    top:    { x: 0, y: interpolate(enter, [0,1], [-DIST, 0]) },
    bottom: { x: 0, y: interpolate(enter, [0,1], [DIST, 0])  },
  };
  const { x, y } = offsets[item.dir] ?? offsets.bottom;

  const scale = interpolate(enter, [0, 0.6, 1], [1.4, 0.95, 1]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 8,
      }}
    >
      <div
        style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: item.size,
          fontWeight: 900,
          letterSpacing: item.size > 90 ? 6 : 10,
          color: item.color,
          textTransform: "uppercase",
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          opacity: exitOpacity,
          textShadow:
            item.color === "#FFD700"
              ? "0 0 40px rgba(255,215,0,0.7), 0 4px 0 rgba(0,0,0,0.9)"
              : "0 4px 0 rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.7)",
          WebkitTextStroke: "2px rgba(0,0,0,0.5)",
        }}
      >
        {item.text}
      </div>
    </AbsoluteFill>
  );
}

// ─── Main Composition ─────────────────────────────────────────
export function BusinessVideo() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Zoom logic ────────────────────────────────────────────
  // Base scale: dramatic intro (3.0 → 1.0 over first 20 frames)
  const introScale = interpolate(frame, [0, 20], [3.0, 1.0], { extrapolateRight: "clamp" });

  // Zoom pulse: at each beat, spike to +0.12 then decay
  let beatScale = 0;
  for (const beat of BEATS) {
    const d = frame - beat;
    if (d >= 0 && d < 12) {
      const pulse = interpolate(d, [0, 3, 12], [0, 0.12, 0]);
      beatScale = Math.max(beatScale, pulse);
    }
  }

  // Dramatic zoom sections
  const zoomIn1  = interpolate(frame, [120, 165], [1, 1.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoomOut1 = interpolate(frame, [165, 195], [1.6, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoomIn2  = interpolate(frame, [210, 255], [1.0, 1.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const zoomOut2 = interpolate(frame, [255, 285], [1.8, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const dramaticScale =
    frame < 120 ? 1 :
    frame < 165 ? zoomIn1 :
    frame < 195 ? zoomOut1 :
    frame < 210 ? 1 :
    frame < 255 ? zoomIn2 :
    zoomOut2;

  const finalScale = (frame < 20 ? introScale : 1.0) * dramaticScale * (1 + beatScale);

  // ── Shake ─────────────────────────────────────────────────
  const shakeActive =
    (frame >= 30 && frame < 60) ||
    (frame >= 105 && frame < 135) ||
    (frame >= 165 && frame < 195) ||
    (frame >= 255 && frame < 285);
  const { x: shakeX, y: shakeY } = useShake(frame, shakeActive);

  // ── B&W flicker ───────────────────────────────────────────
  const bwMoments = [[60, 90], [165, 180]];
  const isInBW = bwMoments.some(([s, e]) => frame >= s && frame < e);
  // Flicker within B&W moments
  const flickerSlot = Math.floor(frame / 4);
  const isBW = isInBW && random(`bw${flickerSlot}`) > 0.35;

  // ── Contrast boost at beat hits ───────────────────────────
  const beatDist = nearestBeatDist(frame);
  const contrastBoost = interpolate(beatDist, [0, 6], [1.6, 1.25], { extrapolateRight: "clamp" });

  const photoFilter = [
    `contrast(${contrastBoost})`,
    `brightness(1.1)`,
    `saturate(${isBW ? 0 : 1.3})`,
  ].join(" ");

  // ── Chromatic aberration (offset clone) ───────────────────
  const aberration = clamp(interpolate(beatDist, [0, 5], [6, 0], { extrapolateRight: "clamp" }), 0, 10);

  // ── Intro opacity ─────────────────────────────────────────
  const introOpacity = interpolate(frame, [0, 3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden", opacity: introOpacity }}>
      <Audio src={staticFile("music.mp3")} volume={0.7} />

      {/* ── Photo layer with all transforms ── */}
      <AbsoluteFill
        style={{
          transform: `translate(${shakeX}px, ${shakeY}px)`,
          overflow: "hidden",
        }}
      >
        {/* Chromatic aberration: red channel shifted */}
        {aberration > 0.5 && (
          <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.35 }}>
            <Img
              src={PHOTO}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center top",
                transform: `scale(${finalScale}) translateX(${aberration}px)`,
                filter: "saturate(0) sepia(1) hue-rotate(-20deg) brightness(1.5)",
              }}
            />
          </AbsoluteFill>
        )}

        {/* Main photo */}
        <AbsoluteFill>
          <Img
            src={PHOTO}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              transform: `scale(${finalScale})`,
              filter: photoFilter,
            }}
          />
        </AbsoluteFill>

        {/* Dark cinematic gradient */}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%)",
            pointerEvents: "none",
          }}
        />
      </AbsoluteFill>

      {/* ── Vignette ── */}
      <Vignette />

      {/* ── Grain ── */}
      <Grain frame={frame} />

      {/* ── Beat flashes ── */}
      <Flash frame={frame} />

      {/* ── Text slams ── */}
      {TEXTS.map((item, i) => (
        <TextSlam key={i} frame={frame} fps={fps} item={item} />
      ))}

      {/* ── Persistent BUSINESS watermark (top) ── */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 60,
          pointerEvents: "none",
          zIndex: 7,
        }}
      >
        <div
          style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: 10,
            color: "rgba(255,215,0,0.9)",
            textTransform: "uppercase",
            textShadow: "0 2px 20px rgba(0,0,0,0.9)",
            opacity: interpolate(frame, [5, 15], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          BUSINESS
        </div>
      </AbsoluteFill>

      {/* ── Gold bars ── */}
      <GoldBars />
    </AbsoluteFill>
  );
}
