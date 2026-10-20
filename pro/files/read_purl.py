"""Read a Purl .purl backup (format 3) and unpack it.

Usage: python read_purl.py backup.purl [out_dir]

Prints the manifest summary. With out_dir, writes manifest.json, one JSON
file per stored record list, and every raw file (PDFs, photos, chart files)
under out_dir/files/<dir>/. Standard library only.
"""
import json
import os
import struct
import sys


def read_purl(path):
    with open(path, 'rb') as f:
        head = f.read(24)
        if len(head) < 24 or head[:4] != b'PURL':
            raise ValueError('not a format 3 Purl backup (no PURL magic)')
        version = struct.unpack('<I', head[4:8])[0]
        manifest_len = int(head[8:24].decode('ascii'), 16)
        manifest = json.loads(f.read(manifest_len).decode('utf-8'))
        if manifest.get('_purl') != 'purl-backup':
            raise ValueError('manifest is not a Purl backup')
        offset = 24 + manifest_len
        entries = []
        for entry in manifest.get('files', []):
            entries.append((entry, offset))
            offset += entry['size']
        return version, manifest, entries


def main():
    path = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    version, manifest, entries = read_purl(path)
    size = os.path.getsize(path)
    end = entries[-1][1] + entries[-1][0]['size'] if entries else None
    print('format', version, 'app', manifest.get('appVersion'), 'exported', manifest.get('exportedAt'))
    print('records:', ', '.join(sorted(manifest['data'].keys())))
    print('files:', len(entries), 'archive bytes', size, 'payload ends at', end)
    if not out:
        return
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8') as m:
        json.dump(manifest, m, indent=2, ensure_ascii=False)
    for key, value in manifest['data'].items():
        name = key.replace(':', '_') + '.json'
        with open(os.path.join(out, name), 'w', encoding='utf-8') as r:
            json.dump(json.loads(value), r, indent=2, ensure_ascii=False)
    with open(path, 'rb') as f:
        for i, (entry, start) in enumerate(entries):
            folder = os.path.join(out, 'files', os.path.basename(entry['dir']))
            os.makedirs(folder, exist_ok=True)
            name = '%03d_%s' % (i, os.path.basename(entry['uri'].split('?')[0]) or 'file')
            f.seek(start)
            with open(os.path.join(folder, name), 'wb') as w:
                w.write(f.read(entry['size']))


if __name__ == '__main__':
    main()
