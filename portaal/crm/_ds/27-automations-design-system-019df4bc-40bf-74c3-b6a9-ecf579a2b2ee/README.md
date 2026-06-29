# 27 Automations — Design System

**Brand:** 27 Automations · part of Studio 27
**Sector:** AI-automation studio · Belgian / Kempen
**Tagline (Dutch):** "AI-automatisatie op zijn Kempisch" — AI automation, the Kempen way

## What is 27 Automations?

27 Automations helps companies work smarter, faster, and more pleasantly with **AI automations that are actually usable in practice**. Their work spans:

- Automated emails written in the right tone of voice
- Briefings that write themselves
- First drafts of texts and proposals
- Dashboards that bring overview
- Smart connections between tools like ClickUp, Gmail, Google Drive, and other systems

It's the **studio-style, hands-on, no-nonsense** flavor of AI automation. Not cold tech-jargon — solutions that start from what actually happens on the work floor. Trustworthy, clear, and helpful. Studio 27 acts as the trusted parent label; 27 Automations is the automation-focused sub-brand.

## Source materials provided

- `assets/source-Stylesheet.pdf` — original typography spec ("Niveau Grotesk")
- `assets/source-Stylesheet-v2.pdf` — **revised stylesheet** (Outfit Light + Off-Black + decorative shapes)
- `assets/source-Kleurenpalletten.pdf` — official color palette spec
- `assets/Logo*.svg`, `assets/Icon*.svg` — full logo & icon kit (pos / neg / black / white / solid variants, with and without "part of STUDIO 27" tagline)
- `assets/Squiggle_*.svg`, `assets/Corner_*.svg`, `assets/Half-circle_*.svg` — decorative overlay primitives in 6 colors each
- `assets/Pipe-*.svg` — the **pipe / connector motif** (divider azure + warm-white, vertical, corner)
- Reference: the live site — **27-automations.webflow.io** (the "class look" + pipe motif are lifted from here)

The brand description copy quoted above was lifted from the Stylesheet PDF (Dutch); we paraphrased and translated for this README.

---

## Quick index

| File | What it is |
|---|---|
| `README.md` | This file — brand, voice, visual foundations, iconography |
| `colors_and_type.css` | All color + type tokens as CSS custom properties |
| `assets/` | Logo + icon SVG kit (12 logo lockups, 6 icon variants) + source PDFs |
| `preview/` | Rendered specimen cards for the Design System tab |
| `templates/` | Ready-to-copy starting files: slide deck, document/PDF, web section, social posts |
| `SKILL.md` | Cross-compatible Agent-Skill manifest |

---

## Templates — build autonomously

The system is built to produce finished, on-brand artifacts with no further design input. Each template lives in `templates/<slug>/` and is a copy-and-fill starting file:

| Template | File | For |
|---|---|---|
| **Slide deck (PowerPoint)** | `templates/slide-deck/` | 16:9 presentations — cover, section, content, pipe-process, lime CTA. Export to PPTX / PDF. |
| **Document (PDF)** | `templates/document/` | A4 proposals, one-pagers, reports — cover + content page with header/footer. Print-ready. |
| **Web page section** | `templates/web-section/` | New Webflow-style site pages — rounded nav, hero, feature-card grid, lime CTA. |
| **Social media posts** | `templates/social-media/` | 1080×1080 squares — statement, feature, lime CTA. Instagram / LinkedIn. |

All four use the **class look** (large soft rounded cards), the **pipe motif**, Outfit Light display type, and the confirmed palette — so anything generated from them is brand-true by construction.

---

## CONTENT FUNDAMENTALS — voice & tone

### Tone in one line
**Trusted, clear, hands-on.** Like a competent neighbour who happens to be excellent at AI — confident but not flashy, warm but not cute.

### Language
- **Primary language: Dutch** (the brand is rooted in the Belgian Kempen region). English is fine for international/product copy.
- The brand consciously celebrates its **regional identity** — "op zijn Kempisch" (the Kempen way) is a value claim about being grounded, plain-spoken, dependable.

### Casing
- **Brand wordmark uses lowercase**: `27 automations`, never `27 Automations` in display contexts. The numeral leads.
- The parent label is set in spaced tracked caps in lockups: `part of STUDIO 27`.
- Body copy uses standard sentence case. Headlines often stay lowercase for personality (e.g. *"automation, the Kempen way."*).
- We avoid Title Case In Headings.

