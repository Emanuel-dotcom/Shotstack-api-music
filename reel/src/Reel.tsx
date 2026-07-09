import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {FPS, HOOK, SEGMENTS, WORDS, segmentFrames, totalFrames, Word} from './data';

const PINK = '#ff2fb2';
const PINK_DEEP = '#e6008f';

const FontFaces: React.FC = () => (
  <style>{`
    @font-face {
      font-family: 'Archivo Black';
      src: url('${staticFile('fonts/archivo-black-latin-400-normal.woff2')}') format('woff2');
      font-weight: 400;
    }
    @font-face {
      font-family: 'Archivo Black';
      src: url('${staticFile('fonts/archivo-black-latin-ext-400-normal.woff2')}') format('woff2');
      font-weight: 400;
      unicode-range: U+0100-024F, U+1E00-1EFF;
    }
    @font-face {
      font-family: 'Dancing Script';
      src: url('${staticFile('fonts/dancing-script-latin-700-normal.woff2')}') format('woff2');
      font-weight: 700;
    }
    @font-face {
      font-family: 'Dancing Script';
      src: url('${staticFile('fonts/dancing-script-latin-ext-700-normal.woff2')}') format('woff2');
      font-weight: 700;
      unicode-range: U+0100-024F, U+1E00-1EFF;
    }
    @font-face {
      font-family: 'Shrikhand';
      src: url('${staticFile('fonts/shrikhand-latin-400-normal.woff2')}') format('woff2');
      font-weight: 400;
    }
  `}</style>
);

// Cumulative start frame of each segment on the edited timeline.
const editedStarts = (() => {
  const starts: number[] = [];
  let acc = 0;
  for (const s of SEGMENTS) {
    starts.push(acc);
    acc += segmentFrames(s);
  }
  return starts;
})();

// Map a source-video timestamp (seconds) to a frame on the edited timeline.
const sourceToEdited = (t: number): number => {
  for (let i = 0; i < SEGMENTS.length; i++) {
    const s = SEGMENTS[i];
    if (t <= s.end) {
      const clamped = Math.max(t, s.start);
      return editedStarts[i] + Math.round((clamped - s.start) * FPS);
    }
  }
  const last = SEGMENTS.length - 1;
  return editedStarts[last] + segmentFrames(SEGMENTS[last]);
};

