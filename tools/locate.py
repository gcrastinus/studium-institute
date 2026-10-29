"""Locate translatable blocks in an English Trivium page, in the same order as
/workspace/spanish-pilot/extract.py, returning the live BeautifulSoup elements."""
import re
from bs4 import NavigableString, Tag
STRUCT=('ul','ol','details','table','blockquote')
def inline(el):
    out=''
    for c in el.children:
        if isinstance(c,NavigableString): out+=str(c)
        elif c.name in STRUCT: continue
        elif c.name in('em','i','cite'): out+='*'+inline(c).strip()+'*'
        elif c.name in('strong','b'): out+='**'+inline(c).strip()+'**'
        elif c.name=='br': out+=' '
        elif c.name=='footer': continue
        else: out+=inline(c)
    return re.sub(r'\s+',' ',out).strip()
def walk(el,blocks,depth=0):
    for c in el.children:
        if not isinstance(c,Tag):
            if str(c).strip() and depth==0: blocks.append(('text',c,re.sub(r'\s+',' ',str(c)).strip()))
            continue
        one(c,blocks,depth)
def one(c,blocks,depth=0):
    n=c.name; cls=' '.join(c.get('class',[]))
    if n in('h2','h3','h4'): blocks.append(('el',c,'#'*int(n[1])+' '+inline(c)))
    elif n=='p':
        t=inline(c)
        if not t: return
        blocks.append(('el',c,('[note] ' if 'note' in cls else '')+t))
    elif n in('ul','ol'):
        for i,li in enumerate(c.find_all('li',recursive=False),1):
            blocks.append(('el',li,inline(li)))
            for sub in li.find_all(['ul','ol'],recursive=False):
                for l2 in sub.find_all('li',recursive=False): blocks.append(('el',l2,inline(l2)))
    elif n=='blockquote':
        blocks.append(('bq',c,'> '+inline(c)))
        f=c.find('footer')
        if f: blocks.append(('el',f,'— '+inline(f)))
    elif n=='details':
        s=c.find('summary'); blocks.append(('el',s,'[expandable section] '+inline(s)))
        for x in c.children:
            if isinstance(x,Tag) and x.name!='summary': one(x,blocks,0)
        blocks.append(('none',None,'[end of expandable section]'))
    elif n=='table':
        for tr in c.find_all('tr'): blocks.append(('tr',tr,'| '+' | '.join(inline(td) for td in tr.find_all(['td','th']))+' |'))
    elif n=='hr': blocks.append(('none',c,'____'))
    elif n in('div','section','a','nav','figure','figcaption','span','aside'):
        if n=='a' and c.get_text(strip=True): blocks.append(('card',c,'[link card] '+inline(c))); return
        walk(c,blocks,depth)
    else:
        t=inline(c)
        if t: blocks.append(('el',c,t))
def locate(soup):
    m=soup.find('main'); blocks=[]
    k=m.find(class_='kicker')
    if k: blocks.append(('el',k,'Small heading: '+inline(k)))
    blocks.append(('el',m.find('h1'),'# '+inline(m.find('h1'))))
    walk(m.find('article') or m,blocks)
    for extra in m.find_all(['footer','p'],class_=re.compile('credit|colophon|byline')):
        blocks.append(('el',extra,'[footer] '+inline(extra)))
    return [b for b in blocks if b[2]]
