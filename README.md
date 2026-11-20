# Neon Coast — Cover Studio

[![make.fun competition](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2e7e)](https://make.fun/c/gta6-cover-art-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A web app that turns your own photos into GTA-style multi-panel cover art and
exports it as a PNG to share. Built for the
[make.fun gta6-cover-art-01 bounty](https://make.fun/c/gta6-cover-art-01).

## What it does

- Six-panel full-bleed poster: hero centre-top, cast role chip (`THE DRIVER`,
  `THE BOSS`…) and place + time chip on every panel
- Title **over the art** — striped yellow → pink → purple gradient lettering
  with a thick dark outline — plus a neon script subtitle, press quote,
  WANTED stars, VOL chip, EST. 2026 seal, Collector's Edition ribbon and a
  film billing strip with barcode
- Three layouts: Vice Grid, Pop-Out Hero (the hero photo breaks the grid) and
  Slant Cut (diagonal panel dividers)
- Any photo: drop your own photos in, drag to position each panel, scroll to
  zoom, edit every role, place, time and caption
- Four sunset grades with warmth / saturation / vignette / grain controls
- One-click PNG export in 1080 × 1080, 1080 × 1350 and 1920 × 1080
- Undo / redo, auto-fill cast, offline — photos never leave your machine

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Sample photos were made with an image model for this app. Lettering uses
Anton and Pacifico under the SIL Open Font License (see `app/fonts/`).

Referral: [Neon Coast on make.fun](https://make.fun/r/amzcd6wq)
