#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build and run FFmpeg command to apply cinematic visual effects
to clip.mp4 — matching the Casa Visului luxury real estate brand.
"""
import subprocess, os, sys, tempfile

FFMPEG   = "/tmp/ffmpeg"
INPUT    = "clip.mp4"
OUTPUT   = "clip_edited.mp4"

# ── Video specs ──────────────────────────────────────────────
W, H     = 478, 850
DURATION = 51.25          # seconds
BAR_H    = int(H * 0.095) # cinematic bars  (~80 px)

# ── Fonts ────────────────────────────────────────────────────
F_SERIF      = "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"
F_SERIF_REG  = "/usr/share/fonts/truetype/freefont/FreeSerif.ttf"
F_SANS       = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
F_SANS_BOLD  = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

# ── Text colour palette (hex, no #) ─────────────────────────
C_GOLD      = "e0c878"
C_GOLD2     = "c9a84c"
C_BLUSH     = "e8d5c4"
C_WHITE_DIM = "c8bfae"

# ── Layout ───────────────────────────────────────────────────
# Visible area: y=BAR_H … y=(H-BAR_H)  i.e. 80..770
# We place text in the bottom 20% of the visible area.
TEXT_X  = int(W * 0.08)      # 38 px left margin
BODY_Y  = H - BAR_H - 38     # baseline for body text  (732)
TITLE_Y = H - BAR_H - 60     # baseline for title      (710)
LINE_Y  = H - BAR_H - 78     # gold decorative rule    (692)
TAG_Y   = H - BAR_H - 35     # tag / location          (735)

# ── Caption timeline  (fraction of total duration) ───────────
# Each tuple: (start_frac, duration_sec, text, style)
CAPTIONS = [
    (0.06,  3.0,  "Casa Visului",                               "title"),
    (0.18,  2.8,  "76 mp² de libertate",                  "body"),
    (0.30,  2.8,  "Lumina devine parte din cameră",        "body"),
    (0.42,  2.8,  "Un ritual zilnic de lux",                   "body"),
    (0.54,  2.8,  "Cel mai bun somn din viața ta",        "body"),
    # two-line title — same start/end, offset Y
    (0.68,  3.0,  "Acasă înseamnă mai mult",   "title"),
    (0.68,  3.0,  "decât patru pereți",              "title2"),
    (0.82,  2.5,  "O EXPERIENȚĂ IMOBILIARĂ",   "tag"),
    (0.91,  2.2,  "București  ·  2026",             "location"),
]

# ── Helper: write text to a temp file (avoids shell escaping) ─
_tmpfiles = []
def txt_file(s):
    f = tempfile.NamedTemporaryFile(mode='w', suffix='.txt',
                                    encoding='utf-8', delete=False)
    f.write(s); f.close()
    _tmpfiles.append(f.name)
    return f.name

# ── Helper: alpha fade-in / fade-out expression ──────────────
def alpha(S, E, fi=0.40, fo=0.38):
    return (
        f"if(between(t,{S},{E}),"
        f"min(if(lt(t,{S+fi}),(t-{S})/{fi},1),"
        f"if(gt(t,{E-fo}),({E}-t)/{fo},1)),0)"
    )

# ── Helper: slide-up Y expression for titles ─────────────────
def slide_y(base_y, S, fi=0.40, rise=18):
    return (
        f"({base_y}+if(lt(t,{S+fi}),{rise}*(1-(t-{S})/{fi}),0))"
    )

# ── Build filter chain ───────────────────────────────────────
flt = []

# 1. COLOUR GRADE — warm, cinematic, lifted blacks
#    Reds boosted, greens neutral, blues cut in shadows
flt.append(
    "curves="
    "r='0/0.04 0.25/0.29 0.5/0.54 0.75/0.81 1/1':"
    "g='0/0.02 0.25/0.265 0.5/0.51 0.75/0.76 1/0.97':"
    "b='0/0 0.25/0.21 0.5/0.45 0.75/0.64 1/0.88'"
)

# 2. SATURATION + slight gamma warm push
flt.append("eq=saturation=1.14:brightness=0.012:gamma_r=1.06:gamma_b=0.91")

# 3. VIGNETTE — dark oval edges
flt.append("vignette=PI/3.2:eval=frame")

# 4. FILM GRAIN — temporal + uniform
flt.append("noise=alls=11:allf=t+u")

# 5. SCAN LINES — very subtle horizontal darkening (every 3rd row)
flt.append(
    "geq="
    "r='r(X,Y)*(1-0.055*eq(mod(Y,3),0))':"
    "g='g(X,Y)*(1-0.055*eq(mod(Y,3),0))':"
    "b='b(X,Y)*(1-0.055*eq(mod(Y,3),0))'"
)

# 6. CINEMATIC BARS (black, top + bottom)
flt.append(f"drawbox=x=0:y=0:w=iw:h={BAR_H}:color=black:t=fill")
flt.append(f"drawbox=x=0:y=ih-{BAR_H}:w=iw:h={BAR_H}:color=black:t=fill")

# 7. CAPTIONS
for (frac, dur, text, style) in CAPTIONS:
    S = round(frac * DURATION, 3)
    E = round(S + dur, 3)
    a = alpha(S, E)

    # write text to temp file so UTF-8 special chars are safe
    tf = txt_file(text)

    if style == "title":
        # gold decorative rule above text
        flt.append(
            f"drawbox=x={TEXT_X}:y={LINE_Y}"
            f":w=44:h=2:color=0x{C_GOLD2}:t=fill"
            f":enable='between(t,{S},{E})'"
        )
        # slide-up Y expression
        sy = slide_y(TITLE_Y, S)
        flt.append(
            f"drawtext=textfile='{tf}'"
            f":fontfile='{F_SERIF}'"
            f":fontsize=44:fontcolor=0x{C_GOLD}@1"
            f":shadowcolor=black@0.88:shadowx=2:shadowy=3"
            f":x={TEXT_X}:y='{sy}'"
            f":alpha='{a}'"
            f":enable='between(t,{S},{E})'"
        )

    elif style == "title2":
        sy = slide_y(TITLE_Y + 52, S, rise=14)
        flt.append(
            f"drawtext=textfile='{tf}'"
            f":fontfile='{F_SERIF_REG}'"
            f":fontsize=36:fontcolor=0x{C_GOLD}@1"
            f":shadowcolor=black@0.88:shadowx=2:shadowy=3"
            f":x={TEXT_X}:y='{sy}'"
            f":alpha='{a}'"
            f":enable='between(t,{S},{E})'"
        )

    elif style == "body":
        flt.append(
            f"drawtext=textfile='{tf}'"
            f":fontfile='{F_SANS}'"
            f":fontsize=27:fontcolor=0x{C_BLUSH}@1"
            f":shadowcolor=black@0.85:shadowx=1:shadowy=2"
            f":x={TEXT_X}:y={BODY_Y}"
            f":alpha='{a}'"
            f":enable='between(t,{S},{E})'"
        )

    elif style == "tag":
        flt.append(
            f"drawbox=x={TEXT_X - 10}:y={TAG_Y - 22}"
            f":w=iw*0.84:h=30:color=0x0a0f1e@0.65:t=fill"
            f":enable='between(t,{S},{E})'"
        )
        flt.append(
            f"drawtext=textfile='{tf}'"
            f":fontfile='{F_SANS_BOLD}'"
            f":fontsize=16:fontcolor=0x{C_GOLD2}@1"
            f":shadowcolor=black@0.7:shadowx=1:shadowy=1"
            f":x={TEXT_X}:y={TAG_Y}"
            f":alpha='{a}'"
            f":enable='between(t,{S},{E})'"
        )

    elif style == "location":
        flt.append(
            f"drawtext=textfile='{tf}'"
            f":fontfile='{F_SANS}'"
            f":fontsize=15:fontcolor=0x{C_WHITE_DIM}@1"
            f":shadowcolor=black@0.75:shadowx=1:shadowy=1"
            f":x={TEXT_X}:y={TAG_Y + 4}"
            f":alpha='{a}'"
            f":enable='between(t,{S},{E})'"
        )

# ── Assemble and run ─────────────────────────────────────────
vf_str = ",\n".join(flt)

cmd = [
    FFMPEG, "-y",
    "-i", INPUT,
    "-vf", vf_str,
    "-c:v", "libx264", "-preset", "slow", "-crf", "17",
    "-c:a", "copy",
    "-movflags", "+faststart",
    OUTPUT,
]

print("=== FFmpeg filter chain ===")
for i, f in enumerate(flt):
    print(f"  [{i:02d}] {f[:80]}...")
print(f"\n=== Running (this will take ~2-4 min) ===\n")

try:
    proc = subprocess.run(
        cmd, cwd="/home/user/Shotstack-api-music",
        stderr=subprocess.STDOUT, text=True,
        capture_output=False
    )
    if proc.returncode == 0:
        size = os.path.getsize(OUTPUT)
        print(f"\n✓ Done → {OUTPUT}  ({size/1e6:.1f} MB)")
    else:
        print(f"\n✗ FFmpeg exited with code {proc.returncode}")
finally:
    for f in _tmpfiles:
        try: os.unlink(f)
        except: pass
