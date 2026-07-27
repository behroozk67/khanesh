# Design Reference — SiPhox Health + Function Health

Extracted 2026-07-27 for the Khanesh/LabMate redesign (Persian, RTL, Vazirmatn, light-only,
mobile-first, WCAG AA).

## How these values were obtained (so you can re-verify, not re-guess)

| Source | Method | Confidence |
|---|---|---|
| `siphoxhealth.com` | `curl` of the HTML + all 7 Next.js CSS bundles (`/_next/static/css/*.css`, 396 KB) — real CSS-module rules, real custom properties, real markup | **High.** Every hex/px below is quoted from shipped CSS. |
| `functionhealth.com` | WebFetch returns 403; plain `curl` with a desktop UA returns **HTTP 200**. Astro CSS bundles at `/_astro/*.css` (552 KB) contain their full token layer | **High for the marketing site.** |
| Function Health *dashboard* (`app.functionhealth.com`) | Auth-walled. Only reachable via third-party reviews/teardowns | **Low — narrative only.** Marked "unverified" throughout. No hex values invented for it. |

Not obtainable: `siphoxhealth.com/what-we-test` (404). SiPhox's real logged-in portal — but the
marketing page ships a pixel-faithful mock of it (`PortalHomeShowcase_*`, `ScoreRing_*`,
`TrackedMarkerRow_*`, `BiomarkerPill_*`), which is what most of section 4 is built from.

---

## 1. Color

### 1.1 SiPhox — brand + neutrals (verbatim from their `:root`)

| Token (theirs) | Hex | Role |
|---|---|---|
| `--primary`, `--primary-new` | `#3CBAB5` | brand teal, primary buttons, active states |
| `--secondary-new` | `#5FC7C0` | lighter teal |
| `--blue-1` | `#079E8E` | deep teal (gradient end) |
| `--bg-cta` | `#35C79C` | CTA green-teal |
| `--third`, `--orange-3/5` | `#F76C38` | accent orange (secondary brand mark) |
| `--orange-2` | `#FF8528` | orange highlight |
| `--black-1` | `#1A1A1A` | max ink |
| `--black-4` | `#0C2A33` | **heading ink** (used on nearly every section title) |
| `--text-primary` | `#284849` | body ink, teal-tinted |
| `--gray-4` | `#6B6B6B` | secondary text |
| `--gray-5` | `#818181` | tertiary text |
| `--gray-6` | `#B1B1B1` | disabled |
| `--gray-8` | `#E2E2E2` | input border |
| `--gray-11`, `--white-2` | `#F1F1F1` / `#F5F5F5` | track / subtle fill |
| `--white-1` | `#FFFFFF` | card surface |
| `--white-4` | `#F7FBFB` | teal-tinted surface |
| `--bg-section-alt2/3` | `#FFFAF5` / `#FEF9F4` | warm section band |
| `--red-1` | `#DF1B41` | form error |
| `--star-1` | `#FFB200` | rating stars |
| section divider | `#E6E3DC` | 1px hairline between rows |
| dark hero surface | `#0F172A` | the one dark surface on the whole site |

Alpha ramp on brand (copy this idea, it is how they get "tinted" chips without new hexes):
`--primary10-new: rgba(60,186,181,.1)`, `.2`, `.4`, `.6`, `.8`. Icon tiles use
`background: rgba(60,186,181,.12)` with `color:#3CBAB5`.

### 1.2 SiPhox — the STATUS scale (this is the important table)

Four levels, and **each has three separate encodings**: a pill (tint bg + dark fg + word), an
8px dot, and a text color. They never rely on color alone — the pill always carries the word.

| Level | Word shown | Pill bg | Pill fg | Dot | Contrast (fg/bg) |
|---|---|---|---|---|---|
| best | `Optimal` | `#E8F6E0` | `#3A9410` | `#52C41A` | **3.45:1 — FAILS AA** |
| good | `Good` | `#E6F0FF` | `#1677FF` | `#1677FF` | **3.57:1 — FAILS AA** |
| watch | `Fair` | `#FFE9D4` | `#D4640F` | `#FA8C16` | **3.17:1 — FAILS AA** |
| bad | `Pay Attention` / `Out of range` | `#FFE2E2` | `#D42020` | `#F5222D` | **4.28:1 — FAILS AA** |

Their pill is `font-size:12px; font-weight:500` — i.e. normal-size text, so it needs 4.5:1.
**All four fail.** Do not copy these foregrounds. AA-passing replacements on the *same* tints
(computed, verified):

| Level | bg | fg (AA) | ratio |
|---|---|---|---|
| optimal / normal | `#E8F6E0` | `#276B16` | 5.84 |
| info / borderline | `#E6F0FF` | `#0B4BB3` | 6.84 |
| pay attention | `#FFF3E5` | `#7A4408` | 7.23 |
| out of range | `#FDECEC` | `#A01818` | 6.97 |

A separate binary scale is used on the dashboard mock (score rings, category bars) — only two
states there:

| State | Color | Ratio on white |
|---|---|---|
| `In range` | `#0057FF` | 5.52 — passes AA |
| `Out of range` | `#F13737` | 3.93 — fails AA for text, OK for a >=3:1 graphic |

Delta chips (trend vs last test) are a *fifth* colour axis and deliberately not the status axis:
`up` = `#1A9C5B` on `rgba(26,156,91,.12)`, `down` = `#FF7F00` on `rgba(247,108,56,.12)`.
Worth stealing: **direction-of-change is not the same colour vocabulary as in/out of range.**

