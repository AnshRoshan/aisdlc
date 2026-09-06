# DESIGN.md — aisdlc site

## World: "the evidence ledger"
The product's whole promise is that state lives on disk and every claim has a recorded run. The site is designed as if you are reading that ledger: ink-black file surface, hash-chains, gate stamps, monospace where data appears, and a display voice with enough character to feel authored. Dark because the audience reads it in a terminal-adjacent context at night; not dark because devtools are dark.

## Tokens
- **Background:** `#0c100d` (ink green-black); raised surface `#121713`; deep well `#070a08`.
- **Foreground:** `#e8ede6`; secondary `#9aa697`; faint `#5d675b` (all green-tinted, never gray).
- **Accent (evidence green):** `#b1e57c` — gates, links, the running state. Used sparingly; emphasis comes from weight/size, not color.
- **Warning amber:** `#e5b567` — only for the "fake green" moment and unsigned states.
- **Line:** `#1f261f` at 1px. Radii: 10px controls, 14px panels. One elevation declaration (border, no shadow halos).

## Type
- Display: **Bricolage Grotesque** (self-hosted via @fontsource) — condensed-to-wide optical axis gives the headings a authored voice; tracking −0.03em, weight 600–700.
- Data/code: **IBM Plex Mono** (self-hosted) — for commands, hashes, gate IDs, file paths, table keys. Mono is never a costume; it marks anything that exists as a file.
- Body: Bricolage Grotesque 400 at 65–75ch measure.

## Motion
One authored moment: the hero gate pipeline ticks DISCOVER → SPEC → … → OPERATE on a loop with the current state stamped and the terminal line below reacting. Everything else is hover/focus transitions ≤160ms, exponential ease-out. `prefers-reduced-motion` stills the loop.

## Craft floor commitments
No kickers/eyebrows, no gradient text, no equal-card scaffolding as page structure, no glass. Themed selection, focus rings, scrollbar, underline offset, tabular numerals. Copy in the product's own language.
