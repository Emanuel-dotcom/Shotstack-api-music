import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { SPEAKING_SEGMENTS, FPS } from './Root';
import { ColorGrade } from './components/ColorGrade';
import { Hook } from './components/Hook';

/** One speaking segment of the original video */
const VideoSegment: React.FC<{
  src: string;
  segStart: number;
  segEnd: number;
  segIndex: number;
  localStartFrame: number;
}> = ({ src, segStart, segEnd, segIndex, localStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom-punch spring: scale 1.04 → 1.0 over first ~12 frames of each clip
  const zoomProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: 14,
  });
  const scale = 1.04 - 0.04 * zoomProgress;

  const segDurFrames = Math.round((segEnd - segStart) * fps);

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <OffthreadVideo
          src={src}
          startFrom={Math.round(segStart * fps)}
          endAt={Math.round(segEnd * fps)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'saturate(1.55) contrast(1.22) brightness(1.04)',
          }}
          pauseWhenBuffering
        />
      </div>
    </AbsoluteFill>
  );
};

export const VideoEdit: React.FC = () => {
  // staticFile resolves to http://localhost:3000/source_video.mp4 during render
  const videoSrc = staticFile('source_video.mp4');

  // Compute where each segment starts in the output timeline
  const segmentOffsets = useMemo(() => {
    const offsets: number[] = [];
    let cursor = 0;
    for (const [s, e] of SPEAKING_SEGMENTS) {
      offsets.push(cursor);
      cursor += Math.round((e - s) * FPS);
    }
    return offsets;
  }, []);

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* ── Video segments (silence-cut) ── */}
      {SPEAKING_SEGMENTS.map(([segStart, segEnd], i) => {
        const fromFrame = segmentOffsets[i];
        const durFrames = Math.round((segEnd - segStart) * FPS);
        return (
          <Sequence key={i} from={fromFrame} durationInFrames={durFrames} layout="none">
            <VideoSegment
              src={videoSrc}
              segStart={segStart}
              segEnd={segEnd}
              segIndex={i}
              localStartFrame={fromFrame}
            />
          </Sequence>
        );
      })}

      {/* ── Cinematic overlay: color grade, vignette, grain ── */}
      <ColorGrade />

      {/* ── Handwritten hook (first 4 seconds) ── */}
      <Hook />
    </AbsoluteFill>
  );
};
