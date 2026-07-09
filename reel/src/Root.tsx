import React from 'react';
import {Composition} from 'remotion';
import {Reel} from './Reel';
import {FPS, totalFrames} from './data';

export const Root: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={totalFrames()}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