### Person
- **"je / jij" (informal Dutch you)** — never the formal "u". The brand is direct and on a first-name basis.
- English equivalent: **"you"**. We talk *to* the reader, not *about* them.
- Use **"we"** for the studio. Avoid corporate "the team" / "27 Automations is committed to…".

### Vocabulary
**Use:** automation, briefing, dashboard, connection, workflow, draft, tone of voice, the right way, on the work floor, save time, bring overview, grow your business.
**Avoid:** synergy, leverage, unlock, revolutionize, AI-powered, next-gen, cutting-edge, paradigm, disrupt, journey, mission-critical.

### Emoji & icons in copy
- **No emoji in marketing copy.** The brand is grown-up; emoji weaken it.
- Inline icons in product UI are fine, but kept simple and monochrome — see ICONOGRAPHY below.

### Voice examples (write like this)

> ✅ **Mails die zichzelf schrijven — in jouw tone of voice.**
> Geen koude AI-tekst. Wel drafts die klinken zoals jij praat.
>
> ✅ **Less typing, more doing.**
> We connect your tools so the boring parts handle themselves.
>
> ✅ **AI-automatisatie op zijn Kempisch.** Vertrouwd. Duidelijk. Bruikbaar.

> ❌ Unlock the next generation of AI-powered productivity.
> ❌ Empower your team with synergistic, mission-critical automations.
> ❌ Revolutionize your workflow today! 🚀

### Headline patterns
1. **Job-to-be-done in plain words.** *"Mails die zichzelf schrijven."*
2. **Promise + grounding qualifier.** *"AI-automatisatie. Op zijn Kempisch."*
3. **Negation + affirmation.** *"Geen koude techpraat. Wel oplossingen die werken."*

---

## VISUAL FOUNDATIONS

### Color
A **6-color brand palette**, all named (Stylesheet v2 added Off-Black):

| Name | Hex | Use |
|---|---|---|
| **Deep Blue** | `#0F2EA3` | Primary brand colour. Hero panels, headlines, the vivid dark side of the brand. |
| **Off-Black** | `#050A30` | Darkest navy, near-black. Body-copy sections, code surfaces, photography overlays — a quieter dark than Deep Blue. |
| **Azure Blue** | `#2458EA` | Action / link / interactive — buttons, links, focus rings. |
| **Sky Blue** | `#28AFF9` | Accent. Highlights, info states, secondary illustration colour. |
| **Lemon Lime** | `#D1F24C` | Pop / spotlight. Used sparingly for emphasis (highlights, callouts, the lime accent in the icon). |
| **Warm White** | `#F7F3EA` | Canvas / paper. The default light background — never pure white in marketing. |

**Two valid dark surfaces:** Deep Blue (vivid, branded) or Off-Black (quieter, near-black). Use Deep Blue for hero / signature panels; Off-Black for body-copy sections, code, photography contexts where the page should recede.

**Defaults:** light surfaces are **Warm White**, not `#FFFFFF`. Pure white is reserved for elevated cards on top of warm white. Text-on-warm-white uses **Off-Black** (`#050A30`), not pure black.

**Pairing rules:**
- Warm White + Deep Blue = the dependable workhorse pairing.
- Add **Sky Blue** for friendliness (info, illustration); add **Lemon Lime** for energy (CTAs that need to pop).
- Lemon Lime is the **CTA / highlight** colour: lime panels, lime nav buttons, lime feature cards — always with Off-Black text and a navy arrow-box.
- Never use Lemon Lime on Warm White for *text* — fails contrast. Lime is a *background* colour.

### Brand gradient
The **"27" numeral runs a Deep Blue → Azure → Sky Blue gradient** (`--brand-gradient`). This is the one sanctioned gradient. Use it **only** on the numeral or tiny brand accents — never as a large background fill or behind body text. Everywhere else the brand is flat colour. In the vector logo kit the gradient is rendered as three discrete blue shapes (deep / azure / sky), which is the canonical reproduction.

### Type
**One family does everything: Outfit (variable, 100–900).** The brand specimen is *Outfit Light* — a clean, optimistic geometric sans with even strokes and round bowls. Loaded from Google Fonts.

