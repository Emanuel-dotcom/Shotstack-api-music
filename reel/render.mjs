import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const entry = path.resolve('src/index.ts');

const serveUrl = await bundle({
  entryPoint: entry,
  publicDir: path.resolve('public'),
});

const composition = await selectComposition({
  serveUrl,
  id: 'Reel',
  browserExecutable: '/opt/pw-browsers/chromium',
  chromeMode: 'chrome-for-testing',
});

console.log(
  `Rendering ${composition.durationInFrames} frames (${(
    composition.durationInFrames / composition.fps
  ).toFixed(1)}s)`
);

await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  crf: 19,
  outputLocation: path.resolve(process.argv[2] ?? 'out/reel-final.mp4'),
  browserExecutable: '/opt/pw-browsers/chromium',
  chromeMode: 'chrome-for-testing',
  chromiumOptions: {gl: 'swangle'},
  concurrency: 4,
  frameRange: process.env.RANGE
    ? process.env.RANGE.split('-').map(Number)
    : undefined,
  onProgress: ({progress}) => {
    if (Math.round(progress * 100) % 10 === 0) {
      process.stdout.write(`\r${Math.round(progress * 100)}%`);
    }
  },
});

console.log('\nDone');
