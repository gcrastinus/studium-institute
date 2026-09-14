# Chivalry explorer source

Maintain the static site in `../chivalry/` (Cloudflare serves that folder with no build).

```bash
python3 parse_gutenberg.py      # writes ../chivalry/data/chapters and manifest.json
python3 download_images.py      # Wikimedia search → ../chivalry/images
python3 fill_images.py          # targeted replacements for misses
```

`pg4926.txt` is Project Gutenberg eBook #4926 (*The Age of Chivalry*).
