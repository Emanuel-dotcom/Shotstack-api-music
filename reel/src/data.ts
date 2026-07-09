export const FPS = 30;

// Speech segments in source-video seconds. Pauses between them are cut.
// `text` is the sentence spoken inside the segment; word timings are
// distributed proportionally to word length within the segment.
export type Segment = {
  start: number;
  end: number;
  flash?: boolean;
  punch?: 'in' | 'out';
  text?: string;
};

export const SEGMENTS: Segment[] = [
  {
    start: 1.6,
    end: 4.26,
    punch: 'in',
    text: 'Dacă ai o afacere și nu faci reclame pierzi *bani',
  },
  {
    start: 4.74,
    end: 10.06,
    punch: 'out',
    flash: true,
    text: 'Da știu reclamele costă bani dar întotdeauna îți aduc *banii înapoi dacă le faci așa cum trebuie făcute',
  },
  {
    start: 13.63,
    end: 18.5,
    punch: 'in',
    text: 'Poți să ai cel mai bun *produs din lume dar dacă nimeni nu știe de el nimeni nu o să-l cumpere',
  },
  {
    start: 22.34,
    end: 27.48,
    punch: 'out',
    flash: true,
    text: 'Cu reclamele pe *Facebook poți să atragi clienți noi în 24 până la 48 de ore',
  },
  {start: 27.75, end: 28.88, punch: 'in', text: 'E atât de simplu'},
  {
    start: 29.21,
    end: 31.22,
    punch: 'out',
    text: 'Trebuie doar să știi cum să faci *reclama',
  },
  {
    start: 33.46,
    end: 35.41,
    punch: 'in',
    flash: true,
    text: 'Nu e magie e *marketing',
  },
  {
    start: 40.77,
    end: 43.43,
    punch: 'out',
    text: 'Dacă ai o afacere și vrei mai mulți *clienți',
  },
  {
    start: 43.64,
    end: 47.76,
    punch: 'in',
    flash: true,
    text: 'lasă un comentariu cu *ADS și îți explic acum cum funcționează',
  },
  // Outro: the hand covering the lens — no speech, no captions.
  {start: 49.75, end: 50.72, punch: 'out'},
];

export const segmentFrames = (s: Segment) =>
  Math.round((s.end - s.start) * FPS);

export const totalFrames = () =>
  SEGMENTS.reduce((acc, s) => acc + segmentFrames(s), 0);

export type Word = {text: string; start: number; end: number; accent?: boolean};

// Distribute each segment's words across its duration, weighted by length.
const buildWords = (): Word[] => {
  const words: Word[] = [];
  for (const seg of SEGMENTS) {
    if (!seg.text) continue;
    const tokens = seg.text.split(/\s+/);
    const speakStart = seg.start + 0.08;
    const speakEnd = seg.end - 0.12;
    const total = tokens.reduce((a, t) => a + t.replace('*', '').length + 1.5, 0);
    let cursor = speakStart;
    for (const raw of tokens) {
      const accent = raw.startsWith('*');
      const text = raw.replace('*', '');
      const dur = ((text.length + 1.5) / total) * (speakEnd - speakStart);
      words.push({text, start: cursor, end: cursor + dur, accent});
      cursor += dur;
    }
  }
  return words;
};

export const WORDS: Word[] = buildWords();

export const HOOK = {
  main: 'PIERZI BANI?',
  script: 'fără reclame…',
  showSeconds: 2.7,
};
