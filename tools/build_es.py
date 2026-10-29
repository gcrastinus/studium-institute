#!/usr/bin/env python3
"""Build the Spanish pilot of the Preface to the Trivium.

  python3 tools/build_es.py

1. Patches every English page trivium/*.html (idempotent): + menu assets
   (css/plus.css, js/plus.js), hreflang alternates, cache-bust on nav.js.
2. Writes trivium/es/<page>.html for all 30 pages from the English page,
   replacing each translated block (located exactly as in
   /workspace/spanish-pilot/extract.py) with the Spanish from
   preface-es-final.md, and embedding the English of each block in a hidden
   <span class="en-orig" lang="en"> for "Show English".
The Spanish wording is never changed here; only markup conversion.
"""
import re, sys, html, os, copy
from bs4 import BeautifulSoup, NavigableString, Tag
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from locate import locate, STRUCT
ROOT = os.path.dirname(HERE)
TRIV = os.path.join(ROOT, 'trivium')
SRC = os.environ.get('ES_SOURCE', '/workspace/spanish-pilot/final/preface-es-final.md')
V = '20261029b'
SITE = 'https://studiuminstitute.org/trivium/'
ORDER = ("index where-to-begin why-words why-words-2 why-words-3 words-things words-things-2 grammar "
         "to-grammatica logic to-syllogistica rhetoric to-rhetorica three-arts quadrivium sources "
         "path-science path-science-2 path-science-3 path-thinking path-thinking-2 path-thinking-3 "
         "path-voice path-voice-2 path-voice-3 path-labels path-labels-3 path-math path-math-2 path-math-3").split()

def parse(path):
    t = open(path, encoding='utf-8').read()
    parts = re.split(r'^\**\[([\w\-.]+\.html) ¶(\d+)\]\**\s*$', t, flags=re.M)
    out = {}
    for i in range(1, len(parts), 3):
        body = parts[i + 2]
        m = re.search(r'^EN: (.*?)\n\nES: (.*?)\s*(?=\n---|\n## Página|\n==== page|\Z)', body.strip('\n') + '\n', flags=re.S | re.M)
        out.setdefault(parts[i], []).append((int(parts[i + 1]), m.group(1).strip(), m.group(2).strip()))
    return out

PREFIX = [r'Antetítulo: ', r'#{1,4} ', r'\[nota\] ', r'\[sección desplegable\] ', r'\[pie de página\] ',
          r'\[tarjeta de enlace\] ', r'> ', r'— ', r'- ', r'\d+\. ', r'[a-g]\. ']
def strip_prefix(es, kind, en):
    s = es
    if kind == 'tr': return s
    for p in PREFIX:
        m = re.match(p, s)
        if m:
            # only strip list/dash markers when the EN locator had them too
            if p in (r'— ',) and not en.startswith('— '): continue
            s = s[m.end():]; break
    return s

def md(s, emtag='em', strongtag='strong'):
    """Spanish markdown (only *x* and **x**) to HTML, escaping the text."""
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', lambda m: f'<{strongtag}>{m.group(1)}</{strongtag}>', s)
    s = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', lambda m: f'<{emtag}>{m.group(1)}</{emtag}>', s)
    return s

log = []
# Link texts that are not the target page's <h1>; Spanish taken verbatim from the final file's sentences.
LINK_ES = {'Why the Classical Tradition Begins with Words': 'Por qué la tradición clásica comienza por las palabras'}
def frag(h):
    return list(BeautifulSoup(h, 'html.parser').contents)

def inline_children(el, extra_keep=()):
    keep = set(STRUCT) | set(extra_keep)
    return [c for c in el.children if not (isinstance(c, Tag) and (c.name in keep or 'en-orig' in c.get('class', [])))]

def en_html(el, extra_keep=()):
    """English inline HTML of a block, links flattened to text, for the hidden copy."""
    parts = []
    for c in inline_children(el, extra_keep):
        c2 = copy.copy(c)
        if isinstance(c2, Tag):
            for a in ([c2] if c2.name == 'a' else []) + c2.find_all('a'):
                a.unwrap() if a is not c2 else None
            if c2.name == 'a': c2 = BeautifulSoup(c2.decode_contents(), 'html.parser')
        parts.append(str(c2))
    h = re.sub(r'\s+', ' ', ''.join(parts)).strip()
    return h

def add_en(el, h):
    sp = BeautifulSoup(f'<span class="en-orig" lang="en">{h}</span>', 'html.parser').span
    el.append(sp)

def replace_inline(el, new_html, extra_keep=()):
    kids = inline_children(el, extra_keep)
    anchor = None
    for k in kids:
        if anchor is None:
            anchor = k
    nodes = frag(new_html)
    if anchor is not None:
        for n in nodes: anchor.insert_before(n)
        for k in kids: k.extract()
    else:
        for n in reversed(nodes): el.insert(0, n)

def tags_used(el, names):
    for t in el.find_all(names):
        return t.name
    return None

