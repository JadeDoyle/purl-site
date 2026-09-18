# Backups + recovery

Three layers of protection against losing your data.

## The short version

- **Recently Deleted**: anything you delete sits in trash for
  30 days. One tap to restore.
- **Snapshots**: the app auto-snapshots its entire state every
  day or so, keeping 7 days of history. Restore from a snapshot
  if something went badly wrong.
- **Backup files**: you can export a single `.purl` file with
  everything in it, save it to Drive / email it to yourself /
  share it however. The path for moving to a new device or
  keeping an off-device safety copy.

All three live under **More → Data**: Recover (the first two),
Backup (the third).

## Recently Deleted

When you delete a yarn, equipment item, project, or pattern, it
doesn't actually go away. It goes into trash for 30 days. During
that window you can restore it with a tap.

**More → Data → Recover** shows everything in the trash, newest
first, alongside a timeline of what you've recently *added* or
*imported* (so you can see both directions of what you've done
lately).

Tap **Restore** on a trash entry → the record comes back, files
and all. The action is logged in the timeline so you can see when
you restored.

After 30 days, trash entries are purged automatically; the files
they referenced get unlinked at the same time.

## Snapshots

Periodically (automatically, in the background, no setup) Purl
saves a snapshot of its entire state. Every yarn, every pattern,
every project, every photo reference, every preference.

7 days of snapshots are kept; older ones are pruned. They live
inside Purl's own storage, not anywhere you have to manage.

To use one: **More → Data → Recover** → scroll to **Snapshots**
at the bottom → tap a date. The diff view shows what's in the
snapshot that *isn't* in your current state. Pick what to
restore (per category, or per item).

Useful for the "I imported a bad backup over my data" or "I
deleted ten yarns thinking they were duplicates" cases, where the
per-item trash isn't enough.

The catch: snapshots are local-only. A factory reset of your phone
wipes them too. For off-device safety, use Backup files.

## Backup files (.purl)

**More → Data → Backup** opens the picker. Tick the categories you
want to include (Projects / Yarn / Patterns / Equipment / etc.).
Small things like settings, the colour palette, your fibre list,
your barcode templates, and your activity log always come along
automatically (they're shared across the app and you'd always
want them).

Tap **Export** → the system share sheet opens → save to Drive /
email to yourself / save to Files / send via WhatsApp / wherever.

The output is a single `.purl` file. The file size is roughly your
total stored data. For a year of active use, expect tens or
hundreds of MB depending on how many PDFs you've imported.

### Importing a backup

Two paths:

- **From inside the app**: More → Data → Backup → Import tab. Pick
  the `.purl` file.
- **From your file manager**: tap a `.purl` file directly. Purl
  opens straight to the import screen with the file pre-loaded.

The import shows a preview (what's inside, how old, what app
version produced it). Pick the merge strategy per category:

- **Add**: merges (keep yours + theirs).
- **Replace**: overwrites (only the imported records remain
  for that category).
- **Skip**: leaves that category alone.

## Sharing patterns + templates separately

Two smaller file formats for sharing *just* one thing:

- **.purlp**: a single hand-written pattern. Useful for "I made
  this beanie pattern, here you go." Share from the pattern's
  detail screen. Tapping a `.purlp` in a file manager opens Purl
  with the pattern added.
- **.purlt**: your barcode template library. Useful for
  bootstrapping a friend's stash. They don't have to scan every
  yarn themselves. Share from Barcode templates → the share icon
  in the header. Tapping a `.purlt` in a file manager opens Purl
  with the merge preview.

These are tiny JSON files (typically KB, not MB) and don't include
your yarn, projects, or photos. Just the named thing.

## Moving to a new device

1. On the old device: **More → Data → Backup → Export**. Tick
   everything. Save the `.purl` file somewhere accessible
   (Drive, email, USB transfer).
2. Install Purl on the new device.
3. Open the `.purl` file from the new device's file manager (or
   import via the Backup screen). Use **Replace** for every
   category: the new device is empty.

That's it. PDFs, photos, drawings, sticky notes, dye lots,
counters: everything travels.

## See also

- [Yarn stash](./yarn-stash.md): the stash that's being backed
  up.
- [Barcode templates](./barcode-templates.md): the `.purlt`
  format for sharing template libraries.
- [Patterns](./patterns.md): the `.purlp` format for sharing
  patterns.
