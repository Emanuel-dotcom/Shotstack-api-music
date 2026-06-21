import React from "react";
import { Composition } from "remotion";
import { BusinessVideo } from "./BusinessVideo";

// 300 frames = 10 seconds @ 30fps
export function RemotionRoot() {
  return (
    <Composition
      id="BusinessVideo"
      component={BusinessVideo}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
    />
  );
}