### 1.3 SiPhox — evidence-strength scale (a second, non-status ramp)

Used for "how strong is the evidence for this recommendation" (L1…L5). Five steps, each with a
`--evidence-color` + `--evidence-soft` pair. Directly reusable for a clinical-certainty badge:

| Step | color | soft bg |
|---|---|---|
| strongest | `#1B8A5A` | `#E2F3EA` |
| strong | `#5AA83F` | `#E9F3E2` |
| moderate | `#C9A227` | `#F8EFD3` |
| weak | `#DE7A3C` | `#FBE6D6` |
| none | `#8B9794` | `#ECEEED` |

### 1.4 Function Health — full token layer (verbatim)

Semantic-numbered, not named-by-hue. This is the better system to imitate structurally.

| Token | Hex | Role |
|---|---|---|
| `--fill-01` / `--beige` | `#FEF9EF` | **page background** (warm off-white, not `#fff`) |
| `--fill-02` / `--cream` | `#F5EEE1` | secondary surface |
| `--fill-03` | `#2A2B2F` | inverted surface |
| `--fill-04` / `--orange` | `#B05A36` | brand accent (terracotta) |
| `--stroke-01` | `#FEF9EF` | stroke on dark |
| `--stroke-02` / `--dark-cream` | `#D1C9BF` | hairline border |
| `--stroke-03/04` | `#2A2B2F` | strong border |
| `--stroke-06` | `#737373` | muted border |
| `--text-01` | `#FEF9EF` | text on dark |
| `--text-02` / `--gray` | `#515151` | secondary text |
| `--text-03` | `#2A2B2F` | primary ink |
| `--text-04` | `#B05A36` | accent text |
| `--error` | `#DB0000` | error only |
| `--green` | `#79BD8B` | + `--green-10p: #F1F3E5` |
| `--blue` | `#488AD5` | |
| `--orange-10p` | `#F7EEEB` | 10% tint pattern |

Contrast: `#515151` on `#FEF9EF` = 7.56, `#B05A36` on `#FEF9EF` = 4.59, `#2A2B2F` on `#F5EEE1`
= 12.26. **Function's palette passes AA where SiPhox's status pills do not.**

The `-10p` suffix convention (`--orange-10p`, `--green-10p` as *baked hexes*, not `rgba`) is
worth copying: it keeps tints opaque, so a chip over a photo or a striped row never shifts.

Function's **dashboard** status colors are unverified — reviews describe "green for optimal,
yellow for borderline, red for concerning" but no hex is obtainable without an account. Do not
transcribe a hex for it.

---

## 2. Type

### 2.1 SiPhox

- Family: **Graphik** (self-hosted woff2, `__graphik_*`), fallback stack unverified. Also loads
  Inter and Open Sans as `--font-inter` / `--font-open-sans` for sub-widgets.
- Root: `--font-size: 18px` on the base scale token.
- Size ladder (their `--fs-*` tokens, rem-based):
  `4, 8, 12, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 80, 104`.

Actual usage ladder as shipped:

| Role | Desktop | Tablet | Mobile | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|---|
| section title (h2) | 48px | 32px | 28px | **300** | 1.2 | `-0.75px` |
| section subtitle | 20px | — | 18px | 300 | 1.3 | — |
| card title | 20px | — | — | 500 | 1.2 | `-0.015em` |
| hero headline (portal) | 2.1rem | — | 1.6rem | 300 | 1.12 | `-0.03em` |
| big number (ring) | 38px | — | — | 300 | 1 | `-0.04em` |
| gauge value | 40 / 32 / 20 / 16px | | | 300 | 1 | — |
| item title | 16px | — | 14px | 300 | — | — |
| row / marker name | 13.5–14px | | | 500 | — | — |
| body small | 14.5px | | | 400 | 1.55 | — |
| value cell | 13.5px | | | 500 | — | — |
| unit suffix | 11px | | | 400 | — | — |
| pill label | 12px | | | 500 | 1.2 | — |
| grade chip | 10.5px | | | 500 | — | `0.02em` |
| eyebrow / overline | 11px | | | 500 | — | `0.05em`, UPPERCASE |
| ring label | 10px | | | 500 | 1.3 | `0.12em`, UPPERCASE |
| caption / count | 11–12px | | | 400 | — | — |

**Weight 300 for every large heading and every large number** is the single most characteristic
type decision on the site. Small text is 500. There is effectively no 700.

**Tabular numerals are used everywhere a number can change:**
`font-feature-settings:"tnum"; font-variant-numeric:tabular-nums` appears on `ScoreRing_ringValue`,
`TrackedMarkerRow_valueCell`, `TrackedMarkerRow_deltaCell`, `PortalHomeShowcase_pct`,
`PortalHomeShowcase_count`. One card instead forces **lining** figures
(`font-variant-numeric:lining-nums; font-feature-settings:"lnum" 1,"ss01" 0`) — i.e. they hit the
old-style-figures bug and patched it per-component.

### 2.2 Function Health

- `--font-sans: "FT Base", system-ui, sans-serif` (body/UI)
- `--font-serif: "Financier Display", Georgia, serif` (editorial display)
- `--font-mono: "Fragment Mono", monospace` — **used for data/labels**, which is how they get
  tabular alignment without a `tnum` feature.

Fluid ladder, all `clamp()` between a 23.5rem and 90rem viewport (`--min-viewport: 23.5`,
`--max-viewport: 90`):

