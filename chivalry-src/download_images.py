#!/usr/bin/env python3
"""Resolve and download public-domain Wikimedia illustrations by search."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT.parent / "chivalry" / "images"
DATA_DIR = ROOT.parent / "chivalry" / "data"
UA = "StudiumInstituteChivalry/1.0 (https://studiuminstitute.org/chivalry/; educational static site)"

QUERIES = [
    ("home-questing-beast.jpg", "Beardsley Questing Beast Arthur", "Aubrey Beardsley, How King Arthur saw the Questing Beast, from Le Morte d'Arthur (1893–94)."),
    ("knight-accolade.jpg", "Edmund blair leighton accolade", "Edmund Blair Leighton, The Accolade (1901)."),
    ("knight-tournament.jpg", "Codex Manesse Walther von Klingen joust", "Tournament / joust from the Codex Manesse (c. 1300–1340)."),
    ("knight-mail.jpg", "hauberk mail shirt medieval", "Mail hauberk (chain-mail shirt), photograph of a historic object."),
    ("knight-helm.jpg", "great helm", "Great helm of the thirteenth or fourteenth century."),
    ("arthur-i.jpg", "Edmund blair leighton accolade", "Edmund Blair Leighton, The Accolade (1901)."),
    ("arthur-ii.jpg", "Brutus of Troy", "Brutus of Troy, from an early British chronicle illustration."),
    ("arthur-iii.jpg", "Beguiling of Merlin Burne-Jones", "Edward Burne-Jones, The Beguiling of Merlin (1874–77)."),
    ("arthur-iv.jpg", "Howard Pyle Arthur sword stone", "Howard Pyle, How Arthur Drew Forth ye Sword (1903)."),
    ("arthur-v.jpg", "Howard Pyle Lady of the Lake Excalibur", "Howard Pyle, The Lady of the Lake telleth Arthur of the sword Excalibur (1903)."),
    ("arthur-vi.jpg", "Gawain Green Knight Cotton Nero manuscript", "Sir Gawain and the Green Knight, British Library MS Cotton Nero A.x (c. 1400)."),
    ("arthur-vii.jpg", "Gawain Green Knight beheading Cotton Nero", "The beheading game, Gawain and the Green Knight, Cotton Nero A.x."),
    ("arthur-viii.jpg", "Beardsley How Sir Launcelot was known", "Aubrey Beardsley, Lancelot, from Le Morte d'Arthur (1893–94)."),
    ("arthur-ix.jpg", "Beardsley Launcelot Morte d Arthur illustration", "Aubrey Beardsley, Lancelot, from Le Morte d'Arthur (1893–94)."),
    ("arthur-x.jpg", "Waterhouse Lady of Shalott 1888", "John William Waterhouse, The Lady of Shalott (1888). Tate Britain."),
    ("arthur-xi.jpg", "William Morris La Belle Iseult Guinevere", "William Morris, La Belle Iseult / Queen Guinevere (1858)."),
    ("arthur-xii.jpg", "Tristan Isolde potion Waterhouse OR manuscript", "Tristan and Isolde with the love potion, public-domain painting or illumination."),
    ("arthur-xiii.jpg", "Tristan Isolde painting public domain", "Tristan and Iseult, public-domain painting."),
    ("arthur-xiv.jpg", "Beardsley knights fighting Morte d Arthur", "Aubrey Beardsley, combat of knights, from Le Morte d'Arthur (1893–94)."),
    ("arthur-xv.jpg", "Winchester Round Table", "The Winchester Round Table, Great Hall, Winchester Castle."),
    ("arthur-xvi.jpg", "Palomides Palamedes Arthurian", "Sir Palomides (Palamedes), from an Arthurian illustration."),
    ("arthur-xvii.jpg", "Tristan harp manuscript", "Tristan as harper, medieval illumination."),
    ("arthur-xviii.jpg", "Perceval grail manuscript illumination", "Perceval and the Grail, medieval illumination."),
    ("arthur-xix.jpg", "Beardsley Holy Grail is Achieved", "Aubrey Beardsley, The Holy Grail is Achieved (1893)."),
    ("arthur-xx.jpg", "Watts Sir Galahad", "George Frederic Watts, Sir Galahad (1862)."),
    ("arthur-xxi.jpg", "Burne-Jones Holy Grail tapestry Galahad", "Edward Burne-Jones, The Achievement of the Grail (Holy Grail tapestries)."),
    ("arthur-xxii.jpg", "Death of King Arthur Archer OR Mordred", "The death of Arthur, public-domain painting or illustration."),
    ("arthur-xxiii.jpg", "Last Sleep of Arthur in Avalon", "Edward Burne-Jones, The Last Sleep of Arthur in Avalon (1881–1898)."),
    ("mabinogi-intro.jpg", "Red Book of Hergest", "The Red Book of Hergest (Llyfr Coch Hergest), Jesus College, Oxford."),
    ("mabinogi-i.jpg", "Stonehenge engraving", "Stonehenge, long associated in chronicle with the Britons."),
    ("mabinogi-ii.jpg", "Yvain Knight of the Lion", "Yvain / Owain, the Knight of the Lion."),
    ("mabinogi-iii.jpg", "Yvain lion manuscript", "Yvain with the lion, from a manuscript of Chrétien de Troyes."),
    ("mabinogi-iv.jpg", "Yvain fountain Chrétien", "The Lady of the Fountain / Yvain cycle illumination."),
    ("mabinogi-v.jpg", "Geraint and Enid", "Geraint and Enid, from a Victorian Arthurian illustration."),
    ("mabinogi-vi.jpg", "Enid Idylls of the King", "Enid, from Tennyson's Idylls of the King."),
    ("mabinogi-vii.jpg", "Geraint son of Erbin", "Geraint, knight of the Round Table."),
    ("mabinogi-viii.jpg", "Pwyll Rhiannon", "Pwyll, Prince of Dyfed, and Rhiannon."),
    ("mabinogi-ix.jpg", "Branwen Llyr", "Branwen, daughter of Llŷr."),
    ("mabinogi-x.jpg", "Manawydan Mabinogi", "Manawydan fab Llŷr."),
    ("mabinogi-xi.jpg", "Culhwch and Olwen", "Culhwch and Olwen (Kilwich and Olwen)."),
    ("mabinogi-xii.jpg", "Twrch Trwyth", "The hunt of Twrch Trwyth, from Culhwch and Olwen."),
    ("mabinogi-xiii.jpg", "Taliesin bard", "Taliesin, chief of bards."),
    ("hero-beowulf.jpg", "Beowulf dragon illustration", "Beowulf and the dragon, public-domain illustration."),
    ("hero-cuchulain.jpg", "Cuchulain in Battle", "Cúchulainn in battle, public-domain Irish-cycle illustration."),
    ("hero-hereward.jpg", "Hereward the Wake", "Hereward the Wake, public-domain historical illustration."),
    ("hero-robin.jpg", "Louis Rhead Robin Hood", "Louis Rhead, Robin Hood, from a 1912 public-domain edition."),
]


def request_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search_files(query: str, limit: int = 8) -> list[str]:
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srnamespace": "6",
        "srlimit": str(limit),
        "format": "json",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    data = request_json(url)
    titles = []
    for hit in data.get("query", {}).get("search", []):
        title = hit.get("title") or ""
        if title.startswith("File:"):
            titles.append(title[5:])
    return titles


def image_info(title: str, width: int = 1200) -> dict | None:
    params = {
        "action": "query",
        "titles": f"File:{title}",
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiurlwidth": str(width),
        "format": "json",
        "redirects": "1",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    data = request_json(url)
    for page in data.get("query", {}).get("pages", {}).values():
        if "missing" in page:
            return None
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            return None
        mime = (info.get("mime") or "")
        if not mime.startswith("image/"):
            return None
        if mime not in {"image/jpeg", "image/png", "image/gif", "image/webp"}:
            return None
        size = info.get("size") or 0
        # Skip tiny files / icons
        w = info.get("thumbwidth") or info.get("width") or 0
        if w < 250 and size < 20000:
            return None
        return {"title": page.get("title", f"File:{title}")[5:], **info}
    return None


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as resp:
        dest.write_bytes(resp.read())


def pick(query: str) -> dict | None:
    for title in search_files(query):
        info = image_info(title)
        if info:
            return info
        time.sleep(0.08)
    return None


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    catalog = []
    for local, query, credit in QUERIES:
        dest = OUT_DIR / local
        print(local, "?", query)
        info = pick(query)
        if not info:
            print("  FAILED")
            catalog.append({"file": local, "ok": False, "credit": credit, "query": query})
            continue
        src = info.get("thumburl") or info.get("url")
        download(src, dest)
        print("  saved", dest.stat().st_size, "←", info["title"])
        meta = info.get("extmetadata") or {}
        artist = (meta.get("Artist") or {}).get("value") or ""
        license_short = (meta.get("LicenseShortName") or {}).get("value") or "Public domain"
        catalog.append({
            "file": local,
            "ok": True,
            "credit": credit,
            "commons": info["title"],
            "commonsUrl": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(info["title"].replace(" ", "_")),
            "artistHtml": artist,
            "license": license_short,
            "bytes": dest.stat().st_size,
        })
        time.sleep(0.12)

    mapping = {
        "home": "home-questing-beast.jpg",
        "knight": "knight-accolade.jpg",
        "knight-tournament": "knight-tournament.jpg",
        "knight-mail": "knight-mail.jpg",
        "knight-helm": "knight-helm.jpg",
    }
    for local, _, _ in QUERIES:
        stem = local.rsplit(".", 1)[0]
        if stem.startswith(("arthur-", "mabinogi-", "hero-")):
            mapping[stem] = local

    (DATA_DIR / "images.json").write_text(
        json.dumps({"mapping": mapping, "items": catalog}, indent=2) + "\n",
        encoding="utf-8",
    )
    failed = [c["file"] for c in catalog if not c["ok"]]
    print("done. failed:", failed or "none")


if __name__ == "__main__":
    main()