def relink(el_en, es_html, titles, page, ix):
    """Put the EN element's inline links back around their Spanish text."""
    links = [a for a in el_en.find_all('a') if 'en-orig' not in (a.parent.get('class') or [])]
    for a in links:
        href = a.get('href', '')
        txt = a.get_text(' ', strip=True)
        cands = []
        if txt in LINK_ES: cands.append(LINK_ES[txt])
        if href in titles: cands.append(titles[href])
        cands.append(txt)
        done = False
        for c in cands:
            for v in (c, c[:1].lower() + c[1:], c[:1].upper() + c[1:]):
                i = es_html.find(html.escape(v, quote=False))
                if i >= 0 and not re.search(r'<a [^>]*>[^<]*$', es_html[:i]):
                    attrs = ''.join(f' {k}="{html.escape(" ".join(vv) if isinstance(vv, list) else vv)}"' for k, vv in a.attrs.items())
                    ev = html.escape(v, quote=False)
                    es_html = es_html[:i] + f'<a{attrs}>' + ev + '</a>' + es_html[i + len(ev):]
                    done = True; break
            if done: break
        if not done: log.append(f'LINK NOT PLACED {page} ¶{ix}: {txt} -> {href}')
    return es_html

def build_page(p, es_blocks, titles_es, h1_es):
    src = open(os.path.join(TRIV, p + '.html'), encoding='utf-8').read()
    soup = BeautifulSoup(src, 'html.parser')
    blocks = locate(soup)
    if len(blocks) != len(es_blocks):
        raise SystemExit(f'{p}: {len(blocks)} blocks in page, {len(es_blocks)} in source')
    for ix, ((kind, el, en_txt), (n, en_src, es)) in enumerate(zip(blocks, es_blocks), 1):
        assert n == ix, (p, n, ix)
        if kind == 'none' or el is None: continue
        body = strip_prefix(es, kind, en_txt)
        emtag = tags_used(el, ['em', 'i', 'cite']) or 'em'
        if kind == 'tr':
            cells = el.find_all(['td', 'th'])
            vals = [c.strip() for c in body.strip().strip('|').split(' | ')]
            if len(vals) != len(cells): log.append(f'TABLE CELLS {p} ¶{ix}: {len(vals)} vs {len(cells)}'); continue
            for c, v in zip(cells, vals):
                e = en_html(c)
                replace_inline(c, md(v, emtag))
                if e: add_en(c, e)
            continue
        if kind == 'card':
            bits = [html.escape(re.sub(r'\s+', ' ', x.get_text(' ')).strip(), quote=False)
                    for x in el.children if (x.get_text() if isinstance(x, Tag) else str(x)).strip()]
            e = ': '.join(bits)
            m = re.match(r'(.+?): (.*)$', body)
            head, rest = (m.group(1), m.group(2)) if m else (body, '')
            cls = el.get('class', [])
            if 'card' in cls and el.find('h3'):
                el.find('h3').string = head
                if el.find('p'): el.find('p').string = rest
            elif el.find('small'):
                el.find('small').string = head
                for k in [c for c in el.children if isinstance(c, NavigableString)]: k.extract()
                el.append(rest)
            elif el.find('span'):
                for k in [c for c in el.children if isinstance(c, NavigableString)]: k.extract()
                el.insert(0, head + ' ')
                el.find('span').string = rest
            else:
                log.append(f'CARD SHAPE {p} ¶{ix}')
            add_en(el, e)
            continue
        extra = ('footer',) if kind == 'bq' else ()
        if el.name == 'li': extra = ('ul', 'ol')
        # app-link inside a <p>: split "Abrir Ars X: un curso..." into text + span
        a = el.find('a', class_='app-link', recursive=False) if el.name == 'p' else None
        e = en_html(el, extra)
        if a is not None and a.find('span'):
            m = re.match(r'(.+?): (.*)$', body)
            for k in [c for c in a.children if isinstance(c, NavigableString)]: k.extract()
            a.insert(0, m.group(1) + ' ')
            a.find('span').string = m.group(2)
            add_en(a, ': '.join(html.escape(re.sub(r'\s+',' ',x.get_text(' ')).strip(), quote=False) for x in [BeautifulSoup(e,'html.parser')]))
            continue
        new = md(body, emtag)
        # span.sc "Sources" label
        sc = el.find('span', class_='sc')
        if sc is not None:
            new = re.sub(r'^([^:<]+)(?=:)', lambda m: f'<span class="sc">{m.group(1)}</span>', new, count=1)
        new = relink(el, new, titles_es, p, ix)
        replace_inline(el, new, extra)
        add_en(el, e)

    # page chrome
    soup.html['lang'] = 'es'
    ttl = h1_es[p]
    soup.title.string = f'{ttl} — Prefacio al trivio'
    for link in soup.find_all('link', rel='stylesheet'):
        if link['href'].startswith('css/'): link['href'] = '../' + link['href']
    for s in soup.find_all('script', src=True):
        if s['src'].startswith('js/'): s['src'] = '../' + s['src']
    sk = soup.find('a', class_='skip')
    if sk: sk.string = 'Saltar al texto'
    tc = soup.find('a', class_='top-course')
    if tc: tc.string = 'Prefacio al trivio'
    for b in soup.select('#speak-toggle'):
        b['title'] = b['aria-label'] = 'Leer esta pantalla en voz alta'
    for b in soup.select('.speak-rate-btn'):
        b['title'] = b['aria-label'] = 'Velocidad de lectura'
    d = soup.find(id='dark-toggle')
    if d: d['aria-label'] = 'Cambiar a modo oscuro'; d['title'] = 'Claro u oscuro'; d.string = 'Oscuro'
    # pager outside the article (inside the article it is a translated block)
    pg = soup.find(id='pager')
    art = soup.find('article')
    if pg and not (art and art in pg.parents):
        for a in pg.find_all('a'):
            sm = a.find('small')
            word = {'Previous': 'Anterior', 'Next': 'Siguiente', 'Back to': 'Volver a'}.get(sm.get_text(strip=True), sm.get_text(strip=True))
            sm.string = word
            href = a.get('href')
            t = 'Bienvenida' if href == 'index.html' else titles_es.get(href)
            if t is None: log.append(f'PAGER TITLE {p}: {href}')
            for k in [c for c in a.children if isinstance(c, NavigableString)]: k.extract()
            a.append(t or '')
    # note + Show English under the page head
    ph = soup.find('header', class_='page-head')
    tools = BeautifulSoup(
        '<div class="es-tools" id="es-tools">'
        '<p class="es-note">Traducción del inglés (versión de prueba, en revisión).</p>'
        '<div class="es-links">'
        '<button type="button" id="show-en" lang="en" aria-pressed="false" hidden>Show English</button>'
        f'<a id="view-en" lang="en" hreflang="en" href="../{p}.html">View this page in English</a>'
        '</div></div>', 'html.parser')
    ph.insert_after(tools)
    head_extras(soup, p, 'es')
    return soup