| Token | min → max |
|---|---|
| `--heading-xl` | 3.375rem → 6.25rem |
| `--h1` | 3.5625rem → 5rem |
| `--h2` | 3rem → 4rem |
| `--h3` | 2.125rem → 2.8125rem (line-height 1) |
| `--h4` | 1.6875rem → 2.125rem |
| `--h5` | 1.375rem → 1.5rem |
| `--h6` | 1.1875rem → 1.25rem |
| `--text-xxl` | 1.8125rem → 2.125rem |
| `--text-xl` | 1.125rem → 1.5rem |
| `--text-lg` | 1.125rem → 1.25rem |
| `--text-md` | 1rem → 1.125rem |
| `--text-regular` | 1rem (fixed) |
| `--text-sm` | 0.875rem (fixed) |
| `--text-xs` | 0.75rem (fixed) |

Note they **do not fluid-scale anything <=1rem** — small text is fixed. Copy that; fluid captions
are how you end up under 12px on a phone.

Letter-spacing usage is bimodal: `-0.01em`/`-0.02em` on large display, `+0.05em` → `+0.1em` on
uppercase micro-labels. Nothing in between.

Also present and worth copying: `text-wrap: pretty` on all of `h1…h6`.

---

## 3. Layout

### 3.1 SiPhox container ladder (exact, from media queries)

| Viewport | container max-width | side padding |
|---|---|---|
| <=575px | 100% | 15px |
| 576–767 | 576px | 15px |
| 768–991 | 760px | 15px |
| 992–1199 | 960px | 15px |
| 1200–1239 | 1140px | 15px |
| 1240–1433 | **1170px** (`--container-width`) | 15px |
| >=1434 | 1202px | 15px |

Other breakpoints they actually branch on: `max-width:800px` (header rhythm),
`max-width:900px` (grid → single column). Content pages use a simpler
`max-width:1150px; padding:40px 16px` (desktop) → `padding:20px 16px` (mobile).

