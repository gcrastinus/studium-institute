# The Age of Chivalry

Static explorer for Thomas Bulfinch, *The Age of Chivalry* (1858), served at
<https://studiuminstitute.org/chivalry/> (same Cloudflare Pages pattern as `/trivium/`).

No build step. Open `index.html`. Routes are hashes, so no SPA rewrite is required:

- `/chivalry/` — two doors (knight hub + story map)
- `/chivalry/#/knight`
- `/chivalry/#/contents`
- `/chivalry/#/read/arthur-i` … `arthur-xxiii`, `mabinogi-intro` … `mabinogi-xiii`
- `/chivalry/#/search`
- `/chivalry/#/about`

Asset URLs are relative (`./css/`, `./js/`, `./data/`, `./images/`) and resolve under the `/chivalry/` subdirectory.

## Source text

- Project Gutenberg eBook **#4926**: <https://www.gutenberg.org/ebooks/4926>
- Plain text used here: <https://www.gutenberg.org/cache/epub/4926/pg4926.txt>
- Rebuild chapter JSON from `../chivalry-src/parse_gutenberg.py` (keeps a copy of the Gutenberg file in `chivalry-src/`).

The knight hub follows Bulfinch chapter I (page → esquire → knight, ceremony, tournaments, armor, classes of society). Boxes labeled **Beyond Bulfinch** are later historical accents, not his prose.

## Images

All plates are public-domain works or photographs of public-domain objects, taken from Wikimedia Commons (Beardsley, Waterhouse, Burne-Jones, Howard Pyle, Watts, Blair Leighton, manuscript illuminations, Lady Guest’s *Mabinogion* tradition, and similar). **No AI-generated art.** Each figure on the site carries a caption and a Commons link. The machine-readable list is `data/images.json`.

To refresh downloads: `python3 ../chivalry-src/download_images.py` then `python3 ../chivalry-src/fill_images.py`.