def head_extras(soup, p, lang):
    head = soup.head
    for l in head.find_all('link', rel='alternate'): l.decompose()
    for l in head.find_all('link', href=re.compile(r'plus\.css')): l.decompose()
    url = SITE + ('' if p == 'index' else p + '.html')
    esurl = SITE + 'es/' + ('' if p == 'index' else p + '.html')
    pre = '../' if lang == 'es' else ''
    course = head.find('link', href=re.compile(r'course\.css'))
    new = frag(f'\n<link rel="stylesheet" href="{pre}css/plus.css?v={V}">'
               f'\n<link rel="alternate" hreflang="en" href="{url}">'
               f'\n<link rel="alternate" hreflang="es" href="{esurl}">'
               f'\n<link rel="alternate" hreflang="x-default" href="{url}">')
    anchor = course
    for n in new:
        anchor.insert_after(n); anchor = n
    body = soup.body
    for s in body.find_all('script', src=re.compile(r'plus\.js')): s.decompose()
    nav = body.find('script', src=re.compile(r'nav\.js'))
    nav['src'] = f'{pre}js/nav.js?v={V}'
    sc = soup.new_tag('script', src=f'{pre}js/plus.js?v={V}'); nav.insert_after(sc); nav.insert_after('\n')

def main():
    es = parse(SRC)
    # Spanish h1 of every page, for link text, pager and <title>
    h1_es, titles_es = {}, {}
    for p in ORDER:
        h = [b for b in es[p + '.html'] if b[2].startswith('# ')][0][2][2:]
        h1_es[p] = re.sub(r'\*', '', h); titles_es[p + '.html'] = h1_es[p]
    out = os.path.join(TRIV, 'es'); os.makedirs(out, exist_ok=True)
    for p in ORDER:
        soup = build_page(p, es[p + '.html'], titles_es, h1_es)
        open(os.path.join(out, p + '.html'), 'w', encoding='utf-8').write(str(soup))
    # English pages: minimal textual patch so the files keep their own formatting
    for p in ORDER:
        fn = os.path.join(TRIV, p + '.html'); s = open(fn, encoding='utf-8').read()
        s = re.sub(r'\n<link rel="stylesheet" href="css/plus\.css[^"]*">', '', s)
        s = re.sub(r'\n<link rel="alternate" hreflang="[^"]*" href="[^"]*">', '', s)
        s = re.sub(r'\n<script src="js/plus\.js[^"]*"></script>', '', s)
        url = SITE + ('' if p == 'index' else p + '.html'); esurl = SITE + 'es/' + ('' if p == 'index' else p + '.html')
        s = re.sub(r'(<link rel="stylesheet" href="css/course\.css[^"]*">)',
                   lambda m: m.group(1) + f'\n<link rel="stylesheet" href="css/plus.css?v={V}">'
                   f'\n<link rel="alternate" hreflang="en" href="{url}">'
                   f'\n<link rel="alternate" hreflang="es" href="{esurl}">'
                   f'\n<link rel="alternate" hreflang="x-default" href="{url}">', s, count=1)
        s = re.sub(r'<script src="js/nav\.js[^"]*"></script>', f'<script src="js/nav.js?v={V}"></script>\n<script src="js/plus.js?v={V}"></script>', s, count=1)
        open(fn, 'w', encoding='utf-8').write(s)
    print('\n'.join(log) or 'no warnings')

if __name__ == '__main__':
    main()
