# C-MORE Brand Style Sheet

> The official C-MORE brand skill file was not provided to this build. This sheet
> captures the visual direction stated in `product-spec-g1.md` Section 10 so the
> tool renders on-brand. Replace it with the canonical brand file when available,
> then reconcile `tailwind.config.js` and `src/index.css`.

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| Deep Blue | `#141A32` | Identification — headers, primary buttons, brand mark |
| Lime | `#C0FA00` | Accent **only** — used sparingly (active states, highlights) |
| Off White | `#FAFAFA` | Page backgrounds |
| Ink | `#1F2333` | Body text |
| Slate | `#5B6072` | Secondary text, labels |
| Line | `#E6E7EC` | Borders, dividers |

**Neutrals lead.** Lime is a spark, not a fill — avoid large lime areas.

## Typography

- **Figtree** (Google Fonts), weights 400/500/600/700.
- Headings 600–700, Deep Blue or Ink; body 400 Ink; labels 500 Slate.

## Surfaces

- Cards: white, `1px` Line border, soft shadow, ~14px radius.
- Inputs: white, Line border; focus ring in Deep Blue.
- Generous whitespace; calm, auditable, data-forward feel (matches G-2).

## Where it's implemented

- Color + font tokens: `tailwind.config.js`
- Reusable classes (`.btn-primary`, `.card`, `.field-input`, …): `src/index.css`