Weight, not family, does the work:
- **Display & headlines:** `300` (Light). Tight tracking `-0.02em`. The signature register — airy, calm, confident.
- **UI labels, buttons, eyebrows:** `500`–`600` (Medium / Semibold).
- **Body:** `300` (Light) at 16–18 px. Long-form Dutch run-on sentences read well at Light because Outfit's strokes are even.
- **Strong / emphasis:** `600` (Semibold). Avoid Bold (700) except for rare extra-loud cases.
- **Mono:** JetBrains Mono — code samples and technical UI.

The brand was originally specified in **Niveau Grotesk**; Stylesheet v2 standardised on **Outfit Light** as the open-license, web-friendly replacement.

Hierarchy:
- **Display** (56–128 px, weight 300, tracking `-0.02em`) — hero numerals, big statements. Often lowercase.
- **H1–H2** (32–48 / 26–36 px, weight 300) — section heads, set Light for an airy feel.
- **H3–H4 / UI** (18–22 px, weight 500) — denser hierarchy steps up to Medium for clarity.
- **Body** (16 px / 1.5, weight 300) — comfortable for Dutch run-on sentences.
- **Eyebrow** (12 px, uppercase, weight 600, +0.14em tracking) — section kickers.

### Layout & rhythm
- **Generous whitespace.** Not a dense brand. 64–128 px section padding is normal.
- **The "class look":** content lives in **large, soft, rounded cards/panels** (radius 24–28 px) of warm off-white (`#FFFDF8`) on the Warm White canvas, with a barely-there soft shadow (`--shadow-card`). Roomy padding (28–36 px). This is the dominant layout device on the site — feature grids, CTA panels, the nav bar (a rounded `--r-3xl` bar).
- **Asymmetric, grid-aware.** Headlines hug the left, set in light-weight Outfit.
- **The icon as a graphic element**, used large, cropped, layered.
- Layouts carry the brand on **bands and blocks of colour** — Deep Blue / Off-Black hero panels, Lemon Lime CTA panels.

### The glass look — frosted translucent panels
The site's other signature surface: **translucent, frosted panels** (a backdrop blur + a thin light border + soft shadow) floating over photography or over a Deep-Blue + pipe field. This is how text stays legible on busy imagery and how the feature cards sit on the blue "why us" panel. Tokens (`--glass-*`):

- **Over photography** (`--glass-photo-bg` + `--glass-photo-border`) — a *dark* frost, white text. Used for the hero text box.
- **Over Deep Blue / pipe** (`--glass-blue-bg` + `--glass-blue-border`) — a *lighter-blue* frost, white text. Used for feature cards on the blue panel.
- **Over warm white** (`--glass-light-bg` + `--glass-light-border`) — a warm frost. Used for the sticky nav bar.

Apply all three with `backdrop-filter: var(--glass-blur)` (16 px), the matching border, and `--glass-shadow`. **Rules:** glass needs something behind it to blur (a photo or the pipe field) — never glass on a flat empty background. Radius matches the class look (`--r-xl`/`--r-2xl`). Keep body copy ≥ rgba 0.8 white for contrast. Glass is a *screen* treatment — it does not render in PDF/print, so flat panels are the print fallback.

### The pipe / connector motif — signature graphic
The most recognisable brand device: a **thick, rounded "circuit pipe"** with right-angle bends and circular connection nodes (filled centre, coloured ring). It visualises *tools wiring together* — the core promise. Assets in `assets/`:

- `Pipe-divider-azure.svg` — horizontal run, Azure, for **light** backgrounds (section dividers, behind step rows).
- `Pipe-divider-warmwhite.svg` — same, Warm White, for **Deep Blue / Off-Black** backgrounds.
- `Pipe-vertical.svg` — vertical run with a parallel **Lime** accent strand.
- `Pipe-corner-azure.svg` — a single corner + node, for tucking into a card corner.

**Rules:** runs horizontally or vertically with 90° rounded bends only (never diagonal/organic); nodes mark steps or connection points; Azure on light, Warm White on dark; at most one Lime strand running parallel as an accent. Keep it behind or beside content at low-to-full opacity — never directly under body text at full strength.

