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
} from "remotion";

const PHOTOS = [
  { src: staticFile("photos/photo1.jpg"), label: "MINDSET" },
  { src: staticFile("photos/photo2.jpg"), label: "VISION" },
  { src: staticFile("photos/photo3.jpg"), label: "FOCUS" },
  { src: staticFile("photos/photo4.webp"), label: "GRIND" },
  { src: staticFile("photos/photo5.jpg"), label: "HUSTLE" },
  { src: staticFile("photos/photo6.jpg"), label: "EMPIRE" },
  { src: staticFile("photos/photo7.jpg"), label: "SUCCESS" },
];

const SLIDE_DURATION = 45; // frames per slide at 30fps = 1.5s each

function PhotoSlide({ photo, localFrame, totalFrames }) {
  const { fps } = useVideoConfig();

  const scale = interpolate(localFrame, [0, totalFrames], [1.05, 1.18], {
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(localFrame, [0, 8, totalFrames - 8, totalFrames], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });

  const labelProgress = spring({
    frame: localFrame - 6,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const labelY = interpolate(labelProgress, [0, 1], [30, 0]);
  const labelOpacity = interpolate(labelProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Photo with Ken Burns zoom */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={photo.src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>

      {/* Dark cinematic overlay */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Slide label */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 220,
        }}
      >
        <div
          style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: 10,
            color: "rgba(255,255,255,0.92)",
            textTransform: "uppercase",
            transform: `translateY(${labelY}px)`,
            opacity: labelOpacity,
            textShadow: "0 2px 24px rgba(0,0,0,0.7)",
          }}
        >
          {photo.label}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function BusinessTitle({ frame, fps }) {
  // Intro: big BUSINESS stamp at frame 0
  const stampProgress = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 200, mass: 1.2 },
  });

  const scale = interpolate(stampProgress, [0, 1], [2.2, 1]);
  const opacity = interpolate(stampProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        fontFamily: "'Arial Black', Arial, sans-serif",
        fontSize: 120,
        fontWeight: 900,
        letterSpacing: 6,
        color: "#FFD700",
        textTransform: "uppercase",
        transform: `scale(${scale})`,
        opacity,
        textShadow: "0 0 40px rgba(255,215,0,0.6), 0 4px 0 rgba(0,0,0,0.8)",
        WebkitTextStroke: "2px rgba(0,0,0,0.4)",
      }}
    >
      BUSINESS
    </div>
  );
}

function GoldLine({ frame, fps, delay = 0 }) {
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 100 },
  });
  const width = interpolate(progress, [0, 1], [0, 220]);

  return (
    <div
      style={{
        height: 3,
        width,
        background: "linear-gradient(90deg, #FFD700, #FFA500)",
        borderRadius: 2,
        boxShadow: "0 0 12px rgba(255,215,0,0.8)",
      }}
    />
  );
}

function IntroScreen({ frame, fps }) {
  const bgOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const exitOpacity = interpolate(
    frame,
    [SLIDE_DURATION * 0.7, SLIDE_DURATION],
    [1, 0],
    { extrapolateRight: "clamp" }
  );

  const subtitleProgress = spring({
    frame: frame - 18,
    fps,
    config: { damping: 16, stiffness: 100 },
  });
  const subtitleY = interpolate(subtitleProgress, [0, 1], [20, 0]);
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: "#000",
        opacity: bgOpacity * exitOpacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      {/* Gold top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
        }}
      />

      <GoldLine frame={frame} fps={fps} delay={4} />
      <BusinessTitle frame={frame} fps={fps} />
      <GoldLine frame={frame} fps={fps} delay={8} />

      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 12,
          color: "rgba(255,255,255,0.85)",
          textTransform: "uppercase",
          marginTop: 12,
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        }}
      >
        IT'S A LIFESTYLE
      </div>

      {/* Gold bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
        }}
      />
    </AbsoluteFill>
  );
}

function OutroScreen({ frame, fps, startFrame }) {
  const localFrame = frame - startFrame;
  const progress = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const opacity = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const scale = interpolate(progress, [0, 1], [0.85, 1]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0a0a0a 0%, #1a1000 100%)",
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 5,
          background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
        }}
      />

      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 90,
            fontWeight: 900,
            color: "#FFD700",
            letterSpacing: 4,
            textShadow: "0 0 50px rgba(255,215,0,0.5), 0 4px 0 rgba(0,0,0,0.9)",
            WebkitTextStroke: "2px rgba(0,0,0,0.4)",
          }}
        >
          BUSINESS
        </div>
        <div
          style={{
            width: 200,
            height: 3,
            background: "linear-gradient(90deg, transparent, #FFD700, transparent)",
          }}
        />
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 8,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase",
          }}
        >
          BUILD YOUR EMPIRE
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          background: "linear-gradient(90deg, #FFD700, #FFA500, #FFD700)",
        }}
      />
    </AbsoluteFill>
  );
}

export function BusinessVideo() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Layout: intro (45f) + 7 slides (45f each) + outro (60f)
  const INTRO_FRAMES = SLIDE_DURATION;
  const OUTRO_START = INTRO_FRAMES + PHOTOS.length * SLIDE_DURATION;
  const OUTRO_FRAMES = 60;

  // Which photo slide are we on
  const photoFrame = frame - INTRO_FRAMES;
  const currentSlide = Math.floor(photoFrame / SLIDE_DURATION);
  const localSlideFrame = photoFrame % SLIDE_DURATION;

  const isIntro = frame < INTRO_FRAMES;
  const isOutro = frame >= OUTRO_START;
  const isPhotoSection = !isIntro && !isOutro;

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {/* Music */}
      <Audio src={staticFile("music.mp3")} volume={0.65} />

      {/* Intro */}
      {isIntro && <IntroScreen frame={frame} fps={fps} />}

      {/* Photo slides */}
      {isPhotoSection &&
        PHOTOS.map((photo, i) => {
          const slideStart = i * SLIDE_DURATION;
          const slideEnd = slideStart + SLIDE_DURATION;
          const inRange = photoFrame >= slideStart && photoFrame < slideEnd;
          // Show current + next for cross-fade
          const isNext =
            i === currentSlide + 1 &&
            localSlideFrame >= SLIDE_DURATION - 10;

          if (!inRange && !isNext) return null;

          const localFrame = photoFrame - slideStart;

          return (
            <PhotoSlide
              key={i}
              photo={photo}
              localFrame={localFrame}
              totalFrames={SLIDE_DURATION}
            />
          );
        })}

      {/* Persistent BUSINESS watermark during photo section */}
      {isPhotoSection && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 80,
          }}
        >
          <div
            style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: 8,
              color: "rgba(255,215,0,0.9)",
              textTransform: "uppercase",
              textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 30px rgba(255,215,0,0.4)",
            }}
          >
            BUSINESS
          </div>
        </AbsoluteFill>
      )}

      {/* Outro */}
      {isOutro && (
        <OutroScreen frame={frame} fps={fps} startFrame={OUTRO_START} />
      )}

      {/* Cinematic letterbox bars */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 55,
          background: "#000",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 55,
          background: "#000",
        }}
      />
    </AbsoluteFill>
  );
}
