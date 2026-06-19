import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const HOOK_LINE1 = 'Nimeni nu îți';
const HOOK_LINE2 = 'arată asta...';
const SHOW_UNTIL_FRAME = 120; // 4 seconds at 30fps

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame > SHOW_UNTIL_FRAME) return null;

  // Overall card fade-in
  const cardOpacity = spring({ frame, fps, config: { damping: 18, stiffness: 80 }, durationInFrames: 20 });

  // Line 1: chars reveal one by one (12 chars → 1 char / 3 frames)
  const CHARS_PER_FRAME = 1 / 3;
  const line1Chars = Math.min(HOOK_LINE1.length, Math.floor(frame * CHARS_PER_FRAME));
  const line2Start = Math.round(HOOK_LINE1.length / CHARS_PER_FRAME) + 6;
  const line2Chars = Math.min(HOOK_LINE2.length, Math.max(0, Math.floor((frame - line2Start) * CHARS_PER_FRAME)));

  // Fade out near end
  const fadeOut = frame > SHOW_UNTIL_FRAME - 15
    ? 1 - (frame - (SHOW_UNTIL_FRAME - 15)) / 15
    : 1;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 50 }}>
      <div
        style={{
          position: 'absolute',
          top: '6%',
          left: '5%',
          right: '5%',
          opacity: cardOpacity * fadeOut,
        }}
      >
        {/* Glass card */}
        <div
          style={{
            background: 'rgba(5, 5, 15, 0.82)',
            borderRadius: 20,
            padding: '22px 32px 22px 44px',
            position: 'relative',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Orange accent bar */}
          <div
            style={{
              position: 'absolute',
              left: 12,
              top: 18,
              bottom: 18,
              width: 5,
              borderRadius: 4,
              background: 'linear-gradient(180deg, #FF9800 0%, #FF5722 100%)',
            }}
          />
          {/* Hook text line 1 */}
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 56,
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: -1,
              lineHeight: 1.15,
              textShadow: '3px 4px 8px rgba(0,0,0,0.8)',
              whiteSpace: 'pre',
            }}
          >
            {HOOK_LINE1.slice(0, line1Chars)}
            {/* blinking cursor on line 1 */}
            {line1Chars < HOOK_LINE1.length && (
              <span style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0, color: '#FF9800' }}>|</span>
            )}
          </div>
          {/* Hook text line 2 */}
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: 56,
              fontWeight: 700,
              color: '#FFD54F',
              letterSpacing: -1,
              lineHeight: 1.15,
              textShadow: '3px 4px 8px rgba(0,0,0,0.8)',
              whiteSpace: 'pre',
            }}
          >
            {HOOK_LINE2.slice(0, line2Chars)}
            {/* cursor on line 2 */}
            {line2Chars > 0 && line2Chars < HOOK_LINE2.length && (
              <span style={{ opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0, color: '#FF9800' }}>|</span>
            )}
            {/* final underline when done */}
            {line2Chars >= HOOK_LINE2.length && (
              <span
                style={{
                  display: 'inline-block',
                  width: `${Math.min(1, (frame - (line2Start + HOOK_LINE2.length * 3)) / 8) * 100}%`,
                  height: 4,
                  background: 'linear-gradient(90deg, #FF9800, #FF5722)',
                  verticalAlign: 'middle',
                  borderRadius: 2,
                  marginLeft: 6,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
