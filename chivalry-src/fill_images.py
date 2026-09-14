#!/usr/bin/env python3
"""Fill missing/wrong plates with targeted Commons searches; keep PD/CC0 only."""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT.parent / "chivalry" / "images"
DATA = ROOT.parent / "chivalry" / "data" / "images.json"
UA = "StudiumInstituteChivalry/1.0 (https://studiuminstitute.org/chivalry/; educational static site)"

JOBS = [
    ("home-questing-beast.jpg", ["How King Arthur saw the Questing Beast Beardsley", "Beardsley Questing Beast Morte"],
     "Aubrey Beardsley, How King Arthur saw the Questing Beast, from Le Morte d'Arthur (1893–94)."),
    ("arthur-ii.jpg", ["Historia Regum Britanniae manuscript", "Geoffrey of Monmouth kings of Britain", "Brutus Trojan Britain woodcut"],
     "An early illustration of the British chronicle tradition (Brutus / Geoffrey of Monmouth)."),
    ("arthur-vii.jpg", ["Gawain and the Green Knight Cotton Nero", "Green Knight beheading Gawain manuscript"],
     "Gawain and the Green Knight, British Library MS Cotton Nero A.x."),
    ("arthur-ix.jpg", ["Beardsley How Queen Guenever rode a-Maying", "Beardsley Guenever Morte d'Arthur", "Aubrey Beardsley Launcelot illustration"],
     "Aubrey Beardsley, from Le Morte d'Arthur (1893–94)."),
    ("arthur-xiv.jpg", ["Beardsley How King Arthur slew the giant", "Beardsley combat knights Morte", "How Sir Launcelot fought Beardsley"],
     "Aubrey Beardsley, from Le Morte d'Arthur (1893–94)."),
    ("arthur-xvii.jpg", ["Tristan Isolde harp medieval", "Tristan playing harp illumination", "Tristan Isolde 14th century manuscript"],
     "Tristan as harper, from a medieval Tristan manuscript."),
    ("arthur-xviii.jpg", ["Perceval Conte du Graal manuscript", "Perceval Grail castle illumination", "Parsifal medieval manuscript"],
     "Perceval / the Grail castle, medieval illumination."),
    ("mabinogi-i.jpg", ["Stonehenge Constable", "Stonehenge 18th century engraving", "Stonehenge Glastonbury print 1800"],
     "Stonehenge, a monument the chronicles connect with the early Britons."),
    ("mabinogi-iv.jpg", ["Yvain Calogrenant fountain manuscript", "Yvain Knight Lion fountain", "Owain fountain Mabinogion Guest"],
     "The fountain adventure of Yvain / Owain, medieval illumination."),
    ("mabinogi-x.jpg", ["Mabinogion Guest illustration", "Rhiannon horse Mabinogion", "Celtic race myths legends illustration 1910"],
     "Illustration from a public-domain Mabinogion / Celtic-legend edition."),
    ("mabinogi-xii.jpg", ["Culhwch Olwen Guest illustration", "salmon of Llyn Llyw", "Twrch Trwyth Guest"],
     "An illustration from Lady Charlotte Guest’s Mabinogion tradition (public domain)."),
]


def request_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode("utf-8"))


def search_files(query: str, limit: int = 10) -> list[str]:
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
    out = []
    for hit in data.get("query", {}).get("search", []):
        title = hit.get("title") or ""
        if title.startswith("File:"):
            out.append(title[5:])
    return out


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
        mime = info.get("mime") or ""
        if mime not in {"image/jpeg", "image/png", "image/gif", "image/webp"}:
            return None
        w = info.get("thumbwidth") or info.get("width") or 0
        if w < 280:
            return None
        low = title.lower()
        if "geograph" in low or "charaxes" in low or "butterfly" in low:
            return None
        meta = info.get("extmetadata") or {}
        license_short = ((meta.get("LicenseShortName") or {}).get("value") or "").lower()
        # Prefer PD; allow CC0. Skip modern CC-BY photographs.
        if license_short and "public domain" not in license_short and "pd" not in license_short and "cc0" not in license_short and "cc-zero" not in license_short:
            if "cc-by" in license_short or "cc by" in license_short:
                return None
        return {"title": page.get("title", f"File:{title}")[5:], **info}
    return None


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as resp:
        dest.write_bytes(resp.read())


def pick(queries: list[str]) -> dict | None:
    seen = set()
    for q in queries:
        for title in search_files(q):
            if title in seen:
                continue
            seen.add(title)
            info = image_info(title)
            if info:
                return info
            time.sleep(0.08)
    return None


def main() -> None:
    payload = json.loads(DATA.read_text())
    by_file = {it["file"]: it for it in payload["items"]}
    for local, queries, credit in JOBS:
        print(local)
        info = pick(queries)
        if not info:
            print("  still missing")
            continue
        dest = OUT_DIR / local
        src = info.get("thumburl") or info.get("url")
        download(src, dest)
        print("  saved", dest.stat().st_size, "←", info["title"])
        meta = info.get("extmetadata") or {}
        by_file[local] = {
            "file": local,
            "ok": True,
            "credit": credit,
            "commons": info["title"],
            "commonsUrl": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(info["title"].replace(" ", "_")),
            "artistHtml": (meta.get("Artist") or {}).get("value") or "",
            "license": (meta.get("LicenseShortName") or {}).get("value") or "Public domain",
            "bytes": dest.stat().st_size,
        }
        time.sleep(0.12)
    payload["items"] = list(by_file.values())
    DATA.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    failed = [it["file"] for it in payload["items"] if not it.get("ok")]
    print("remaining failed:", failed or "none")


if __name__ == "__main__":
    main()
