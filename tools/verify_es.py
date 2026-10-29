#!/usr/bin/env python3
"""Verify the Spanish pilot: python3 tools/verify_es.py PORT  (repo served at http://localhost:PORT/)."""
import sys, re, os, json, html, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from locate import locate
from build_es import parse, strip_prefix, ORDER, SRC, TRIV
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
PORT = sys.argv[1]; BASE = f'http://localhost:{PORT}/trivium/'
SHOTS = '/workspace/spanish-pilot/preview/'
problems = []
def norm(s):
    s = html.unescape(s); s = s.replace('*', '')
    return re.sub(r'\s+', ' ', s).strip()

# (e) static text check: ES page blocks (English hidden) vs. final file, and vs. final-only.md
es = parse(SRC)
only = norm(open(SRC.replace('final.md', 'final-only.md'), encoding='utf-8').read())
mism = 0; nblocks = 0
for p in ORDER:
    soup = BeautifulSoup(open(f'{TRIV}/es/{p}.html', encoding='utf-8').read(), 'html.parser')
    for s in soup.select('.en-orig'): s.decompose()
    soup.find(id='es-tools').decompose()
    L = locate(soup); F = es[p + '.html']
    if len(L) != len(F): problems.append(f'(e) {p}: {len(L)} blocks vs {len(F)}'); continue
    for (k, el, txt), (n, en, est) in zip(L, F):
        nblocks += 1
        if k == 'none': continue
        if k == 'card':
            a = norm(' '.join(x.get_text(' ') for x in el.find_all(['h3', 'p', 'small', 'span']))) if el.find(['h3','small','span']) else norm(el.get_text(' '))
            whole = norm(el.get_text(' ')); want = norm(strip_prefix(est, k, en))
            ok = norm(whole.replace(' ', '')) == norm(want.replace(':', '').replace(' ', ''))
        elif k == 'tr':
            got = ' | '.join(norm(c.get_text(' ')) for c in el.find_all(['td', 'th'])); want = norm(est.strip().strip('|'))
            ok = re.sub(r'\s', '', got) == re.sub(r'\s', '', want)
        else:
            got = norm(re.sub(r'^(Small heading: |#+ |\[note\] |\[expandable section\] |\[footer\] |> |— )', '', txt))
            want = norm(strip_prefix(est, k, en))
            if el.find('a', class_='app-link'): got = got.replace(' un curso', ': un curso')
            ok = got == want
        if not ok:
            mism += 1; problems.append(f'(e) MISMATCH {p}: got={locals().get("got", whole)[:90]!r} want={want[:90]!r}')
        if norm(strip_prefix(est, k, en)) not in only and k not in ('tr', 'card'):
            problems.append(f'(e) not in final-only.md: {p}: {est[:70]!r}')
print(f'(e) blocks checked: {nblocks}, mismatches: {mism}')

COUNT_JS = '''() => { const m=document.querySelector('main'); const q=s=>[...m.querySelectorAll(s)].filter(e=>!e.closest('.en-orig')&&!e.closest('.es-tools')).length;
 return {h:q('h1,h2,h3,h4'),p:q('p'),li:q('li'),a:q('a'),table:q('table'),tr:q('tr'),details:q('details'),blockquote:q('blockquote'),em:q('em,i,cite'),strong:q('strong,b')}; }'''
