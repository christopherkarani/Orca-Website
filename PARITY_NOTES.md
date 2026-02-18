# Ollama Clone — Parity Notes (Hero + Next Deltas)

Date: 2026-02-14

This document captures what we learned from the initial clone pass, what’s still different vs https://ollama.com, what we should go measure on the real site, and what to implement next.

## Current State (What’s already close)
- High-level layout rhythm is correct: generous whitespace, centered hero, feature row, integrations grid, CTA, minimal footer.
- Nav structure is correct: logo/links left, search centered, pills right.
- Pills/tabs are in the right family (rounded, light/dark treatment).
- `.font-rounded` utility exists and is used on key headings.
- Hero code pill was updated to match reference structure (`pre` wrapper + `code` padding + copy button hitbox).

## What’s still different in the hero (largest visual deltas)
1) **Mascot/mark**
   - Reference uses a specific Ollama mark (thin-stroke SVG, distinctive silhouette).
   - Clone still uses a placeholder icon; this is the most obvious mismatch.

2) **Headline typography tuning**
   - Even with `.font-rounded`, the exact **font face**, weight, size, line-height, and potentially letter-spacing differ.
   - Optical spacing between the two headline lines can be slightly off.

3) **Hero vertical rhythm**
   - Spacing from mascot → headline → code pill → helper text looks tuned on ollama.com.
   - Clone is “close” but reads slightly looser.

4) **Install pill micro-details**
   - Still needs confirmation of exact gap/placement between code and copy button and exact icon sizing.

5) **Helper text underline treatment**
   - On ollama.com the underline styling is subtle (thickness/offset + color/hover).
   - Clone uses default underline; looks a bit harsher.

## Things we likely missed (parity levers not yet implemented)
- **Font loading**: verifying whether ollama.com actually serves SF Pro Rounded (and how it behaves cross-platform). Utility alone isn’t parity.
- **Hero max-width / container math**: hero may use different constraints than the rest of the page.
- **Icon/SVG fidelity**: real search icon, copy icon, and mascot asset.
- **Interaction states**: hover/focus-visible rings, transitions (duration/easing), and consistent state styling.
- **Breakpoint-specific tweaks**: hero spacing/typography can change at non-trivial breakpoints beyond just `md:`.
- **Tokens/components**: repeated patterns should be componentized and driven by semantic tokens (avoids ad-hoc class drift).

## What to measure next on the real ollama.com (targeted scrape)
Hero-focused computed styles + DOM structure:
1) Hero container: padding-top/bottom, any max-width constraints.
2) Mascot element: exact SVG asset (paths), width/height, stroke width.
3) `h1`: font-family actually used, font-size, line-height, font-weight, letter-spacing, margins.
4) Install `pre/code/button`: exact gap/alignment, copy icon size.
5) Helper text + link: color, underline offset/thickness, hover color.

## What to implement next in the clone
1) **Replace placeholder mascot with extracted Ollama SVG** and match size/spacing.
2) **Match hero typography exactly** (computed `font-size`, `line-height`, `letter-spacing`, `font-weight`, margins).
3) **Make hero spacing literal**: tune section padding and element margins to measured values.
4) **Implement helper underline style** via CSS utility (underline offset/thickness) matching reference.
5) Optionally: **componentize hero** (`Hero.tsx`) and introduce **semantic tokens** in Tailwind config once measurements stabilize.

## Notes / Constraints
- Next.js dev server was previously running on :3003 and later got SIGKILL; this doesn’t affect builds.
- Next.js warns about multiple lockfiles; harmless but should be cleaned up later for consistency.
