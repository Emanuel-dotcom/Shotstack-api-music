import { Composition } from 'remotion';
import { VideoEdit } from './VideoEdit';

// Speaking segments after silence removal (from silencedetect analysis)
export const SPEAKING_SEGMENTS: [number, number][] = [
  [0.000,  0.148],
  [1.823,  4.120],
  [4.972,  9.903],
  [13.859, 18.359],
  [22.519, 27.330],
  [27.980, 28.727],
  [29.440, 31.038],
  [33.678, 35.328],
  [40.989, 43.300],
  [43.868, 47.747],
  [49.964, 50.591],
];

export const FPS  = 30;
export const W    = 478;
export const H    = 850;

// Total duration of all speaking segments
const totalSec = SPEAKING_SEGMENTS.reduce((acc, [s, e]) => acc + (e - s), 0);
export const TOTAL_FRAMES = Math.round(totalSec * FPS);

export const RemotionRoot = () => (
  <Composition
    id="VideoEdit"
    component={VideoEdit}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{}}
  />
);
