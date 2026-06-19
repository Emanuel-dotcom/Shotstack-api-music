import React from 'react';
import { AbsoluteFill } from 'remotion';

/** Cinematic orange-teal matte — purely CSS, no ffmpeg needed */
export const ColorGrade: React.FC = () => (
  <>
    {/* CSS filter on a wrapper div — applies to everything below via mix-blend-mode */}
    {/* Vignette overlay */}
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.72) 100%)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
    {/* Warm tint overlay (orange-amber) */}
    <AbsoluteFill
      style={{
        background: 'rgba(255, 140, 30, 0.09)',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        zIndex: 11,
      }}
    />
    {/* Cool shadow overlay (teal in darks) */}
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse at center, transparent 30%, rgba(0,40,80,0.18) 100%)',
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        zIndex: 12,
      }}
    />
    {/* Film grain texture via CSS noise */}
    <AbsoluteFill
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
        backgroundSize: '180px 180px',
        opacity: 0.55,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        zIndex: 13,
      }}
    />
  </>
);