const SegmentClip: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seg = SEGMENTS[index];
  const durFrames = segmentFrames(seg);

  // Ken-burns: alternate slow zoom in / zoom out.
  const zoomIn = index % 2 === 0;
  const base = interpolate(
    frame,
    [0, durFrames],
    zoomIn ? [1.03, 1.11] : [1.13, 1.05],
    {extrapolateRight: 'clamp'}
  );

  // Punch on the cut (skip very first segment).
  let punch = 1;
  if (index > 0) {
    const p = spring({frame, fps, config: {damping: 14, stiffness: 160}, durationInFrames: 12});
    punch = seg.punch === 'out' ? interpolate(p, [0, 1], [0.92, 1]) : interpolate(p, [0, 1], [1.14, 1]);
  }

  // Gentle drift so the frame never feels static.
  const drift = Math.sin((editedStarts[index] + frame) / 55) * 6;

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile('source.mp4')}
        trimBefore={Math.round(seg.start * FPS)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${base * punch}) translateX(${drift}px)`,
          transformOrigin: '50% 32%',
          filter: 'contrast(1.06) saturate(1.14) brightness(1.02)',
        }}
      />
      {seg.flash && index > 0 ? (
        <AbsoluteFill
          style={{
            backgroundColor: 'white',
            opacity: interpolate(frame, [0, 4], [0.35, 0], {extrapolateRight: 'clamp'}),
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// Group words into captions of 2 words, timed on the edited timeline.
type Caption = {words: Word[]; from: number; to: number};
const buildCaptions = (): Caption[] => {
  const caps: Caption[] = [];
  for (let i = 0; i < WORDS.length; i += 2) {
    const group = WORDS.slice(i, i + 2);
    const from = sourceToEdited(group[0].start);
    const to = Math.max(sourceToEdited(group[group.length - 1].end), from + 4);
    caps.push({words: group, from, to});
  }
  // Extend each caption to meet the next one when the gap is tiny.
  for (let i = 0; i < caps.length - 1; i++) {
    if (caps[i + 1].from - caps[i].to <= 5) {
      caps[i].to = caps[i + 1].from;
    }
  }
  return caps;
};

const CAPTIONS = buildCaptions();

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const active = CAPTIONS.find((c) => frame >= c.from && frame < c.to);
  if (!active) return null;

  const local = frame - active.from;
  const pop = spring({frame: local, fps, config: {damping: 11, stiffness: 220}, durationInFrames: 8});
  const scale = interpolate(pop, [0, 1], [0.6, 1]);
  const idx = CAPTIONS.indexOf(active);
  const tilt = ((idx * 7919) % 5) - 2; // deterministic -2..2 deg
  // Sit higher while the hook occupies the bottom, drop to chest level after.
  const hookFrames = Math.round(HOOK.showSeconds * fps);
  const topRatio = frame < hookFrames ? 0.53 : 0.63;

  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: height * topRatio,
          display: 'flex',
          gap: 22,
          transform: `scale(${scale}) rotate(${tilt}deg)`,
          fontFamily: 'Archivo Black',
          fontSize: 82,
          textTransform: 'uppercase',
          textAlign: 'center',
          maxWidth: width * 0.92,
          justifyContent: 'center',
          flexWrap: 'wrap',
          lineHeight: 1.05,
        }}
      >
        {active.words.map((w, i) =>
          w.accent ? (
            <span
              key={i}
              style={{
                color: 'white',
                background: `linear-gradient(135deg, ${PINK_DEEP}, ${PINK})`,
                borderRadius: 22,
                padding: '2px 26px',
                transform: 'rotate(-2deg)',
                boxShadow: '0 10px 30px rgba(230,0,143,0.55), inset 0 -6px 0 rgba(0,0,0,0.18)',
                textShadow: '0 4px 10px rgba(0,0,0,0.35)',
              }}
            >
              {w.text}
            </span>
          ) : (
            <span
              key={i}
              style={{
                color: 'white',
                WebkitTextStroke: '10px black',
                paintOrder: 'stroke fill',
                textShadow: '0 8px 24px rgba(0,0,0,0.55)',
              }}
            >
              {w.text}
            </span>
          )
        )}
      </div>
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, height, width} = useVideoConfig();
  const showFrames = Math.round(HOOK.showSeconds * FPS);
  if (frame > showFrames) return null;

  const enter = spring({frame, fps, config: {damping: 10, stiffness: 120}, durationInFrames: 18});
  const exit = interpolate(frame, [showFrames - 8, showFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const float = Math.sin(frame / 9) * 6;
  const glow = 22 + Math.sin(frame / 5) * 12;
  const shimmer = (frame * 3) % 300;
  const scriptIn = spring({frame: frame - 8, fps, config: {damping: 12, stiffness: 140}, durationInFrames: 16});

  return (
    <AbsoluteFill style={{alignItems: 'center', pointerEvents: 'none', opacity: exit}}>
      <div
        style={{
          position: 'absolute',
          top: height * 0.66,
          width: width * 0.95,
          textAlign: 'center',
          transform: `scale(${interpolate(enter, [0, 1], [0.3, 1])}) translateY(${float}px) rotate(-3deg)`,
        }}
      >
        <div
          style={{
            fontFamily: 'Shrikhand',
            fontSize: 150,
            lineHeight: 0.95,
            backgroundImage: `linear-gradient(115deg, ${PINK_DEEP} 0%, ${PINK} 35%, #ff8ed6 ${shimmer / 3 + 40}%, ${PINK} 65%, ${PINK_DEEP} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            filter: `drop-shadow(0 0 ${glow}px rgba(255,47,178,0.85)) drop-shadow(0 6px 0 rgba(80,0,50,0.9))`,
          }}
        >
          {HOOK.main}
        </div>
        <div
          style={{
            fontFamily: 'Dancing Script',
            fontSize: 105,
            color: 'white',
            marginTop: -55,
            textShadow: '0 0 18px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.8)',
            transform: `translateX(${interpolate(scriptIn, [0, 1], [140, 60])}px) rotate(-4deg) scale(${interpolate(scriptIn, [0, 1], [0.5, 1])})`,
            opacity: scriptIn,
          }}
        >
          {HOOK.script}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Animated pink/blue light leaks in the corners — modern reel look.
const LightLeaks: React.FC = () => {
  const frame = useCurrentFrame();
  const x = Math.sin(frame / 40) * 120;
  const y = Math.cos(frame / 52) * 90;
  const pulse = 0.16 + Math.sin(frame / 22) * 0.05;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          left: -380 + x,
          top: -320 + y,
          background: 'radial-gradient(circle, rgba(255,47,178,0.9) 0%, rgba(255,47,178,0) 62%)',
          opacity: pulse,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 1000,
          right: -420 - x,
          bottom: -380 - y,
          background: 'radial-gradient(circle, rgba(80,120,255,0.9) 0%, rgba(80,120,255,0) 62%)',
          opacity: pulse * 0.9,
        }}
      />
    </AbsoluteFill>
  );
};

const GRAIN_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix type="saturate" values="0"/></filter><rect width="220" height="220" filter="url(#n)" opacity="0.5"/></svg>`
  );

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const ox = (frame * 37) % 220;
  const oy = (frame * 61) % 220;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        backgroundImage: `url("${GRAIN_URI}")`,
        backgroundPosition: `${ox}px ${oy}px`,
        opacity: 0.05,
      }}
    />
  );
};

// Thin pink progress bar at the top.
const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const total = totalFrames();
  const w = interpolate(frame, [0, total], [0, 100], {
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: 14,
        width: `${w}%`,
        background: `linear-gradient(90deg, ${PINK_DEEP}, ${PINK}, #ff8ed6)`,
        borderRadius: '0 7px 7px 0',
        boxShadow: `0 0 24px rgba(255,47,178,0.9)`,
      }}
    />
  );
};

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  const total = totalFrames();
  const fadeOut = interpolate(frame, [total - 12, total], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: 'black'}}>
      <FontFaces />
      {SEGMENTS.map((s, i) => (
        <Sequence key={i} from={editedStarts[i]} durationInFrames={segmentFrames(s)}>
          <SegmentClip index={i} />
        </Sequence>
      ))}
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.34) 100%)',
        }}
      />
      <LightLeaks />
      <Grain />
      <Captions />
      <Hook />
      <ProgressBar />
      <AbsoluteFill style={{backgroundColor: 'black', opacity: 1 - fadeOut, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