### Backgrounds
- **Default: Warm White** (`#F7F3EA`). Never pure white for marketing surfaces.
- **Hero / brand-forward: Deep Blue** (`#0F2EA3`) or **Off-Black** (`#050A30`) full-bleed.
- **No mesh, no blurred orbs, no noise.** Flat colour + the pipe motif + the icon + the glass look. The only sanctioned gradient is the "27" numeral (see Brand gradient).
- **Hero pattern:** full-bleed photo/video in a large rounded card (`--r-3xl`), heading on the bright side, a **frosted glass text box** (see Glass look) tucked bottom-left.
- Photography sits **inside large rounded cards** (the class look), not as full-bleed hero by default.
- **Patterns:** scaled/cropped **27 icon**, the **pipe motif**, or compositions of the **decorative shape primitives** (see Shapes).

### Decorative shapes (new in v2)
Three primitives lifted from the icon's anatomy, available as standalone SVGs in 6 colors each:

- **Squiggle** — the open arc of the "2". Use along edges, under headlines, as a flourish.
- **Corner** — the inner curve of the "2". Anchors to corners (top-left / bottom-right).
- **Half-circle** — the cap of the "7". Peeks off the bottom or side of a panel.

**Rules:**
- Anchor to edges; never float in the middle.
- **Max three** shapes per surface. Two is plenty.
- Mix colors freely *within the palette*; keep underlying contrast intact.
- Shapes are decorative — never carry content (no logo over a shape, no text inside a shape).
- NEG variants (`*-NEG.svg`) are pre-coloured Warm White for use on Deep Blue / Off-Black surfaces.

Files: `assets/{Squiggle|Corner|Half-circle}_{Deep-Blue|Azure-Blue|Sky-Blue|Lemon-Lime|Off-Black|Warm-White}.svg` (+ NEG variants for the dark/colored ones).

### Borders & cards — the "class look"
- Default card: **warm off-white `#FFFDF8`** on the Warm White canvas, radius **`--r-2xl` (28 px)**, soft `--shadow-card`, padding 28–36 px, usually borderless (the soft shadow does the lifting).
- Hover: lift `translateY(-3px)` + step shadow up to `--shadow-md`.
- **Lime feature card:** Lemon Lime background, Off-Black heading, navy arrow-box CTA — the recurring "highlight" panel.
- **Deep Blue card:** for inverted emphasis; Sky-Blue icon, Warm-White text.
- Big containers (nav bar, hero shells) use **`--r-3xl` (40 px)**.

### Corner radii
- 6 / 10 / 14 / 20 / 24 / 28 / 40 / pill. Default **`--r-md` (14 px)** for buttons, **`--r-2xl` (28 px)** for cards, **`--r-3xl` (40 px)** for nav/large shells. Pill for chips.

### Buttons
- **Anatomy:** label + a **rounded-square arrow-box** tucked on the right (the site signature).
- **Lime primary:** Lime bg, Off-Black label, Off-Black arrow-box with white arrow.
- **Navy primary:** Off-Black bg, white label, white arrow-box with navy arrow.
- **Outline secondary:** transparent, navy hairline border.
- Radius `--r-md` (14 px). Hover: lime dims slightly; navy lightens.

### Shadows
Very soft, diffuse, low-contrast — cards barely lift off the canvas:
- `--shadow-xs / sm / md / lg / xl` for elevation.
- `--shadow-card` is the default "class look" card lift.

### Hover & press states
- **Buttons:** lime dims ~4%, navy lightens; arrow-box stays put.
- **Links:** hover darkens *and* underlines.
- **Cards:** hover lifts `translateY(-3px)` + bumps shadow one step. No colour change.

### Motion
- Default duration `220 ms`, ease `cubic-bezier(.2,.8,.2,1)`.
- Page-level entrances use `420 ms` `cubic-bezier(.16,1,.3,1)` (`--ease-out`) — confident, not bouncy.
- **No bouncy spring physics.** No theatrical eases. We respect the user's time.
- Reveals are **fade + 8 px translate-up**. That's it.

### Transparency & blur
- Reserved for **chrome over scroll surfaces** (a sticky nav backdrop with `backdrop-filter: blur(12px)` and 70% Warm-White fill). Otherwise solid colors.
- **Never blur or transparency over photography for hero copy** — we use a solid panel beside the photo instead.

