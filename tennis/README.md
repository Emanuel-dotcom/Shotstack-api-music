# 🎾 AceVision — Analiză AI pentru tenis, pe telefonul tău

Aplicație web progresivă (PWA) de analiză video pentru tenis, inspirată de aplicațiile
comerciale de tip „AI tennis coach". Rulează **100% local, în browserul telefonului** —
niciun video nu părăsește dispozitivul, fără abonamente, fără cont.

## Funcții

| Funcție | Detalii |
| --- | --- |
| 🏃 Detectarea corpului | MediaPipe Pose (Google), 33 de puncte, direct pe telefon |
| 🎾 Urmărirea mingii | Algoritm propriu: culoare + mișcare + predicție de traiectorie |
| 🎯 Clasificarea loviturilor | Forehand, backhand, serviciu, smash, voleu |
| ⚡ Viteze | Viteza swing-ului (din pose) și a mingii (după calibrare) |
| 📐 Calibrarea terenului | Atingi 4 colțuri → homografie pixeli ↔ metri (dimensiuni ITF) |
| 🟢 Arbitraj IN/OUT | Detectarea bounce-urilor + verdict pe teren de simplu sau dublu |
| 🗺 Harta bounce-urilor | Vedere de sus a terenului cu toate căderile mingii |
| 📊 Statistici | Distribuția loviturilor, viteza medie/maximă, grafice de progres |
| 🎬 Highlights | Listă de lovituri cu thumbnail, redare lentă, export clip video |
| 🎯 Antrenament ghidat | Drill-uri cu zone țintă și feedback vocal în română după fiecare minge |
| 📅 Istoric | Sesiuni salvate local + grafic de progres, export CSV |
| 📹 Două moduri | Analiză video încărcat sau cameră live în timp real |
| 📴 Offline | După prima încărcare funcționează fără internet (service worker) |

## Cum o pui pe telefon

Aplicația are nevoie doar de un hosting static cu HTTPS. Cel mai simplu, gratuit,
este GitHub Pages:

1. În repo, mergi la **Settings → Pages**.
2. La „Source" alege **Deploy from a branch**, branch-ul dorit, folderul `/ (root)`.
3. După 1–2 minute aplicația e disponibilă la
   `https://<utilizator>.github.io/<repo>/tennis/`.
4. Deschide adresa pe telefon în Chrome (Android) sau Safari (iPhone) →
   meniul browserului → **„Adaugă la ecranul principal"**. Gata — apare ca o
   aplicație normală, cu iconiță și ecran complet.

> Camera live cere HTTPS — de aceea nu merge deschizând fișierul direct
> (`file://`). Pentru test local: `npx http-server tennis/` pe calculator.

## Cum filmezi pentru rezultate bune

- Telefonul **în spatele liniei de fund**, ridicat la 2–3 m (trepied, gard),
  în modul peisaj, cu **tot terenul în cadru** — unghiul „ca la TV".
- Calibrează terenul (cele 4 colțuri ale terenului de dublu) — fără asta nu
  există arbitraj IN/OUT, hartă sau viteza mingii.
- Setează mâna dominantă în Setări, altfel forehand/backhand pot fi inversate.
- Lumină bună, fără filmare contra soarelui; pe telefoane lente activează
  „Analiză rapidă".

## Limitări oneste

Aceasta este o reconstrucție open-source cu tehnologii de browser, nu un clon
identic al aplicațiilor comerciale antrenate pe milioane de lovituri:

- Urmărirea mingii depinde mult de calitatea video (contrast, rezoluție, 30+ fps).
  Mingi foarte rapide pot fi pierdute între cadre.
- Arbitrajul IN/OUT are o precizie de ordinul centimetrilor–zecilor de centimetri,
  în funcție de calibrare și unghiul camerei — e un ajutor de antrenament, nu
  un arbitru de meci oficial.
- Viteza swing-ului e estimată din scheletul 2D (scala = trunchiul jucătorului),
  deci e orientativă, consecventă cu ea însăși — perfectă pentru progres, nu
  pentru recorduri absolute.
- Analiza urmărește un singur jucător (cel mai vizibil în cadru).

## Arhitectură

```
tennis/
├── index.html      — interfața (mobile-first, română)
├── js/app.js       — controlerul: analiză, calibrare, highlights, drill-uri
├── js/vision.js    — homografie, model teren ITF, urmărire minge, detectare lovituri
├── js/stats.js     — stocare sesiuni (localStorage), grafice canvas
├── sw.js           — service worker (offline)
├── manifest.json   — instalare PWA
└── icon*.{svg,png} — iconițe
```

Fără framework-uri, fără build — JavaScript modern pur. Singura dependență
externă este modelul MediaPipe Pose, încărcat de pe CDN și apoi ținut în cache
pentru offline.
