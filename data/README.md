# Indonesian delivery regions

Bundled hierarchy from https://github.com/cahyadsn/wilayah (`db/wilayah.sql`), joined by Kemendagri village code with https://github.com/cahyadsn/wilayah_kodepos (`json/wilayah_kodepos.json`). Retrieved 2026-09-20. Both MIT licenses are retained in `licenses/`.

91,599 entries: 38 provinces and 83,762 villages. Every included village has a five-digit postal code. JSON tuples contain code, name, postal code. Only children of a selected region are sent to the browser; the full dataset stays on the server. Update both upstream snapshots together and validate hierarchy and postal coverage before replacing this file.
