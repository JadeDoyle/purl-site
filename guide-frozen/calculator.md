# Calculator

Two calculators in the app:

- **The big one**: opened from More → Calculator, from the pattern
  reader header, from the PDF viewer tools, or from the calculator
  icon next to a project's gauge row. A quick-math card up top,
  then the craft tools: gauge swatch, stitch resize, even shaping,
  skeins needed.
- **The little one**: inline four-function calculator inside the
  PDF viewer's tools dial. Quick arithmetic mid-row without leaving
  the PDF.

This page covers the big one.

## Quick math

At the top: a four-function calculator with parentheses, for the
in-between numbers ("3 skeins × 175 m"). Below it, the craft
sections stack vertically; scroll through them and fill in just
the one you need. The others stay empty.

### Gauge swatch

You knit a swatch. You measure it:

- Number of **stitches** across.
- Over what **width** (cm or in).
- Number of **rows** down.
- Over what **height**.

The calculator gives you stitches-per-cm and rows-per-cm (or
per-inch), plus a hint at the implied yarn weight.

### Stitch resize

You have a pattern. The pattern was knit at a certain gauge, but
you knit at a different gauge. How many stitches do you cast on
to hit the same finished dimensions?

- Pattern's gauge (sts × rows / over).
- Your actual gauge.
- The pattern's original stitch count.

Output: the stitch count you need at your gauge. Same for rows.

### Even shaping

You need to decrease (or increase) some number of stitches
evenly across a row.

- Total stitches.
- How many to decrease (or increase).
- Edge padding optional.

Output: an instruction string like "k4, *k2tog, k7* until 6 sts,
k6", what you'd write into a custom shaping row.

The calc rounds in favour of leaving extra rather than running
short.

### Skeins needed

You estimate the project needs X meters of yarn. Each skein
is Y meters. How many skeins do you buy?

Output: skeins (rounded up), with **+10%** and **+20%** safety
lines so you can pick your risk tolerance.

## Seeding from a project

Open the calculator from a project's gauge row (the calculator
icon next to the actual-gauge line) and the gauge swatch opens
pre-filled with what you recorded. Saves you re-typing.

Open from the pattern reader header and no specific gauge is
pre-loaded (there's no project context).

## Tips

- Stitches-per-cm is more precise than per-10cm, but the display
  shows the span you typed (so "22 sts over 10 cm" stays as
  written; the math is done at higher precision under the
  hood).
- Quick math handles negative numbers, decimals, and parentheses
  fine, but doesn't have scientific functions (sin/cos/log). Use
  your phone's built-in calculator if you need those.

## See also

- [Projects](./projects.md): the gauge row and the
  calculator-icon path.
- [PDF tools](./pdf-tools.md): the inline four-function calc
  inside the PDF viewer.
