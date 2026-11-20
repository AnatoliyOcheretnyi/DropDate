# DropDate brand mark

The DD monogram. `brand/*.svg` are the masters; everything shipped in
`apps/` is rasterised from them, so edit the SVG and re-render — never touch the
PNGs by hand.

## Construction

Two Ds on one geometry, the second offset by 62 units. The back D is **knocked
out** where the front D crosses it (`mask`, front path stroked at 44 against a
22 stroke, i.e. 11 units of air each side). That gap is what keeps the two
letters apart at favicon size and in the single-colour Android layer — an
opacity fade merges them into one blob.

Colours: `#73F0C1` front, `#3C9E7E` back, `#070C13` tile. The web accent won
over mobile's `#5AF0B4`; the two are now the same green.

## Rendering

Rasterise with **resvg**, not `qlmanage`. QuickLook composites SVG onto white,
which silently produced opaque white squares for every transparent asset —
including the monochrome Android layer, which was then white on white.

```sh
npm i @resvg/resvg-js
node -e "const{Resvg}=require('@resvg/resvg-js'),fs=require('fs');
fs.writeFileSync('out.png',new Resvg(fs.readFileSync('dd-mark.svg','utf8'),
{fitTo:{mode:'width',value:1024}}).render().asPng())"
```

`apps/mobile/assets/images/icon.png`, `android-icon-background.png` and
`apps/frontend/app/icon.png` additionally have their alpha channel stripped:
App Store Connect rejects an icon that carries one, even when every pixel is
opaque.

## Where each master lands

| Master | Ships as |
| --- | --- |
| `dd-mark.svg` | `frontend/public/logo.png`, `logo.svg` — brand exports |
| `dd-tile.svg` | `frontend/app/icon.png`, `public/icon.svg`, `public/apple-touch-icon.svg` |
| `dd-app-icon.svg` | `mobile/assets/images/icon.png` — iOS and the store listing |
| `dd-android-*.svg` | the three adaptive-icon layers |
| `dd-splash*.svg` | `splash-icon.png` (dark theme), `splash-icon-light.png` |
| `dd-tile-rounded.svg` | `mobile/assets/images/favicon.png` |

The web header and footer do **not** use a raster: they render
`src/shared/ui/BrandMark.tsx` inline, so the mark stays transparent on the glass
chip and crisp at any density.