Section rhythm: `--default-gap: 82px` desktop, `--mobile-section-padding: 16px`;
`--padding-h` steps `2rem / 3rem / 4rem / 5rem` by breakpoint. Header height `86px` desktop,
`60px` mobile — sticky sidebars anchor at `top:120px` with `scroll-margin-top:100px` on each
section (so in-page category jumps don't hide under the header).

Grid: the dashboard mock is `grid-template-columns: 1.45fr 1fr; gap:16px` → `1fr` under 900px.
The biomarker library is a `280px` sticky sidebar + fluid list, `gap:40px` → stacked with the
category list `order:-1` on mobile.

Rows use `grid-template-columns: repeat(auto-fit, minmax(min(100%,240px),1fr))` — the row
self-collapses to two lines when narrower than 240px per cell. This is the cleanest
mobile-first row pattern on either site and it is direction-agnostic (safe for RTL).

### 3.2 Function Health spacing scale (fluid, 13 steps)

| Token | value |
|---|---|
| `--s1` | 0.25rem |
| `--s2` | 0.5rem |
| `--s3` | 0.75rem |
| `--s4` | clamp(.75 → 1rem) |
| `--s5` | clamp(1 → 1.25rem) |
| `--s6` | clamp(1.25 → 1.5rem) |
| `--s7` | clamp(1.5 → 2rem) |
| `--s8` | clamp(2 → 2.5rem) |
| `--s9` | clamp(2.5 → 3.5rem) |
| `--s10` | clamp(3 → 4rem) |
| `--s11` | clamp(3.5 → 5rem) |
| `--s12` | clamp(4.5 → 6rem) |
| `--s13` | clamp(5 → 7.5rem) |

`--site-margin: clamp(1.25rem, 4.1353vw + .2782rem, 4rem)`;
`--content-width: calc(100% - (var(--site-margin) * 2))`;
`--main: calc(90 * 1rem)` = 1440px cap.

Verdict on the 8px-scale question: **SiPhox is on a strict 4/8 grid at component level**
(4, 6, 8, 10, 12, 16, 24, 28, 32, 40 — gaps are `.5rem`/`.75rem`/`1rem`), **Function is on a
fluid rem scale at section level**. Recommended hybrid: fixed 4px grid inside components,
fluid `clamp()` only for section padding and page margin.

---

## 4. Components (exact CSS, then anatomy)

### 4.1 Status pill — `BiomarkerPill`

```css
display:inline-flex; align-items:center;
font-size:12px; font-weight:500; line-height:1.2;
padding:4px 10px; border-radius:9999px; white-space:nowrap;
```
Variants only change `background` + `color` (see 1.2). A denser variant
(`TrackedMarkerRow_gradeChip`) is `font-size:10.5px; padding:2px 9px; letter-spacing:.02em;
color:#fff` on a solid status background, with a 5px `currentColor` dot inside at `opacity:.85`.

```
+------------------------+
| * Out of range         |   <- 5px dot (currentColor) + word. Never the dot alone.
+------------------------+
  radius 9999px | 4px 10px | 12px/500
```

### 4.2 Biomarker card — `BiomarkerCard`

```css
background:hsla(0,0%,100%,.5); border:1px solid hsla(0,0%,100%,.3);
border-radius:12px; padding:.75rem 1rem; gap:1rem;
display:flex; align-items:center; justify-content:space-between;
box-shadow:0 4px 16px rgba(0,0,0,.1);
backdrop-filter:blur(12px); transition:all .3s ease; overflow:hidden;
```
Anatomy, in DOM order:
```
+-------------------------------------------------------+
| Ferritin                                12 ng/mL  (*) |
| Iron storage protein                                  |
+-------------------------------------------------------+
  |- name 14px/500     |- description 12px/1.3 opacity .7
                         |- value 14px/600, white-space:nowrap
                            |- statusDot 8x8, radius 50%, flex-shrink:0
```
`biomarkerInfo` is `flex:1; min-width:0; gap:2px` (the `min-width:0` is what stops a long name
from pushing the value off-card); `valueAndStatus` is `flex-shrink:0; gap:.5rem`.

### 4.3 Data row with a bar — `PortalHomeShowcase_changedRow`

Real shipped markup:
```html
<div class="changedRow" data-divider="true">
  <div class="changedName">
    <span class="dot dotInRange"></span>
    <span class="categoryName">Heart Health</span>
    <span class="rangeLabel inRange">In range</span>
  </div>
  <div class="changedData">
    <div class="barTrack"><span class="barFill fillInRange" style="--fill:68"></span></div>
    <span class="pct">68%</span>
    <span class="deltaChip deltaDown">v 6%</span>
  </div>
</div>
```
```css
.changedRow { display:flex; flex-wrap:wrap; column-gap:18px; row-gap:8px;
              align-items:center; padding:12px 4px; }
.barTrack   { position:relative; height:5px; flex:1 1 60px;
              background:#F1F1F1; border-radius:9999px; overflow:hidden; }
.barFill    { position:absolute; inset:0; width:calc(var(--fill)*1%);
              border-radius:9999px; transition:width 1s cubic-bezier(.2,.8,.2,1); }
.deltaChip  { font-size:11.5px; font-weight:500; padding:4px 9px; border-radius:9999px; }
```
```
(*) Heart Health   In range     [====----]  68%   v6%
 |   |             |            |           |     |
8px  name 14/500   status word  5px track   tnum  delta chip
```

### 4.4 Two-endpoint bar — `OutlookRow` (closest thing on either site to a range band)

A "from -> to" projection bar, not a reference-range bar, but it is the technique to steal for a
reference band because it composes two absolutely-positioned segments on one track:

```css
.bar     { position:relative; width:100%; height:5px; border-radius:3px;
           overflow:hidden; background:#E6ECE9; }
.barFrom { position:absolute; left:0;  width:calc(var(--from)*1%);
           background:#C4D2CC; border-radius:3px 0 0 3px; }
.barTo   { position:absolute; left:calc(var(--from)*1%);
           width:calc((var(--to) - var(--from))*1%);
           background:#3CBAB5; border-radius:0 3px 3px 0; }
```
Header above it: `display:flex; justify-content:space-between; align-items:baseline;
margin-bottom:6px`, name 13px/500, numbers 12px with `gap:8px`, target value in brand color/500.

> RTL: `left:` plus the asymmetric `border-radius:3px 0 0 3px` are the two things that break.
> Rewrite as `inset-inline-start` and `border-start-start-radius`/`border-end-start-radius`, or
> the fill grows from the wrong end. See section 9.

### 4.5 Score ring — `ScoreRing`

```css
.ring       { width:168px; height:168px; border-radius:50%;
              background: conic-gradient(var(--ring-color) calc(var(--ring-pct)*1%),
                                         hsla(0,0%,100%,.12) 0);
              transition:--ring-pct .9s cubic-bezier(.22,.61,.36,1); }  /* 150px mobile */
.ringValue  { font-size:38px; font-weight:300; line-height:1; letter-spacing:-.04em;
              font-variant-numeric:tabular-nums; }
.ringLabel  { font-size:10px; letter-spacing:.12em; text-transform:uppercase;
              font-weight:500; margin-top:6px; line-height:1.3; }
.ringCenter { max-width:104px; text-align:center; }
.trendPill  { position:absolute; bottom:6px; right:-6px; background:#fff;
              border-radius:9999px; padding:5px 11px; font-size:11.5px; font-weight:500;
              box-shadow:0 2px 6px rgba(15,21,19,.16); }
.ringInRange    { --ring-color:#0057FF; }
.ringOutOfRange { --ring-color:#F13737; }
```
No SVG — a `conic-gradient` with an animated `@property --ring-pct`. By far the cheapest ring
implementation, and it degrades to a static ring without `@property`.

A second variant (`MiniChart`) puts a frosted disc in the middle:
`width:65px -> 130px; border-radius:50%; background:hsla(0,0%,100%,.7);
backdrop-filter:blur(12px); border:1px solid hsla(0,0%,100%,.3);
box-shadow:0 4px 24px -1px rgba(0,0,0,.03)`, value 20 -> 40px weight 300, label 6 -> 10px
uppercase `letter-spacing:.1em` weight 700, percent 12 -> 20px `opacity:.5`.

### 4.6 Mobile category accordion — `NewBiomarkersLayout`

```css
.mobileCategory       { border-radius:12px; border:1px solid rgba(0,0,0,.1);
                        background:#fff; overflow:hidden;
                        transition:border-color .2s ease; }
.mobileCategoryHeader { display:flex; align-items:center; justify-content:space-between;
                        gap:16px; padding:16px 20px;  /* 12px 16px on small */
                        background:#fff; border:none; width:100%;
                        font-family:inherit; text-align:left; cursor:pointer;
                        transition:background .2s ease; }
.biomarkersList       { padding:0 20px 16px; border-top:1px solid rgba(0,0,0,.05); }
.expandIcon           { transition:transform .2s ease; }
.expanded             { transform:rotate(180deg); }
.categorySection      { display:flex; flex-direction:column; gap:24px;
                        scroll-margin-top:100px; }
```
Desktop counterpart: sticky category list, `position:sticky; top:120px; width:280px;
max-height:calc(100vh - 140px); overflow-y:auto`.
`text-align:left` on the header must become `text-align:start` for RTL.

### 4.7 Buttons / pills — `PortalHomeShowcase_pill`

```css
display:inline-flex; align-items:center; justify-content:center; gap:8px;
border:none; border-radius:9999px; font-size:14px; font-weight:500;
padding:11px 20px; transition:opacity .15s, background .15s;
/* primary  */ background:#3CBAB5; color:#fff;
/* ghost    */ background:transparent; border:1.5px solid hsla(0,0%,100%,.45); color:#fff;
/* small    */ padding:7px 16px; font-size:12px;
/* tertiary */ height:32px; padding:0 16px; background:rgba(60,186,181,.12); color:#3CBAB5;
               font-size:12.5px;
```
Every button on the site is a full pill (`9999px`). There is no rounded-rect button.

> `#3CBAB5` on white is 2.36:1 — the tertiary tinted button fails AA badly, and white on
> `#3CBAB5` is the same ~2.4:1, so their primary button fails AA too. If you take the teal,
> darken it: `#0F5F5B` gives 7.48:1 on white.

### 4.8 Notice / callout

```css
padding:12px 16px; background:rgba(60,186,181,.08); border:1px solid #3CBAB5;
border-radius:8px; color:#333; font-size:14px; font-weight:500; margin-top:8px;
/* 13px / 10px 14px on mobile */
```
Full 1px border, not a left accent bar. Good: a left accent bar is exactly the pattern that
breaks in RTL.

### 4.9 Sticky bottom action bar (mobile)

```css
position:fixed; inset-inline:0; bottom:0; z-index:100;
padding:10px max(15px,(100vw - 720px)/2) max(10px, env(safe-area-inset-bottom,0px));
background:#fff; box-shadow:0 -2px 12px color-mix(in srgb,#000 8%,transparent);
```
The `env(safe-area-inset-bottom)` and the self-centering horizontal padding are worth copying
verbatim. Direction-neutral.

### 4.10 Loading / empty / skeleton

Not established. SiPhox ships a spinner keyframe (`rotate(0 -> 1turn)`) and a chat typing
indicator (`scale(.8)/opacity .5` -> `scale(1)/opacity 1` at 40%, plus a blink caret at
0-50%/51-100%). No skeleton-shimmer pattern and no empty-state component were found on either
site — unverified. Design ours.

---

## 5. Radii, borders, shadows

### Radii — SiPhox, by frequency in shipped CSS

| Value | Count | Used for |
|---|---|---|
| `50%` | 46 | dots, avatars, ring |
| `12px` | 30 | default card |
| `8px` | 25 | small card / notice / input |
| `20px` | 21 | large panel |
| `10px` | 16 | icon tile |
| `24px` | 14 | portal card |
| `9999px` / `999px` | 22 | every pill, chip, button, bar track |
| `16px` | 13 | prompt card |
| `4px` / `3px` / `2px` | 13 | micro (bar ends) |

### Radii — Function Health (tokenized, fluid)

| Token | value |
|---|---|
| `--radius-xs` | 0.25rem |
| `--radius-small` | 0.375rem |
| `--radius-base` | 0.75rem (the default, 60 usages) |
| `--radius-large` | clamp(1rem -> 1.5rem) |
| `--radius-xl` | clamp(1.5rem -> 2.5rem) |
| pill | `999px` (58 usages) |

### Borders

- SiPhox hairline between rows `1px solid #E6E3DC`; card border `1px solid rgba(0,0,0,.1)`;
  list divider `1px solid rgba(0,0,0,.05)`; input `1px solid #E2E2E2`.
- Function uses `box-shadow: inset 0 0 0 1px var(--stroke-04)` instead of `border` on
  interactive elements, so hover/focus ring changes never shift layout. Steal this.
- Function error state: `box-shadow: inset 0 0 0 1px var(--error)`.
- Function focus ring: `box-shadow: 0 0 0 4px #2A2B2F59`.

### Shadows — usable ladder (SiPhox, real values)

| Level | Value |
|---|---|
| xs (row/chip) | `0 2px 6px rgba(15,21,19,.06), 0 1px 2px rgba(15,21,19,.04)` |
| sm (chip lift) | `0 2px 6px rgba(15,21,19,.16)` |
| md (card) | `0 4px 12px rgba(15,21,19,.08)` |
| lg (floating card) | `0 4px 16px rgba(0,0,0,.1)` |
| xl (modal) | `0 4px 24px rgba(0,0,0,.08)` |
| hero | `0 16px 40px rgba(15,23,42,.24)` |
| very soft ambient | `0 90px 100px 0 rgba(99,99,99,.08)` |
| brand glow (CTA) | `0 4px 20px rgba(246,107,55,.35)` |
| inset sheen | `inset 0 1px 0 hsla(0,0%,100%,.9), 0 6px 18px rgba(38,79,80,.08)` |

Function's: `0 2px 12px #0000001A`, `0 0 20px #00000026`, `0 16px 48px #1018283D`.

---

## 6. Information architecture

### SiPhox results dashboard (from the shipped mock, high confidence)

```
+-- HERO PANEL (dark #0F172A, radius 24, shadow 0 16px 40px) ------------+
|  Headline 2.1rem/300                      .-----------.               |
|  Body 14.5px, max-width 420px             |    82     |  <- ScoreRing |
|  [ Primary pill ] [ Ghost pill ]          | IN RANGE  |     168px     |
|                                           '-----------'   + trendPill |
+-----------------------------------------------------------------------+
+-- grid 1.45fr / 1fr, gap 16 -------------+----------------------------+
| CATEGORY SUMMARY (padding 28)            | NEXT STEPS (24 26 16)      |
|  (*) Heart Health   In range  [==-] 68%  |  [] step row (gap 13,      |
|  (*) Metabolic      In range  [==-] 73%  |     padding 11 0)          |
|  (*) Hormones   Out of range  [=--] 41%  |  [] ...                    |
+------------------------------------------+----------------------------+
+-- TRACKED MARKERS ----------------------------------------------------+
|  Name  [chip]          /\/ spark 30px     12.4 g/dL   -0.3            |
+-----------------------------------------------------------------------+
```

Drill path: overall ring -> category row (dot + word + % bar) -> marker list -> marker detail.
Each level repeats the same three encodings (dot, word, bar), so the patient learns the
vocabulary once. Category rows carry a % AND an in/out word — the number never stands alone.

`TrackedMarkerRow` (46px min-height, `padding:8px 0`, `column-gap:16px`, `row-gap:6px`) is
`auto-fit minmax(min(100%,240px),1fr)` — on a phone it wraps to name-line / data-line rather
than truncating. Cells: name 13.5/500 -> grade chip -> 30px sparkline (`flex:1 1 110px;
min-width:70px; max-width:140px`) -> value (tnum) -> delta (tnum) -> 26px round remove button.

### Function Health results (unverified — from reviews only)

- Home is a count summary: "100 are in range and 14 are out of range" — one sentence, two
  numbers, above the fold.
- Below it, categories by body system (Heart, Kidneys, Autoimmunity, Heavy Metals, Biological
  Age...), each showing in-range vs out-of-range counts.
- Biomarker detail = value + position against range + a "Why it matters?" section covering what
  the marker does, what affects it, and what being out of range implies.
- They show two ranges: the standard lab reference range and a narrower clinician-set "optimal"
  range. See section 10 — do not copy this one.
- A small trend sparkline next to each biomarker at list level.

Progressive disclosure on both sites: the list row shows name + value + status only; everything
explanatory sits behind an accordion (`expandIcon` rotate 180deg) or a detail route.

---

## 7. Motion

| Purpose | Value | Source |
|---|---|---|
| standard UI ease | `cubic-bezier(.4,0,.2,1)` (20 usages) | SiPhox |
| bar fill | `width 1s cubic-bezier(.2,.8,.2,1)` | `barFill` |
| ring sweep | `--ring-pct .9s cubic-bezier(.22,.61,.36,1)` | `ScoreRing` |
| size/number morph | `.6s cubic-bezier(.4,0,.2,1)` | `MiniChart` |
| hover / accordion | `.2s ease` (transform, background, border-color) | everywhere |
| card hover | `all .3s ease` | `biomarkerCard` |
| entrance | `opacity .5s ease-out, transform .5s ease-out` | section reveals |
| panel slide-up | `0% opacity 0 translateY(16px) -> 100% opacity 1 translateY(0)` | `SaiChatPanel` |
| highlight flash | `0%/100% transparent -> 50% rgba(brand,.2)` | `ActionPlanCard_highlight` |
| chart dot pop | SVG `r: 0 -> 4 (60%) -> 3`, `.3s ease-out forwards` | `TestingSteps` |
| Function's UI | `opacity .22s ease`, `transform .18s ease` | Function |

Two worth copying: the bar filling from 0 to its value on mount (1s, decelerating), and the
highlight flash when a value updates. Both are direction-safe if the bar grows from
`inset-inline-start`. Everything marquee/auto-scroll (`scrollVertical 140s`, `ScrollingRow 130s`,
`PublishersSection_marquee`) is decorative marketing — skip it, and note horizontal marquees
reverse direction under RTL.

No `prefers-reduced-motion` block was found in either bundle. That is a defect, not a pattern.

---

## 8. Trust / authority signals

- A thin sticky trust bar under the header, not a badge wall:
  `height:28px; font-size:11px; font-weight:500; letter-spacing:.1px;
  border-bottom:1px solid rgba(60,186,181,.2); gap:6px` — one quiet line, always visible.
- Named accreditations in body text rather than logos: "CLIA-certified lab", "CLIA & CAP
  accredited", "College of American Pathologists (CAP) accreditation", plus a stated correlation
  figure ("95%-99% correlation").
- Named human reviewers with institutions and publication counts ("Physician/medical school
  professor (UCLA and USC)", "author of over 200 peer-reviewed scientific papers") instead of a
  generic "reviewed by doctors".
- An evidence-strength scale on every recommendation (L1...L5, section 1.3) — the single best
  authority pattern on either site, because it admits uncertainty instead of flattening it.
- An explicit hand-off line ("...physician for a more formal interpretation of your results")
  and an escalation line ("...physician immediately"), both as plain text in the flow, not a red
  alert box.
- Function uses editorial serif (Financier Display) for credibility and mono (Fragment Mono) for
  data labels — typography IS their authority signal.

Transferable to Khanesh: the evidence-strength chip maps onto rule confidence / `overall_urgency`,
and the "source" line maps onto the existing `sources` (MedlinePlus) plus reference-range
provenance (`refSource` on `_engine.tests[]`: Henry's / RCPCH 2016 / CTCAE v5).

---

## 9. RTL survival audit

FLIP = must mirror. KEEP = must NOT mirror. NEUTRAL = unaffected.

| Pattern | Verdict | What breaks / what to write |
|---|---|---|
| `barTrack` + `barFill{inset:0; width:N%}` | FLIP (free) | `inset:0` + `width` anchors to the start edge, which under `dir=rtl` is already the right edge. Works as-is. Do not "fix" it with `left:0`. |
| `OutlookRow` `barFrom{left:0}` / `barTo{left:var(--from)}` | FLIP | Physical `left` hard-breaks. Use `inset-inline-start`. |
| Asymmetric bar caps `border-radius:3px 0 0 3px` | FLIP | Use `border-start-start-radius` / `border-end-start-radius`, or put `9999px` on the track with `overflow:hidden` (SiPhox's own `barTrack` does this and is immune). |
| Reference-range band + value marker | FLIP the band, KEEP the numbers | The axis must run low->high in reading order, i.e. low on the RIGHT, high on the LEFT in RTL. But the tick numbers stay LTR. Highest-risk single component in the redesign. |
| Numeric value + unit (`12.4 g/dL`) | KEEP | Force `direction:ltr; unicode-bidi:isolate` (or `<bdi>`) on every measured value, range string and unit. A Persian sentence containing `1.2-2.5` otherwise renders the range reversed. |
| Reference range text `4.4-11` | KEEP | Same. The dash + digits must be one isolated LTR run. |
| Trend arrow up/down | KEEP | Vertical glyphs carry no direction. Never use left/right triangles for trend. |
| Delta chip `v 6%` | KEEP glyph, FLIP order | Arrow sits on the leading (right) side in RTL; flex + `gap` handles it. The `%` belongs inside the LTR isolate. |
| Sparkline (time series) | DECISION REQUIRED | Time normally flows start->end (right->left in RTL), but every clinical chart convention is left->right. Pick one and label the axis. I could not establish a house convention in this repo — unresolved. |
| Score ring `conic-gradient` | FLIP (optional) | Conic gradients always sweep clockwise. Either mirror with `transform:scaleX(-1)` on the ring and counter-scale the centered text, or accept clockwise and stop treating it as a track. Low risk. |
| `trendPill{position:absolute; right:-6px}` | FLIP | Use `inset-inline-end:-6px`. |
| `text-align:left` on accordion headers / card names / descriptions | FLIP | Use `text-align:start`. SiPhox has at least 4 of these: `biomarkerName`, `biomarkerDescription`, `mobileCategoryHeader`, `ActionPlanCard_title`. |
| `text-align:right` on value/delta cells | FLIP | Use `text-align:end`. |
| `justify-content:flex-end` on `rowData` | NEUTRAL | Flexbox is already logical. Safe. |
| Left accent bar on callouts | AVOID | Neither site uses one. Do not introduce one; use a full 1px border (4.8). |
| Chevron rotate(180deg) on expand | NEUTRAL | Vertical chevron. Safe. |
| Back/forward chevrons, carousel arrows | FLIP | Horizontal chevrons must mirror. |
| Symmetric padding | NEUTRAL | Where padding is asymmetric use `padding-inline-start/end`. |
| `mask-image: linear-gradient(180deg,...)` fades | NEUTRAL | Vertical. |
| Horizontal marquees | FLIP | Reverse direction, or drop (marketing-only anyway). |
| `env(safe-area-inset-bottom)` sticky bar | NEUTRAL | Safe verbatim. |
| Vazirmatn + tabular numerals | ACTION | Vazirmatn ships both Persian and Latin figures. Decide once: if measured values render as Persian-Indic digits, `tabular-nums` alignment must be re-verified. `khanesh/src/digits.js` (currently untracked) implies a digit policy already exists — align this spec to it before implementing. Unverified whether Vazirmatn's `tnum` covers Persian digits. |

---

## 10. Do NOT copy — marketing patterns and clinical hazards

These are US direct-to-consumer sales sites. Khanesh is a free interpretation tool over a sheet
the patient already has. Carrying these over is either dishonest or clinically wrong.

Marketing-only, drop entirely:

1. Price-in-CTA ("Start testing $124"), pricing sections, membership tiers, the 3D membership
   card, HSA/FSA eligibility.
2. Vanity counters ("1M+ Biomarkers tested"), press-logo marquees, testimonial carousels,
   expert-advisor headshot grids, star ratings.
3. Supplement carousels and the "Action Plan / Morning Stack / The Plate" surface — that is
   affiliate commerce dressed as advice.
4. Wearable-integration cards, quiz pop-up, discount badge, scroll-triggered sticky CTA footer,
   AI sales chat panel.
5. Auto-scrolling biomarker walls (`scrollVertical 140s`) — decoration on a results page and an
   accessibility problem.

Clinically wrong to copy:

6. The "optimal range" concept (Function's narrower-than-lab range, SiPhox's `Optimal` pill).
   These are wellness-marketing ranges, not reference intervals. Khanesh grades against Henry's /
   RCPCH 2016 / CTCAE v5 and must show the lab's reference interval. Rendering an "optimal" band
   beside a normal result manufactures abnormality. If a 4-level scale is wanted, derive it from
   the engine's own `level` / `ctcaeGrade` / `nearLimit`, never from a narrowed range.
7. A single overall health score or percentage (the 82 ring, "Heart Health 68%"). No engine field
   means this and there is no defensible way to compute one from a lab sheet. Any ring we ship
   must display a COUNT ("۳ مورد خارج از محدوده") or an urgency level, never an invented score.
   Related repo rule N5: never print a derived number as if it were on the patient's sheet.
8. "Biological age." Nothing in `rules/` supports it.
9. Green "Optimal" as a reward state. Our states come from the engine
   (`abnormal` / `dir` / `level` / `nearLimit`) and one of them — "not measured" — has no
   analogue on either site. Repo rule N4: a missing test is not a normal test. The scale needs a
   fifth, visually distinct «این آزمایش انجام نشده» state that neither reference site has.
10. The reassurance-first tone ("everything looks great!"). SiPhox's canned optimism is a sales
    posture; our `buildNormalResult()` path is the analogous surface and must stay factual.
11. Their status-pill foregrounds (1.2) — four AA failures — and their teal button (~2.4:1 both
    ways). Do not paste any of those six colors.
12. The absence of `prefers-reduced-motion` in either bundle.

---

## 11. Recommended token starting set for Khanesh

Derived from the above, adjusted for AA and RTL. Departures from the sources are marked.

```
/* surfaces — Function's warm off-white beats pure #fff for long reading */
--surface-page      #FEF9EF   (Function --fill-01)
--surface-card      #FFFFFF
--surface-sunken    #F5EEE1   (Function --fill-02)
--surface-track     #F1F1F1   (SiPhox --gray-11)

/* ink */
--ink-1             #1E1E1E   16.7:1 on white
--ink-2             #515151    7.6:1 on page
--ink-3             #6B6B6B    5.3:1 on white   <- lightest usable for text
--hairline          #E6E3DC
--border-card       rgba(0,0,0,.10)
--divider           rgba(0,0,0,.05)

/* status — DARKENED from SiPhox so 12px pill text passes AA */
--st-normal-bg      #E8F6E0    --st-normal-fg      #276B16   5.84:1
--st-borderline-bg  #E6F0FF    --st-borderline-fg  #0B4BB3   6.84:1
--st-attention-bg   #FFF3E5    --st-attention-fg   #7A4408   7.23:1
--st-critical-bg    #FDECEC    --st-critical-fg    #A01818   6.97:1
--st-unmeasured-bg  #ECEEED    --st-unmeasured-fg  #4A5654   <- NEW, no source analogue

/* dots — >=3:1 on white required for non-text graphics */
--dot-normal #276B16   --dot-borderline #0B4BB3   --dot-attention #B0600A
--dot-critical #C62828 --dot-unmeasured #8B9794

/* radius */  --r-xs 4  --r-sm 8  --r-md 12  --r-lg 20  --r-xl 24  --r-pill 9999
/* shadow */  xs  0 2px 6px rgba(15,21,19,.06), 0 1px 2px rgba(15,21,19,.04)
              md  0 4px 12px rgba(15,21,19,.08)
              lg  0 4px 16px rgba(0,0,0,.10)
/* motion */  --ease-ui cubic-bezier(.4,0,.2,1)   --ease-bar cubic-bezier(.2,.8,.2,1)
              --dur-fast 150ms  --dur 220ms  --dur-slow 600ms  --dur-bar 1s
/* space  */  4 8 12 16 24 32 40 56 80  (fixed inside components)
              section padding: clamp(1.25rem, 4.14vw + .28rem, 4rem)  (Function --site-margin)
/* container */ 100% / 576 / 760 / 960 / 1140 / 1170, side padding 16
```

Type ladder for Vazirmatn (Vazirmatn ships 100-900). SiPhox's weight-300 display works, but hold
400 as the floor for body: thin Persian text at small sizes loses tooth definition.

| Role | size | weight | line-height | tracking |
|---|---|---|---|---|
| display | 32 -> 40 | 300-400 | 1.2 | -0.01em |
| h1 | 24 -> 28 | 500 | 1.3 | 0 |
| h2 | 20 | 500 | 1.35 | 0 |
| card title | 18 | 500 | 1.4 | 0 |
| body | 15-16 | 400 | 1.7 (Persian needs more leading than Latin) | 0 |
| row name | 14 | 500 | 1.5 | 0 |
| value (LTR isolate) | 15 | 500 | 1 | 0, tabular-nums |
| unit | 12 | 400 | 1 | 0 |
| pill | 12 | 500 | 1.2 | 0 |
| caption | 12 | 400 | 1.6 | 0 |
| overline | 11 | 500 | 1.3 | 0.05em |

---

## 12. Gaps — say "unverified", do not fill these in

- Function Health's dashboard hexes, type ramp, range-bar geometry and status vocabulary.
  Auth-walled. Everything in the Function subsection of section 6 is third-party narrative.
- SiPhox's single-biomarker detail view (the real "your value on the reference band" component).
  Their marketing page ships category % bars and projection bars, not a reference band.
  **Neither site's true range visualization was obtained.** Section 4.4 is the closest technique;
  the component itself has to be designed, not copied.
- SiPhox's Graphik fallback stack and their root `line-height` / `body` reset (no `html`/`body`
  rule exists in the CSS bundles — likely inlined or in a CSS-in-JS layer).
- Empty states, error states and skeleton loaders on both sites.
- Whether either site handles `prefers-reduced-motion`, forced-colors, or >200% zoom reflow.
- Whether Vazirmatn's `tabular-nums` feature applies to Persian-Indic digits.

### Sources

- https://siphoxhealth.com/ (HTML + `/_next/static/css/*.css`)
- https://www.functionhealth.com/ (HTML + `/_astro/*.css`)
- https://dannb.org/blog/2025/function-health/
- https://www.bloodtestcomparison.com/function-health
- https://healnourishgrow.com/function-health-review/
- https://optimizebiomarkers.com/providers/function-health
