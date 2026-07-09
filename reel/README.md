# Remotion reel edit

Editare automată a reelului din `assets/source.mp4`:
- pauzele din vorbire tăiate (51s -> ~31s), cu punch-in/out pe fiecare tăietură
- captions cu 2 cuvinte pe rând (Archivo Black, accente roz)
- hook animat roz ("PIERZI BANI?" + script "fără reclame…") în stilul referinței
- ken-burns zoom, flash-uri pe tăieturi, vignetă, color grade, muzică discretă pe fundal

## Rulare

```bash
npm install
cp assets/source.mp4 public/source.mp4
cp ../italy-italian-background-music-395012.mp3 public/music.mp3
node render.mjs out/reel-final.mp4
```

Rezultatul final este `reel-final.mp4`. Segmentele, textul captions și hook-ul se editează în `src/data.ts`.
