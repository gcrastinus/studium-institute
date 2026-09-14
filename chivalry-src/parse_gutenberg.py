#!/usr/bin/env python3
"""Parse Project Gutenberg #4926 into chapter JSON for the Chivalry explorer."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "pg4926.txt"
OUT = ROOT.parent / "chivalry" / "data"

ARTHUR_TITLES = {
    1: "Introduction",
    2: "The Mythical History of England",
    3: "Merlin",
    4: "Arthur",
    5: "Arthur (Continued)",
    6: "Sir Gawain",
    7: "Caradoc Briefbras; or, Caradoc with the Shrunken Arm",
    8: "Launcelot of the Lake",
    9: "The Adventure of the Cart",
    10: "The Lady of Shalott",
    11: "Queen Guenever's Peril",
    12: "Tristram and Isoude",
    13: "Tristram and Isoude (Continued)",
    14: "Sir Tristram's Battle with Sir Launcelot",
    15: "The Round Table",
    16: "Sir Palamedes",
    17: "Sir Tristram",
    18: "Perceval",
    19: "The Sangreal, or Holy Graal",
    20: "The Sangreal (Continued)",
    21: "The Sangreal (Continued)",
    22: "Sir Agrivain's Treason",
    23: "Morte d'Arthur",
}

MABINOGI_TITLES = {
    0: "Introductory Note",
    1: "The Britons",
    2: "The Lady of the Fountain",
    3: "The Lady of the Fountain (Continued)",
    4: "The Lady of the Fountain (Continued)",
    5: "Geraint, the Son of Erbin",
    6: "Geraint, the Son of Erbin (Continued)",
    7: "Geraint, the Son of Erbin (Continued)",
    8: "Pwyll, Prince of Dyved",
    9: "Branwen, the Daughter of Llyr",
    10: "Manawyddan",
    11: "Kilwich and Olwen",
    12: "Kilwich and Olwen (Continued)",
    13: "Taliesin",
}

FIGURES = [
    ("Arthur", r"\bArthurs?\b"),
    ("Guenever", r"\bGuenever\b|\bGuinevere\b|\bGaynor\b"),
    ("Launcelot", r"\bLauncelots?\b|\bLancelot\b"),
    ("Merlin", r"\bMerlins?\b"),
    ("Gawain", r"\bGawains?\b|\bGawaine\b"),
    ("Tristram", r"\bTristrams?\b|\bTristan\b"),
    ("Isoude", r"\bIsoude\b|\bIseult\b|\bIsolde\b"),
    ("Perceval", r"\bPercevals?\b|\bPercival\b"),
    ("Galahad", r"\bGalahads?\b"),
    ("Palamedes", r"\bPalamedes\b|\bPalamede\b"),
    ("Kay", r"\bSir Kay\b|\bKay\b"),
    ("Bedivere", r"\bBedivere\b|\bBedwyr\b"),
    ("Mordred", r"\bMordred\b|\bModred\b"),
    ("Uther", r"\bUther\b"),
    ("Igraine", r"\bIgraine\b|\bIgerne\b"),
    ("Viviane", r"\bViviane\b|\bVivien\b|\bNimue\b|\bLady of the Lake\b"),
    ("Caradoc", r"\bCaradoc\b|\bCraddocke?\b|\bCradock\b"),
    ("Galehaut", r"\bGalehaut\b|\bGalahalt\b"),
    ("Geraint", r"\bGeraint\b|\bEnid\b"),
    ("Pwyll", r"\bPwyll\b|\bRhiannon\b"),
    ("Branwen", r"\bBranwen\b|\bBendigeid\b|\bBran\b"),
    ("Manawyddan", r"\bManawyddan\b"),
    ("Kilwich", r"\bKilwich\b|\bCulhwch\b|\bOlwen\b"),
    ("Taliesin", r"\bTaliesin\b|\bElphin\b"),
    ("Beowulf", r"\bBeowulfs?\b|\bGrendel\b"),
    ("Cuchulain", r"\bCuchulain\b|\bCúchulainn\b|\bEmer\b"),
    ("Hereward", r"\bHereward\b"),
    ("Robin Hood", r"\bRobin Hood\b|\bLittle John\b|\bMaid Marian\b"),
]

ROMAN = [
    "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX",
    "XX", "XXI", "XXII", "XXIII",
]


def roman_to_int(r: str) -> int:
    return ROMAN.index(r.upper())


def extract_body(raw: str) -> str:
    start = raw.find("*** START OF THE PROJECT GUTENBERG EBOOK THE AGE OF CHIVALRY ***")
    end = raw.find("*** END OF THE PROJECT GUTENBERG EBOOK THE AGE OF CHIVALRY ***")
    if start < 0 or end < 0:
        raise SystemExit("Could not find Gutenberg markers")
    return raw[start:end]


def slice_between(text: str, start: str, end: str | None) -> str:
    i = text.find(start)
    if i < 0:
        raise SystemExit(f"Missing marker: {start!r}")
    j = text.find(end, i + len(start)) if end else len(text)
    if end and j < 0:
        raise SystemExit(f"Missing end marker: {end!r}")
    return text[i:j]


HEADING_RE = re.compile(r"^[A-Z0-9][A-Z0-9 ,;:'().\-]{2,80}$")
VERSE_START_RE = re.compile(r'^ {0,3}["“]')


def is_heading(lines: list[str]) -> bool:
    if len(lines) > 3:
        return False
    blob = " ".join(ln.strip() for ln in lines)
    if len(blob) > 80:
        return False
    letters = [c for c in blob if c.isalpha()]
    if len(letters) < 4:
        return False
    upper = sum(1 for c in letters if c.isupper())
    return upper / len(letters) > 0.86 and blob not in {"I", "II", "III"}


def is_verse(lines: list[str]) -> bool:
    if not lines:
        return False
    stripped = [ln.strip() for ln in lines]
    avg = sum(len(s) for s in stripped) / len(stripped)
    first = lines[0]
    if len(stripped[0]) > 78 and not VERSE_START_RE.match(first):
        return False
    if VERSE_START_RE.match(first) and all(len(s) < 78 for s in stripped):
        return True
    indented = all(ln.startswith(" ") for ln in lines)
    if indented and len(lines) >= 2 and avg < 58:
        return True
    return False


def merge_poems(blocks: list[dict]) -> list[dict]:
    out: list[dict] = []
    for b in blocks:
        if b["type"] == "poem" and out and out[-1]["type"] == "poem":
            out[-1]["lines"].extend(b["lines"])
            continue
        if b["type"] == "poem":
            out.append({"type": "poem", "n": 0, "lines": list(b["lines"])})
            continue
        out.append(b)
    n = 0
    for b in out:
        if b["type"] == "poem":
            b["n"] = n
            n += 1
    return out


def unwrap(lines: list[str]) -> str:
    out: list[str] = []
    for ln in lines:
        s = ln.strip()
        if not out:
            out.append(s)
            continue
        if out[-1].endswith("-") and s[:1].islower():
            out[-1] = out[-1][:-1] + s
        else:
            out[-1] = out[-1] + " " + s
    text = " ".join(out)
    text = re.sub(r" +", " ", text)
    return text.strip()


def pretty_heading(text: str) -> str:
    small = {"of", "the", "and", "or", "a", "an", "with", "to", "in", "on"}
    words = re.split(r"(\s+)", text.title())
    # Keep all-caps acronyms reasonable; restore small words.
    rebuilt = []
    first = True
    for w in words:
        if not w.strip():
            rebuilt.append(w)
            continue
        low = w.lower()
        if not first and low in small:
            rebuilt.append(low)
        else:
            rebuilt.append(w)
        first = False
    return "".join(rebuilt).strip()


def parse_blocks(body: str) -> list[dict]:
    chunks = re.split(r"\n\s*\n+", body.strip())
    blocks: list[dict] = []
    poem_n = 0
    for chunk in chunks:
        lines = [ln.rstrip() for ln in chunk.splitlines() if ln.strip()]
        if not lines:
            continue
        if len(lines) == 1 and lines[0].strip().startswith("[Footnote"):
            blocks.append({"type": "note", "text": lines[0].strip().strip("[]")})
            continue
        if is_heading(lines):
            title = pretty_heading(" ".join(ln.strip() for ln in lines))
            if title.lower() in {"chapter i", "chapter ii"}:
                continue
            blocks.append({"type": "h", "text": title})
            continue
        if is_verse(lines):
            verse = [re.sub(r"^ +", "", ln).rstrip() for ln in lines]
            # Drop wrapping quotes that Gutenberg puts on each stanza start.
            blocks.append({"type": "poem", "n": poem_n, "lines": verse})
            poem_n += 1
            continue
        text = unwrap(lines)
        if re.fullmatch(r"CHAPTER [IVXLCDM]+", text):
            continue
        blocks.append({"type": "p", "text": text})
    return blocks


def figures_in(text: str) -> list[str]:
    found = []
    for name, pat in FIGURES:
        if re.search(pat, text, re.I):
            found.append(name)
    return found


def chapter_record(cid: str, part: str, num: str, title: str, body: str, kicker: str) -> dict:
    blocks = merge_poems(parse_blocks(body))
    # Drop a leading heading that merely repeats the chapter title.
    if blocks and blocks[0]["type"] == "h":
        if blocks[0]["text"].lower().replace(" ", "") == title.lower().replace(" ", ""):
            blocks = blocks[1:]
        elif blocks[0]["text"].upper() == title.upper():
            blocks = blocks[1:]
    plain = " ".join(
        b.get("text", " ".join(b.get("lines", []))) for b in blocks
    )
    return {
        "id": cid,
        "part": part,
        "num": num,
        "title": title,
        "kicker": kicker,
        "blocks": blocks,
        "figures": figures_in(plain),
        "excerpt": re.sub(r"\s+", " ", plain)[:420].strip(),
        "searchText": re.sub(r"\s+", " ", plain)[:1800].strip(),
        "wordCount": len(plain.split()),
        "poemCount": sum(1 for b in blocks if b["type"] == "poem"),
    }


def split_chapters(section: str, label: str) -> list[tuple[int, str]]:
    """Return (chapter_number, body) for CHAPTER N blocks."""
    parts = re.split(r"\nCHAPTER ([IVXLCDM]+)[ \t]*\n", section)
    # parts[0] is preamble; then num, body, num, body...
    out = []
    for i in range(1, len(parts), 2):
        num = roman_to_int(parts[i])
        body = parts[i + 1]
        out.append((num, body))
    if not out:
        raise SystemExit(f"No chapters found in {label}")
    return out


def main() -> None:
    raw = SRC.read_text(encoding="utf-8")
    book = extract_body(raw)

    contents_at = book.find("\nCONTENTS \n")
    first_ka = book.find("KING ARTHUR AND HIS KNIGHTS", contents_at)
    arthur_start = book.find("KING ARTHUR AND HIS KNIGHTS", first_ka + 10)
    if arthur_start < 0:
        raise SystemExit("Could not find narrative start of King Arthur")
    mabinogi_start = book.find("THE MABINOGEON", arthur_start + 10)
    heroes_start = book.find("HERO MYTHS OF THE BRITISH RACE", mabinogi_start + 10)
    glossary_start = book.find("\nGLOSSARY", heroes_start + 10)

    arthur_blob = book[arthur_start:mabinogi_start]
    mabinogi_blob = book[mabinogi_start:heroes_start]
    heroes_blob = book[heroes_start:glossary_start]

    chapters: list[dict] = []

    for num, body in split_chapters(arthur_blob, "Arthur"):
        title = ARTHUR_TITLES[num]
        chapters.append(
            chapter_record(
                f"arthur-{ROMAN[num].lower()}",
                "arthur",
                ROMAN[num],
                title,
                body,
                "King Arthur and His Knights",
            )
        )

    # Mabinogeon introductory note is before CHAPTER I.
    mab_parts = re.split(r"\nCHAPTER ([IVXLCDM]+)[ \t]*\n", mabinogi_blob)
    intro_body = mab_parts[0]
    # Strip the THE MABINOGEON heading.
    intro_body = re.sub(r"^\s*THE MABINOGEON\s*", "", intro_body)
    chapters.append(
        chapter_record(
            "mabinogi-intro",
            "mabinogi",
            "Note",
            "Introductory Note",
            intro_body,
            "The Mabinogeon",
        )
    )
    for i in range(1, len(mab_parts), 2):
        num = roman_to_int(mab_parts[i])
        body = mab_parts[i + 1]
        chapters.append(
            chapter_record(
                f"mabinogi-{ROMAN[num].lower()}",
                "mabinogi",
                ROMAN[num],
                MABINOGI_TITLES[num],
                body,
                "The Mabinogeon",
            )
        )

    hero_names = [
        ("BEOWULF", "hero-beowulf", "Beowulf", "Hero Myths of the British Race"),
        ("CUCHULAIN, CHAMPION OF IRELAND", "hero-cuchulain", "Cuchulain, Champion of Ireland", "Hero Myths of the British Race"),
        ("HEREWARD THE WAKE", "hero-hereward", "Hereward the Wake", "Hero Myths of the British Race"),
        ("ROBIN HOOD", "hero-robin", "Robin Hood", "Hero Myths of the British Race"),
    ]
    for i, (marker, cid, title, kicker) in enumerate(hero_names):
        start = heroes_blob.find(marker)
        if start < 0:
            raise SystemExit(f"Missing hero section {marker}")
        if i + 1 < len(hero_names):
            end = heroes_blob.find(hero_names[i + 1][0], start + 5)
        else:
            end = len(heroes_blob)
        body = heroes_blob[start + len(marker):end]
        chapters.append(chapter_record(cid, "heroes", "", title, body, kicker))

    # Author preface excerpt for About.
    pref_start = book.find("AUTHOR'S PREFACE")
    pref_end = book.find("\nCONTENTS \n", pref_start)
    preface_blocks = parse_blocks(book[pref_start:pref_end].replace("AUTHOR'S PREFACE", "", 1))

    chap_dir = OUT / "chapters"
    chap_dir.mkdir(parents=True, exist_ok=True)
    for ch in chapters:
        (chap_dir / f"{ch['id']}.json").write_text(
            json.dumps(ch, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

    manifest = {
        "title": "The Age of Chivalry",
        "author": "Thomas Bulfinch",
        "source": {
            "name": "Project Gutenberg eBook #4926",
            "url": "https://www.gutenberg.org/cache/epub/4926/pg4926.txt",
            "html": "https://www.gutenberg.org/ebooks/4926",
        },
        "parts": [
            {
                "id": "arthur",
                "title": "King Arthur and His Knights",
                "chapters": [c["id"] for c in chapters if c["part"] == "arthur"],
            },
            {
                "id": "mabinogi",
                "title": "The Mabinogeon",
                "chapters": [c["id"] for c in chapters if c["part"] == "mabinogi"],
            },
            {
                "id": "heroes",
                "title": "Hero Myths of the British Race",
                "chapters": [c["id"] for c in chapters if c["part"] == "heroes"],
            },
        ],
        "chapters": [
            {
                "id": c["id"],
                "part": c["part"],
                "num": c["num"],
                "title": c["title"],
                "kicker": c["kicker"],
                "figures": c["figures"],
                "excerpt": c["excerpt"],
                "searchText": c["searchText"],
                "wordCount": c["wordCount"],
                "poemCount": c["poemCount"],
            }
            for c in chapters
        ],
        "figures": sorted({f for c in chapters for f in c["figures"]}),
        "preface": preface_blocks[:8],
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"Wrote {len(chapters)} chapters")
    for c in chapters:
        print(f"  {c['id']:22} poems={c['poemCount']:2} words={c['wordCount']:5}  {c['title']}")


if __name__ == "__main__":
    main()
