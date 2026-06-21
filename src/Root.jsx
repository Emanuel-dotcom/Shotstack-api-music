import React from "react";
import { Composition } from "remotion";
import { BusinessVideo } from "./BusinessVideo";

// 7 slides × 45f + intro 45f + outro 60f = 420 frames total at 30fps = 14 seconds
const TOTAL_FRAMES = 45 + 7 * 45 + 60; // 420

export function RemotionRoot() {
  return (
    <Composition
      id="BusinessVideo"
      component={BusinessVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  );
}