with sync_playwright() as pw:
    br = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    def newpage(w=1280, h=900):
        ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
        pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
        pg.on('requestfailed', lambda r: errs.append(f'FAILED {r.url}') if 'fonts.g' not in r.url else None)
        return ctx, pg, errs
    ctx, pg, errs = newpage()
    links = set(); counts_ok = 0
    for p in ORDER:
        cnt = {}
        for lang, url in (('en', BASE + p + '.html'), ('es', BASE + 'es/' + p + '.html')):
            errs.clear(); pg.goto(url, wait_until='networkidle')
            if errs: problems.append(f'(a) {lang} {p}: {errs}')
            cnt[lang] = pg.evaluate(COUNT_JS)
            for h in pg.eval_on_selector_all('a[href]', 'as=>as.map(a=>a.href)'):
                if h.startswith(f'http://localhost:{PORT}'): links.add(h.split('#')[0])
            if lang == 'es':
                vis = pg.eval_on_selector_all('.en-orig', 'xs=>xs.filter(x=>x.offsetParent!==null).length')
                if vis: problems.append(f'(e) {p}: {vis} English spans visible by default')
                assert pg.get_attribute('html', 'lang') == 'es'
            if not pg.query_selector('#plus-btn'): problems.append(f'(a) {lang} {p}: no + button')
        if cnt['en'] != cnt['es']: problems.append(f'(b) {p}: EN {cnt["en"]} ES {cnt["es"]}')
        else: counts_ok += 1
    print(f'(a) pages loaded: {len(ORDER)*2}; (b) element counts equal on {counts_ok}/{len(ORDER)} pairs')
    bad = []
    for u in sorted(links):
        try: urllib.request.urlopen(u).status
        except Exception as e: bad.append((u, str(e)))
    print(f'(a) internal links checked: {len(links)}, broken: {bad}')
    # (d) interactions
    ctx.close(); ctx, pg, errs = newpage()
    pg.goto(BASE + 'index.html'); pg.click('#plus-btn')
    assert pg.get_attribute('#plus-btn', 'aria-expanded') == 'true'
    pg.keyboard.press('Escape'); assert pg.is_hidden('#plus-menu'); assert pg.evaluate('document.activeElement.id') == 'plus-btn'
    pg.click('#plus-btn'); pg.click('#plus-dark'); assert pg.evaluate("document.body.classList.contains('dark')")
    assert pg.evaluate("localStorage.getItem('studium-trivium-theme')") == 'dark'
    pg.click('#plus-btn'); pg.click('#plus-dark')   # back to light
    pg.click('#plus-btn'); pg.click('a.plus-item[data-lang=es]'); pg.wait_for_load_state()
    assert pg.url.endswith('/trivium/es/index.html'), pg.url
    assert pg.evaluate("localStorage.getItem('studium-trivium-lang')") == 'es'
    pg.click('a.b.main.next'); pg.wait_for_load_state(); assert '/es/where-to-begin.html' in pg.url
    pg.goto(BASE + 'where-to-begin.html')   # English page: no forced redirect
    assert pg.url.endswith('/trivium/where-to-begin.html'); pg.click('#plus-btn')
    assert 'Español' in pg.inner_text('#plus-menu') and pg.query_selector('.plus-saved')
    print("\n".join(problems)); pg.goto(BASE + "es/words-things.html"); assert pg.is_visible('#show-en')
    pg.click('#show-en'); assert pg.evaluate("document.body.classList.contains('show-en')")
    n = pg.eval_on_selector_all('.en-orig', 'xs=>xs.filter(x=>x.offsetParent!==null).length'); assert n > 10, n
    pg.reload(); assert pg.evaluate("document.body.classList.contains('show-en')"), 'show-en not persisted'
    assert pg.inner_text('#show-en') == 'Hide English'
    pg.click('#show-en'); pg.reload(); assert not pg.evaluate("document.body.classList.contains('show-en')")
    pg.click('#plus-btn'); pg.click('a.plus-item[data-lang=en]'); pg.wait_for_load_state()
    assert pg.url.endswith('/trivium/words-things.html'); assert pg.evaluate("localStorage.getItem('studium-trivium-lang')") == 'en'
    print('(d) + menu, Esc, dark mode, language switch, ES links stay ES, no forced redirect, Show English toggle + persistence: OK')
    # no-JS: English hidden, button hidden
    nj = br.new_context(java_script_enabled=False).new_page(); nj.goto(BASE + 'es/grammar.html')
    assert nj.eval_on_selector_all('.en-orig', 'xs=>xs.filter(x=>x.offsetParent!==null).length') == 0 and nj.is_hidden('#show-en')
    print('(d) no-JS: English hidden, Show English button hidden: OK')
    # (c) screenshots
    for w, tag in ((1280, 'desktop'), (390, 'phone')):
        c, s, _ = newpage(w, 900 if w > 400 else 844)
        s.goto(BASE + 'index.html'); s.screenshot(path=f'{SHOTS}en-home-{tag}.png')
        s.click('#plus-btn'); s.screenshot(path=f'{SHOTS}en-plus-menu-{tag}.png')
        s.goto(BASE + 'es/index.html'); s.screenshot(path=f'{SHOTS}es-home-{tag}.png')
        s.click('#plus-btn'); s.screenshot(path=f'{SHOTS}es-plus-menu-{tag}.png')
        s.goto(BASE + 'es/why-words-2.html'); s.screenshot(path=f'{SHOTS}es-long-page-{tag}.png', full_page=True)
        s.goto(BASE + 'es/words-things.html'); s.click('#show-en'); s.screenshot(path=f'{SHOTS}es-show-english-{tag}.png')
        s.screenshot(path=f'{SHOTS}es-show-english-full-{tag}.png', full_page=True); s.click('#show-en')
        s.evaluate("localStorage.setItem('studium-trivium-theme','dark')"); s.goto(BASE + 'es/three-arts.html')
        s.screenshot(path=f'{SHOTS}es-dark-{tag}.png'); c.close()
    br.close()
print('PROBLEMS:' if problems else 'no problems'); print('\n'.join(problems))