### Imagery (when used)
- **Cool-leaning, real, documentary.** Hands on keyboards, screens with real automations, people in studio settings. Not "happy stock office"; not AI-generated.
- **B&W is the safe fallback** when image colors clash with the palette.
- No grain effect, no duotone overlays, no halftone. Photographic content stays clean and contained inside cards or hard-edged crops.

### Layout rules — fixed elements
- **Top-left logo, always.** `Logo-pos.svg` on Warm White; `Logo-neg.svg` (or `Logo-white.svg`) on Deep Blue.
- **Min logo size:** 100 px wide for full lockup, 32 px for icon-only.
- **Clear space:** `0.5×` icon height on all sides.

---

## ICONOGRAPHY

### Brand approach to icons
- **Primary icon: the 27 mark itself.** It functions both as logo and as a brand-forward graphic device — see `assets/Icon-pos.svg` and variants. It is constructive, modular, made of rectangles + arcs in three brand colors (Deep Blue, Sky Blue, Lemon Lime).
- **For UI iconography**, the brand has no proprietary icon font/sprite supplied. We've adopted **Lucide** (CDN-available, MIT-licensed) as the working set — line icons, 1.75 px stroke, square caps, generous corner radius. This visually rhymes with the icon's geometric construction. **⚠️ Substitution flagged: confirm with designer whether Lucide is acceptable, or supply a chosen icon set.**

### Lucide setup
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<i data-lucide="zap"></i>
<script>lucide.createIcons();</script>
```

**Sizing scale:** 14 / 16 / 20 / 24 / 32 px (matches our type scale).
**Color:** inherits `currentColor`. Default state is `--fg-muted`; active / interactive icons go `--brand-azure-blue`.

### Emoji
- **Never in marketing surfaces.** The visual identity is mature and confident; emoji undercut it.
- In product chrome (e.g. status pills, empty-state illustrations), allowed sparingly only when standing in for a missing illustration — and replaced with a real asset as soon as one exists.

### Unicode glyphs as icons
- Acceptable for inline punctuation-style accents: `→` in CTAs, `·` as a dot separator. Never as a load-bearing icon.

### Logo + icon files
12 logo lockups + 6 icon-only variants are in `assets/`:

- `Logo-pos.svg` / `Logo-neg.svg` — **colored** 3-color lockup, for Warm White / Deep Blue backgrounds (the primary, on-brand choice)
- `Logo-black.svg` / `Logo-white.svg` — single-color flat lockup, for **non-brand surfaces** (white photo backgrounds, partner decks, print)
- `Logo-solid-black.svg` / `Logo-solid-white.svg` — single-shape silhouette (no negative-space cuts) — favicons, embroidery, etching, foil
- Same six again with `Logo-tagline-` prefix → adds the "part of STUDIO 27" sub-lockup
- Same six again as `Icon-` → just the 27 mark, no wordmark

Pick by background and context:
| Surface | Use |
|---|---|
| Warm White (brand) | `Logo-tagline-pos.svg` |
| Deep Blue / Off-Black (brand) | `Logo-tagline-neg.svg` |
| Pure white (non-brand, photo, partner deck) | `Logo-tagline-black.svg` |
| Pure black (non-brand) | `Logo-tagline-white.svg` |
| Tiny / favicon / single-tone reproduction | `Icon-solid-black.svg` / `Icon-solid-white.svg` |

---

## Substitutions flagged for the designer

1. **Niveau Grotesk → Outfit (Light primary)** — per Stylesheet v2. Loaded from Google Fonts.
2. **Icon set → Lucide** (CDN). No proprietary set was supplied. Confirm or replace.

---

## Caveats

- The Stylesheet PDF was OCR-scanned with character dropouts (e.g. "Niveu Grotesk", "Wrm White") — we reconstructed the intended values. Worth a sanity check from the designer.
- Color values reconstructed from the truncated PDF text using the supplied CMYK + RGB tuples; they cross-check.
- The pos/neg multi-color SVGs shipped without inlined fills (used CSS classes referencing a missing stylesheet). We patched the SVGs with direct `fill="…"` attributes against the brand palette so they render in any browser.
