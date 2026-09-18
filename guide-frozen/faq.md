# FAQ

Things that come up often, things that look like bugs but aren't,
and known limitations.

## Does Purl upload my data anywhere?

No. Everything lives on your device. Purl has no account system,
no cloud, no analytics, no telemetry. You can use it on an
airplane. The trade-off is that backups are your responsibility
(see [backups](./backups.md)) but the app makes them simple.

## How do I move my data to a new phone?

Export a `.purl` backup from More → Data → Backup, transfer the
file to the new device (Drive, email, USB, anything works),
install Purl on the new phone, and import. See
[backups](./backups.md) for the step-by-step.

## I deleted something by accident.

Don't panic. **More → Data → Recover** has your back:

- **Recently Deleted**: anything you deleted in the last 30 days
  is restorable with a tap.
- **Snapshots**: the app auto-snapshots its state daily; 7 days
  of history. Useful for "I deleted ten yarns thinking they were
  duplicates" or "I imported a backup over my data" cases.

## Search isn't finding something I know is there.

Try searching with fewer letters; the search is substring-based
(so "lopi" finds "Léttlopi", "jarbo" finds "Järbo"). It also
folds accents in both directions. It does *not* yet handle typos
(so "Sandnse" won't find "Sandnes", type carefully).

Each tab (Stash, Patterns, Projects, Barcode templates) has its
own search above the list. The **global search** (magnifying
glass in the More header) searches across everything: projects,
patterns, yarn, equipment, PDF sticky notes, PDF bookmarks, and
the glossary.

## The Norwegian translation has a typo / awkward phrase.

Send a note via **More → Send feedback**. Norwegian translations
are reviewed before sign-off; if something sounds wrong, it
probably is.

## The PDF tools button is in the way.

Drag it. The floating button is movable to wherever you want it
(any corner, any edge) and it remembers its position per device.
You can also reorder or hide the tools it shows, and tune its
spacing and transparency, in **Settings**.

## My drawings on a PDF vanished after I tapped Clear.

The Clear button asks first ("This page only" vs "All pages")
since v0.1.98. If you tapped "All pages", it's wiped. If you
realised right after: open Recovery and restore from the most
recent snapshot (your annotations are part of the snapshot).

## A scan didn't recognise my yarn.

The bundled catalogue covers Nordic producers. If you scanned a
non-Nordic yarn (Cascade, Madelinetosh, Brooklyn Tweed, etc.),
the code is unknown until you save the yarn for the first time,
after which the app remembers. Scan again later → it's
recognised.

If you scanned a Nordic yarn that *should* be in the catalogue
and isn't, that's worth feeding back. The catalogue gets richer
in each release.

## The autofill suggestions are wrong / outdated.

Type your own value. The suggestion list is just a helping
hand. Autofill only fills *empty* fields when you pick from a
suggestion; it never overwrites what you've typed.

If a catalogue entry is wrong (a yarn's meterage changed, a
weight got reclassified), edit your version. Your edit forks
into your own record; the catalogue keeps its version
underneath. Send feedback so we can fix the catalogue for
everyone.

## Why does the same yarn show up twice in my stash?

Two reasons:

- **Different dye lots.** Two skeins with the same brand + name +
  colour but different dye lots are tracked separately because
  shade can vary by lot. The stash groups them under the same
  yarn entry.
- **Different colourways.** Two skeins of the same yarn line in
  different colours are different stash entries.

The stash list groups by brand + name first, then by colour
inside, then by dye lot inside that. If you have *actually*
two duplicate entries for the same yarn / same colour / same
dye lot, merge by deleting one and adjusting the other's skein
count.

## My barcode template list has duplicates.

Open Barcode templates. If there are same-product duplicates
(blank weight one time, "DK" another, or a name typo), a
**Possible duplicates** card appears at the top with a Merge
button per group. Tap to merge.

## Are PDFs included in backups?

Yes. A `.purl` backup with the Patterns category ticked includes
every imported PDF file, every cover thumbnail, every drawing,
every sticky note. The backup file is correspondingly bigger.

## How do I share a pattern with a friend?

For a pattern you wrote: pattern detail → Share → it writes a
`.purlp` file you can email / Drive / AirDrop.

For a PDF you imported: share the PDF itself via your phone's
normal share sheet (out of any file manager that can see it).
There's no Purl-specific "share PDF" affordance. It's just a
PDF, sharable like any other.

For your scanned barcode library (so a friend doesn't have to
re-scan every yarn): Barcode templates → share icon in the
header → `.purlt` file.

## Where's the iPhone version?

In progress. The Android build is the testing-iteration target
right now because the test device is a Samsung S25. iOS comes via
the App Store path eventually; no ETA, but the codebase is
designed for both from day one.

## A feature seems missing / I want X.

Two places to look:

- **More → Roadmap**: what's planned next.
- **More → Changelog**: what shipped recently.

If your idea isn't on either, **More → Send feedback** is the
direct line. Every note is read.
