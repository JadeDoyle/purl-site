# Barcode templates

Scanning a yarn ball-band shouldn't be just a one-shot prefill.
It should *teach the app* what that product is, so the next time
anyone scans it (you, a friend, a new install) the answer is there.

That's what barcode templates are for.

## The basic flow

You're at the yarn store. You buy two skeins of a Sandnes yarn
you've never logged before. At home:

1. **Stash → barcode icon** (next to Add yarn).
2. Camera opens, scan the ball-band.
3. Purl recognises Sandnes Sunday, opens the Add-yarn form
   prefilled with the brand, name, weight, fibre, gauge,
   recommended needle. You just type the colour name and the
   dye lot.
4. Save.

That recognition happens because Sandnes Sunday is in the bundled
**catalogue** that ships with Purl.

If the yarn isn't recognised:

3. *(unknown code)*: the form opens blank with the barcode
   attached. You fill in brand / name / weight / etc.
4. Save.

That **save** quietly creates a barcode template. The next time
you (or a friend with the same template) scan the same code,
it'll be recognised.

## The catalogue

Purl ships with a curated catalogue of ~20 Nordic yarn producers
and their lines: DROPS, Sandnes Garn, Ístex, Knitting for Olive,
Du Store Alpakka, Hillesvåg, Filcolana, Rauma, Dale, Camilla
Pihl, Viking of Norway, Järbo, Svarta Fåret, CaMaRose, Hjertegarn,
Isager, Novita, and more.

For most of them: brand, yarn names, weight, fibre, meterage,
populated. For some of them: colourways too (full DROPS range,
Ístex Lopi numbers, the entire Knitting for Olive named ranges).

The catalogue is **read-only at the source** but you can edit any
entry: your edit forks into your own template store. App
updates ship new catalogue entries without overwriting what
you've changed.

## Barcode templates view

**More → Barcode templates** opens the management surface.

At the top: a live camera for scanning. Below it: the list of
templates you own + everything in the catalogue (which surfaces
only when you search, so the day-one list isn't ~150 items long).

Each row: brand · name + a subtitle showing barcode count, weight,
fibre. Tap a row to open it.

Inside a template:

- **Barcodes**: a chip list. Add one via the text input;
  remove via the × on each chip. Multiple barcodes per template
  is the whole point: manufacturers cycle EAN codes between
  packaging runs, and an old skein + a fresh one can have
  different codes for the same product.
- Brand / name / weight / fibre / gauge / needle / meters / grams
  fields.

The **search field** above the list searches everything (brand,
name, weight, fibre, barcodes). Diacritic-folded: "jarbo" finds
Järbo.

## Duplicates

If you end up with two templates for the same yarn (a blank
weight one time, "DK" another time, or a slight name typo), Purl
notices: a **Possible duplicates** card appears at the top of the
list. Tap **Merge** on a group and they fold together: barcodes
unioned, blank fields filled from the others, the most-complete
entry kept as the primary.

You can also avoid creating duplicates in the first place:
v0.1.96+ uses brand + name as the identity for save-time matching,
falling back from brand + name + weight, so a blank weight won't
fork.

## Linking a scanned code to an existing template

If you scan an unknown code but you can see the matching product
in your library (or in the catalogue), tap **Or attach this
barcode to an existing template** in the form. A picker opens
(searchable across user + catalogue) to find the right product.
Tap it, the barcode gets attached, and you don't end up with two
templates for the same yarn.

## Sharing templates with a friend

**More → Barcode templates → share icon** in the header. Purl
writes a `.purlt` file with your whole template library and opens
the system share sheet. Email it / Drive it / AirDrop it.

Your friend receives the file, taps it (on Android with Purl
installed), Purl opens straight to the import screen and merges:

- Templates that match by brand + name + weight get their barcodes
  combined.
- New products land as fresh entries.

No yarn / projects / photos cross over. Just the template
catalogue.

## The flywheel

Over time:

1. You scan yarn → templates accrue in your library.
2. You share `.purlt` with your tester contact (or it rides in
   your regular `.purl` backups).
3. The new templates get folded into the bundled catalogue in a
   future Purl release.
4. The next user installing Purl gets your templates as part of
   the catalogue, ready to recognise on day one.

The whole catalogue is built this way. The folding-in step is
manual by design: Purl has no server, so nothing leaves your
device unless you choose to share it.

## See also

- [Yarn stash](./yarn-stash.md): the scan-into-stash flow
  from the user's side.
- [Backups + recovery](./backups.md): `.purlt` is one of the
  three share formats; the other two are `.purl` (whole backup)
  and `.purlp` (single pattern).
