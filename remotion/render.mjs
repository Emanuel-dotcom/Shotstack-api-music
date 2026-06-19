import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHROMIUM = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const OUT      = path.join(__dirname, '..', 'final_reel.mp4');
const SRC_VID  = path.join(__dirname, '..', 'source_video.mp4');

console.log('📦  Bundling Remotion project...');
const bundleLocation = await bundle({
  entryPoint: path.join(__dirname, 'src/index.ts'),
  publicDir: path.join(__dirname, 'public'),
  webpackOverride: (config) => config,
});

console.log('🎬  Selecting composition...');
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: 'VideoEdit',
  browserExecutable: CHROMIUM,
});

console.log(`▶️   Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps ...`);
console.log(`     Output: ${OUT}`);

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: OUT,
  browserExecutable: CHROMIUM,
  chromiumOptions: {
    disableWebSecurity: true,
    gl: 'swiftshader',
    ignoreCertificateErrors: true,
  },
  concurrency: 4,
  videoBitrate: '4M',
  onProgress: ({ progress, renderedFrames, encodedFrames }) => {
    const pct = Math.round(progress * 100);
    process.stdout.write(`\r  ${pct}%  rendered=${renderedFrames}  encoded=${encodedFrames}    `);
  },
});

console.log(`\n✅  Done! → ${OUT}`);
