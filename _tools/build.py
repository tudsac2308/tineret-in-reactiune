# -*- coding: utf-8 -*-
"""
build.py - generează partea „Noutăți” a site-ului din _content/posts/*.html

    python _tools/build.py

Ce face:
  * noutati/<slug>.html   - câte o pagină pentru fiecare articol
  * noutati.html          - lista articolelor (cu filtre pe etichete)
  * index.html            - secțiunea „Ultimele noutăți” (între markerii NOUTATI)
  * search-index.json     - indexul pentru căutarea de pe site
  * feed.xml              - flux RSS
  * sitemap.xml           - pentru Google
  * sw.js                 - lista de fișiere offline + VERSION nou (vizitatorii primesc noutățile)
  * noutati/img/<slug>/   - pozele din _content/foto/<slug>/ micșorate în .webp

Un articol = un fișier _content/posts/<slug>.html care începe cu un bloc JSON:

    <!--meta
    { "title": "...", "date": "2026-10-16", "tags": ["caravana"], "excerpt": "..." }
    -->
    <p>Textul articolului...</p>

Nu are nevoie de nimic în afară de Python 3 (Pillow doar pentru poze).
"""
import datetime as dt
import email.utils
import html
import json
import os
import re
import sys
import unicodedata
from html.parser import HTMLParser

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, '_content', 'posts')
PHOTOS_DIR = os.path.join(ROOT, '_content', 'foto')
OUT_DIR = os.path.join(ROOT, 'noutati')
SITE = 'https://tineretinreactiune.ro'
BRAND = 'Tineret în Reacțiune'
TZ_OFFSET = '+03:00'  # only used for article:published_time on dates without a time

# Etichete: cheie -> (română, engleză). Adaugă aici o etichetă nouă înainte s-o folosești.
TAGS = {
    'caravana': ('Caravana', 'Caravan'),
    'erasmus': ('Erasmus+', 'Erasmus+'),
    'inscrieri': ('Înscrieri', 'Sign-ups'),
    'voluntariat': ('Voluntariat', 'Volunteering'),
    'evenimente': ('Evenimente', 'Events'),
    'licee': ('Licee', 'High schools'),
}

COVER_COLORS = ('magenta', 'blue', 'yellow', 'cyan')

# Pagini incluse în căutare și în sitemap: fișier -> (prioritate, cheia i18n a paginii)
PAGES = [
    ('index.html', '1.0', 'index'),
    ('noutati.html', '0.9', 'noutati'),
    ('calendar.html', '0.9', 'calendar'),
    ('despre.html', '0.8', 'despre'),
    ('inscriere.html', '0.8', 'inscriere'),
    ('donatii.html', '0.7', 'donatii'),
    ('contact.html', '0.7', 'contact'),
    ('confidentialitate.html', '0.3', 'confidentialitate'),
]

CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self'; "
       "connect-src 'self' https://api.web3forms.com; object-src 'none'; base-uri 'self'; form-action 'self' mailto:; "
       "manifest-src 'self'; worker-src 'self'")

# Fișiere precache-uite de service worker (în afară de articole, adăugate automat).
SW_CORE = [
    '/', '/index.html', '/despre.html', '/noutati.html', '/calendar.html', '/donatii.html', '/contact.html',
    '/inscriere.html', '/confidentialitate.html', '/offline.html',
    '/style.css', '/site-data.js', '/lang-init.js', '/i18n.js', '/shared.js', '/animations.js',
    '/calendar.js', '/forms.js', '/spark.js', '/search.js', '/blog.js', '/search-index.json',
    '/logo-tineret.webp', '/logo-tineret-sm.webp', '/spark2.webp', '/spark2-sm.webp', '/spark.webp',
    '/favicon.png', '/fonts/bangers-400-latin.woff2', '/fonts/bangers-400-latin-ext.woff2',
    '/fonts/patrick-hand-400-latin.woff2', '/fonts/patrick-hand-400-latin-ext.woff2',
    '/fonts/baloo-2-800-latin.woff2', '/fonts/baloo-2-800-latin-ext.woff2',
]

MONTHS_RO = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august',
             'septembrie', 'octombrie', 'noiembrie', 'decembrie']


def esc(s):
    return html.escape(str(s or ''), quote=True)


def slugify(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if not ('̀' <= c <= 'ͯ')).lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def date_ro(iso):
    d = dt.date.fromisoformat(iso)
    return '%d %s %d' % (d.day, MONTHS_RO[d.month - 1], d.year)


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    old = read(path) if os.path.exists(path) else None
    if old == text:
        return False
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    return True


# ------------------------------------------------------------------ text extraction
class TextGrabber(HTMLParser):
    """Collects visible text (and data-i18n keys) inside <main>, plus h1-h3 headings."""
    SKIP = {'script', 'style', 'svg', 'noscript', 'template'}

    def __init__(self, whole=False):
        super().__init__(convert_charrefs=True)
        self.in_main = whole
        self.depth_skip = 0
        self.parts, self.headings, self.keys = [], [], []
        self.heading_buf = None
        self.title = ''
        self._in_title = False
        self.meta_desc = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'main':
            self.in_main = True
        if tag == 'title':
            self._in_title = True
        if tag == 'meta' and a.get('name') == 'description':
            self.meta_desc = a.get('content', '')
        if tag in self.SKIP:
            self.depth_skip += 1
        if self.in_main and not self.depth_skip:
            if a.get('data-i18n'):
                self.keys.append(a['data-i18n'])
            if tag in ('h1', 'h2', 'h3'):
                self.heading_buf = []
            if tag in ('br', 'p', 'li', 'h1', 'h2', 'h3', 'div', 'blockquote'):
                self.parts.append(' ')
                if self.heading_buf is not None:
                    self.heading_buf.append(' ')

    def handle_endtag(self, tag):
        if tag == 'main':
            self.in_main = False
        if tag == 'title':
            self._in_title = False
        if tag in self.SKIP and self.depth_skip:
            self.depth_skip -= 1
        if tag in ('h1', 'h2', 'h3') and self.heading_buf is not None:
            text = re.sub(r'\s+', ' ', ''.join(self.heading_buf)).strip()
            if text:
                self.headings.append(text)
            self.heading_buf = None

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self.in_main and not self.depth_skip:
            self.parts.append(data)
            if self.heading_buf is not None:
                self.heading_buf.append(data)

    def text(self):
        return re.sub(r'\s+', ' ', ''.join(self.parts)).strip()


def grab(markup, whole=False):
    g = TextGrabber(whole)
    g.feed(markup)
    return g


def load_en():
    src = read(os.path.join(ROOT, 'i18n.js'))
    block = src.split('var EN = {', 1)[1].split('\n    };', 1)[0]
    out = {}
    for k, v in re.findall(r'"([^"]+)":\s*"((?:[^"\\]|\\.)*)"', block):
        out[k] = json.loads('"' + v + '"')
    return out


# ------------------------------------------------------------------ posts
def load_posts():
    posts = []
    if not os.path.isdir(POSTS_DIR):
        return posts
    for name in sorted(os.listdir(POSTS_DIR)):
        if not name.endswith('.html'):
            continue
        raw = read(os.path.join(POSTS_DIR, name))
        m = re.match(r'\s*<!--meta\s*(\{.*?\})\s*-->\s*(.*)\Z', raw, re.S)
        if not m:
            sys.exit('EROARE: %s nu începe cu blocul <!--meta { ... } -->' % name)
        try:
            meta = json.loads(m.group(1))
        except json.JSONDecodeError as e:
            sys.exit('EROARE: JSON greșit în %s: %s' % (name, e))
        for field in ('title', 'date', 'excerpt'):
            if not meta.get(field):
                sys.exit('EROARE: lipsește "%s" în %s' % (field, name))
        dt.date.fromisoformat(meta['date'])
        for tag in meta.get('tags', []):
            if tag not in TAGS:
                sys.exit('EROARE: eticheta "%s" din %s nu există în TAGS (build.py)' % (tag, name))
        if meta.get('draft'):
            continue
        meta['slug'] = name[:-5]
        meta['_file'] = os.path.join(POSTS_DIR, name)
        meta['body'] = m.group(2).strip()
        meta['url'] = 'noutati/%s.html' % meta['slug']
        words = len(grab(meta['body'], whole=True).text().split())
        meta['minutes'] = max(1, round(words / 200))
        meta.setdefault('tags', [])
        meta.setdefault('cover_color', COVER_COLORS[len(posts) % len(COVER_COLORS)])
        posts.append(meta)
    posts.sort(key=lambda p: p['date'], reverse=True)
    return posts


def optimize_photos():
    """_content/foto/<slug>/*.jpg -> noutati/img/<slug>/<nume>.webp (max 1600px) + <nume>-sm.webp (800px)."""
    if not os.path.isdir(PHOTOS_DIR):
        return 0
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print('! Pillow lipsește: pozele nu au fost procesate (pip install pillow)')
        return 0
    count = 0
    for slug in sorted(os.listdir(PHOTOS_DIR)):
        src_dir = os.path.join(PHOTOS_DIR, slug)
        if not os.path.isdir(src_dir):
            continue
        for name in sorted(os.listdir(src_dir)):
            base, ext = os.path.splitext(name)
            if ext.lower() not in ('.jpg', '.jpeg', '.png', '.webp', '.heic'):
                continue
            out_base = os.path.join(OUT_DIR, 'img', slug, slugify(base))
            src = os.path.join(src_dir, name)
            if os.path.exists(out_base + '.webp') and os.path.getmtime(out_base + '.webp') >= os.path.getmtime(src):
                continue
            os.makedirs(os.path.dirname(out_base), exist_ok=True)
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')  # rotate correctly; drops EXIF (GPS etc.)
                for suffix, width in (('', 1600), ('-sm', 800)):
                    copy = im.copy()
                    copy.thumbnail((width, width * 2))
                    copy.save(out_base + suffix + '.webp', 'WEBP', quality=80, method=6)
            count += 1
    return count


def make_og_image(post):
    """1200×630 JPEG from the cover photo, for Facebook/WhatsApp previews (they don't all accept WebP)."""
    if not post.get('cover'):
        return None
    # Named after the cover, so a new cover gets a new address and Facebook/WhatsApp don't show a cached old one.
    base = os.path.splitext(os.path.basename(post['cover']))[0]
    rel = os.path.join(os.path.dirname(post['cover']), 'og-%s.jpg' % base).replace('\\', '/')
    src, out = os.path.join(ROOT, post['cover']), os.path.join(ROOT, rel)
    if os.path.exists(out) and os.path.getmtime(out) >= max(os.path.getmtime(src), os.path.getmtime(post['_file'])):
        return rel
    try:
        from PIL import Image, ImageOps
    except ImportError:
        return None
    with Image.open(src) as im:
        focus = post.get('cover_focus', 45) / 100
        ImageOps.fit(im.convert('RGB'), (1200, 630), Image.LANCZOS, centering=(0.5, focus)).save(out, 'JPEG', quality=85, optimize=True)
    return rel


def image_size(rel):
    try:
        from PIL import Image
        with Image.open(os.path.join(ROOT, rel)) as im:
            return im.size
    except Exception:
        return None


# ------------------------------------------------------------------ shared markup
def head(title, desc, canonical, root, og_type='website', og_image=None, extra='', i18n_title=None, i18n_desc=None):
    og_image = og_image or (SITE + '/og-image.png')
    t_attr = ' data-i18n="%s"' % i18n_title if i18n_title else ''
    d_attr = ' data-i18n-attr="content:%s"' % i18n_desc if i18n_desc else ''
    return f'''<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta http-equiv="Content-Security-Policy" content="{CSP}">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title{t_attr}>{esc(title)}</title>
    <meta name="description" content="{esc(desc)}"{d_attr}>
    <link rel="canonical" href="{canonical}">
    <meta property="og:type" content="{og_type}">
    <meta property="og:site_name" content="{BRAND}">
    <meta property="og:locale" content="ro_RO">
    <meta property="og:url" content="{canonical}">
    <meta property="og:title" content="{esc(title)}">
    <meta property="og:description" content="{esc(desc)}">
    <meta property="og:image" content="{og_image}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#FFC90E">
    <link rel="manifest" href="{root}manifest.webmanifest">
    <link rel="icon" type="image/png" href="{root}favicon.png">
    <link rel="apple-touch-icon" href="{root}apple-touch-icon.png">
    <link rel="alternate" type="application/rss+xml" title="Noutăți - {BRAND}" href="{SITE}/feed.xml">
    <link rel="preload" href="{root}fonts/bangers-400-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="{root}fonts/patrick-hand-400-latin.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="{root}style.css">
    <script src="{root}lang-init.js"></script>
    <noscript><style>.comic-pop{{opacity:1 !important;scale:none !important;rotate:none !important}}</style></noscript>
{extra}</head>'''


def scripts(root, names):
    return '\n'.join('    <script src="%s%s"></script>' % (root, n) for n in names)


def tag_label(tag):
    ro, en = TAGS[tag]
    return '<span data-en="%s">%s</span>' % (esc(en), esc(ro))


def tags_html(post, root, cls='post-tags'):
    if not post['tags']:
        return ''
    items = ''.join('<li><a class="tag" href="%snoutati.html?eticheta=%s">%s</a></li>' % (root, t, tag_label(t))
                    for t in post['tags'])
    return '<ul class="%s" aria-label="Etichete" data-i18n-attr="aria-label:news.tags">%s</ul>' % (cls, items)


def cover_html(post, root, size='large'):
    """Photo cover, or a pop-art comic cover drawn in CSS when the article has no photo yet."""
    if post.get('cover'):
        src = post['cover']
        small = re.sub(r'\.webp$', '-sm.webp', src)
        has_small = small != src and os.path.exists(os.path.join(ROOT, small))
        use = small if (size == 'card' and has_small) else src
        dims = image_size(use)
        wh = ' width="%d" height="%d"' % dims if dims else ''
        loading = ' loading="lazy" decoding="async"' if size == 'card' else ' fetchpriority="high"'
        # cover_focus: which part stays visible when the photo is cropped to 16:9 (0 = top, 100 = bottom)
        focus = ' style="object-position:50%% %d%%"' % post['cover_focus'] if 'cover_focus' in post else ''
        return '<img class="cover-photo" src="%s%s" alt="%s"%s%s%s>' % (root, use, esc(post.get('cover_alt', '')), wh, loading, focus)
    lines = post.get('cover_title') or [post['title']]
    kicker = esc(lines[0]) if len(lines) > 1 else ''
    bubble = esc(lines[-1])
    return (
        '<div class="cover-comic cover-%s" aria-hidden="true">'
        '<span class="cover-rays"></span>'
        '%s<span class="cover-bubble">%s</span>'
        '<img class="cover-spark" src="%sspark2-sm.webp" alt="" width="140" height="116" loading="lazy">'
        '</div>' % (post['cover_color'], '<span class="cover-kicker">%s</span>' % kicker if kicker else '', bubble, root)
    )


def card_html(post, root, heading='h2', featured=False, delay=0):
    url = root + post['url']
    cls = 'post-card comic-pop' + (' is-featured' if featured else '')
    style = ' style="transition-delay:%.1fs"' % delay if delay else ''
    return f'''<article class="{cls}" data-tags="{' '.join(post['tags'])}"{style}>
                    <a class="post-card-cover" href="{url}" tabindex="-1" aria-hidden="true">{cover_html(post, root, 'card')}</a>
                    <div class="post-card-body">
                        {tags_html(post, root, 'post-tags post-tags--card')}
                        <{heading} class="post-card-title"><a href="{url}">{esc(post['title'])}</a></{heading}>
                        <p class="post-card-meta"><time datetime="{post['date']}" data-format="long">{date_ro(post['date'])}</time> · {post['minutes']} <span data-i18n="post.minRead">min de citit</span></p>
                        <p class="post-card-excerpt">{esc(post['excerpt'])}</p>
                        <a class="post-card-more" href="{url}" aria-hidden="true" tabindex="-1"><span data-i18n="news.readMore">Citește articolul</span> →</a>
                    </div>
                </article>'''


# ------------------------------------------------------------------ pages
def build_post(post, posts):
    root = '../'
    url = SITE + '/' + post['url']
    title = post.get('seo_title') or post['title']
    og_rel = make_og_image(post)
    og_image = SITE + '/' + og_rel if og_rel else None
    published = post['date'] + 'T09:00:00' + TZ_OFFSET

    ld = [{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': post['title'][:110],
        'description': post['excerpt'],
        'datePublished': published,
        'dateModified': (post.get('updated') or post['date']) + 'T09:00:00' + TZ_OFFSET,
        'inLanguage': 'ro',
        'mainEntityOfPage': url,
        'url': url,
        'image': og_image or SITE + '/og-image.png',
        'keywords': ', '.join(TAGS[t][0] for t in post['tags']),
        'author': {'@type': 'Organization', 'name': BRAND, 'url': SITE + '/'},
        'publisher': {'@type': 'NGO', 'name': BRAND, 'url': SITE + '/',
                      'logo': {'@type': 'ImageObject', 'url': SITE + '/logo-tineret.png'}},
    }, {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Acasă', 'item': SITE + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Noutăți', 'item': SITE + '/noutati.html'},
            {'@type': 'ListItem', 'position': 3, 'name': post['title'], 'item': url},
        ],
    }]
    extra = (f'    <meta property="article:published_time" content="{published}">\n'
             + ''.join(f'    <meta property="article:tag" content="{esc(TAGS[t][0])}">\n' for t in post['tags'])
             + '    <script type="application/ld+json">\n    '
             + json.dumps(ld, ensure_ascii=False, indent=None).replace('</', '<\\/') + '\n    </script>\n')

    i = posts.index(post)
    newer = posts[i - 1] if i > 0 else None
    older = posts[i + 1] if i + 1 < len(posts) else None
    pager = ''
    if newer or older:
        pager = '<nav class="post-pager" aria-label="Alte articole" data-i18n-attr="aria-label:post.more">'
        if older:
            pager += (f'<a class="pager-link pager-prev" href="{older["slug"]}.html"><span class="pager-dir" data-i18n="post.older">← Articolul anterior</span>'
                      f'<span class="pager-title">{esc(older["title"])}</span></a>')
        if newer:
            pager += (f'<a class="pager-link pager-next" href="{newer["slug"]}.html"><span class="pager-dir" data-i18n="post.newer">Articolul următor →</span>'
                      f'<span class="pager-title">{esc(newer["title"])}</span></a>')
        pager += '</nav>'

    related = [p for p in posts if p is not post and set(p['tags']) & set(post['tags'])]
    related += [p for p in posts if p is not post and p not in related]
    related_html = ''
    if related:
        cards = '\n                '.join(card_html(p, root, 'h3', delay=0.1 * k) for k, p in enumerate(related[:3]))
        related_html = f'''
        <section class="related-posts" aria-labelledby="related-title">
            <h2 id="related-title" class="section-tag comic-pop" data-i18n="post.related">Mai citește și</h2>
            <div class="post-grid">
                {cards}
            </div>
        </section>
'''

    share_url = esc(url)
    share_enc = esc(re.sub(r'[^A-Za-z0-9._~-]', lambda m: ''.join('%%%02X' % b for b in m.group(0).encode()), url))
    title_enc = esc(re.sub(r'[^A-Za-z0-9._~-]', lambda m: ''.join('%%%02X' % b for b in m.group(0).encode()), post['title'] + ' ' + url))
    new_tab = '<span class="sr-only" data-i18n="a11y.newTab">(se deschide într-o filă nouă)</span>'

    page = head(title + ' - ' + BRAND, post['excerpt'], url, root, 'article', og_image, extra) + f'''
<body class="pop-art-bg" data-page="noutati" data-root="{root}">

    <a href="#main" class="skip-link" data-i18n="a11y.skip">Sari la conținut</a>

    <header class="pop-header" id="site-header"></header>
    <div class="read-progress" aria-hidden="true"><span></span></div>

    <main id="main" class="post-page">
        <article class="post">
            <header class="post-header comic-pop">
                <nav class="breadcrumb" aria-label="Unde te afli" data-i18n-attr="aria-label:post.breadcrumb">
                    <ol>
                        <li><a href="{root}index.html" data-i18n="nav.home">Acasă</a></li>
                        <li><a href="{root}noutati.html" data-i18n="nav.news">Noutăți</a></li>
                        <li aria-current="page">{esc(post.get('short_title') or post['title'])}</li>
                    </ol>
                </nav>
                {tags_html(post, root)}
                <h1 class="post-title">{esc(post['title'])}</h1>
                <p class="post-meta"><time datetime="{post['date']}" data-format="long">{date_ro(post['date'])}</time> · {post['minutes']} <span data-i18n="post.minRead">min de citit</span> · <span data-i18n="post.by">Echipa Tineret în Reacțiune</span></p>
            </header>

            <figure class="post-cover comic-pop">{cover_html(post, root)}</figure>

            <p class="lang-note" lang="en">🇷🇴 This article is only available in Romanian.</p>

            <div class="post-body prose">
{post['body']}
            </div>

            <aside class="post-events" data-post="{post['url']}" aria-labelledby="post-events-title" hidden>
                <h2 id="post-events-title" data-i18n="post.events">În calendar</h2>
                <ul class="post-events-list"></ul>
            </aside>

            <section class="post-cta comic-pop" aria-labelledby="post-cta-title">
                <img src="{root}spark2-sm.webp" alt="" width="140" height="116" loading="lazy">
                <div>
                    <h2 id="post-cta-title" data-i18n="post.ctaTitle">Vrei să faci parte din echipă?</h2>
                    <p data-i18n="post.ctaText">Dacă ai între 13 și 21 de ani și vrei să schimbi ceva în comunitatea ta, te așteptăm!</p>
                    <a href="{root}inscriere.html" class="btn" data-signup><span data-i18n="post.ctaBtn">GO! Înscrie-te!</span> {new_tab}</a>
                </div>
            </section>

            <div class="share-bar" data-share data-url="{share_url}" data-title="{esc(post['title'])}">
                <p class="share-label" data-i18n="post.share">Dă mai departe!</p>
                <div class="share-buttons">
                    <button type="button" class="btn-small share-native" hidden>📤 <span data-i18n="post.shareNative">Trimite</span></button>
                    <a class="btn-small" href="https://www.facebook.com/sharer/sharer.php?u={share_enc}" target="_blank" rel="noopener noreferrer">Facebook {new_tab}</a>
                    <a class="btn-small" href="https://wa.me/?text={title_enc}" target="_blank" rel="noopener noreferrer">WhatsApp {new_tab}</a>
                    <button type="button" class="btn-small share-copy">🔗 <span data-i18n="post.copyLink">Copiază linkul</span></button>
                </div>
            </div>
        </article>

        {pager}
{related_html}    </main>

    <footer class="pop-footer" id="site-footer"></footer>

{scripts(root, ['site-data.js', 'i18n.js', 'shared.js', 'animations.js', 'calendar.js', 'search.js', 'blog.js', 'spark.js'])}
</body>
</html>
'''
    return write(os.path.join(OUT_DIR, post['slug'] + '.html'), page)


def build_list(posts):
    root = ''
    counts = {}
    for p in posts:
        for t in p['tags']:
            counts[t] = counts.get(t, 0) + 1
    chips = '<button type="button" data-tag="" aria-pressed="true" data-i18n="news.all">Toate</button>' + ''.join(
        '<button type="button" data-tag="%s" aria-pressed="false">%s <span class="chip-count">%d</span></button>' % (t, tag_label(t), counts[t])
        for t in sorted(counts, key=lambda k: (-counts[k], TAGS[k][0])))
    if posts:
        cards = '\n                '.join(card_html(p, root, featured=(i == 0), delay=min(i, 3) * 0.1) for i, p in enumerate(posts))
        listing = f'''<div class="tag-filter comic-pop" role="group" aria-label="Filtrează după etichetă" data-i18n-attr="aria-label:news.filter">{chips}</div>
                <p class="post-count" id="postCount" role="status" aria-live="polite"></p>
                <div class="post-grid post-grid--list">
                {cards}
                </div>'''
    else:
        listing = '<p class="events-empty comic-pop" data-i18n="news.empty">Primele articole apar în curând!</p>'

    ld = {
        '@context': 'https://schema.org', '@type': 'Blog', 'name': 'Noutăți - ' + BRAND, 'url': SITE + '/noutati.html',
        'inLanguage': 'ro', 'publisher': {'@type': 'NGO', 'name': BRAND, 'url': SITE + '/'},
        'blogPost': [{'@type': 'BlogPosting', 'headline': p['title'][:110], 'url': SITE + '/' + p['url'],
                      'datePublished': p['date']} for p in posts],
    }
    extra = '    <script type="application/ld+json">\n    ' + json.dumps(ld, ensure_ascii=False).replace('</', '<\\/') + '\n    </script>\n'
    page = head('Noutăți - ' + BRAND,
                'Noutăți din proiectul Tineret în Reacțiune: povești de la evenimente, caravane în licee, anunțuri și înscrieri pentru tinerii din Vrancea.',
                SITE + '/noutati.html', root, extra=extra, i18n_title='meta.title.noutati', i18n_desc='meta.desc.noutati') + f'''
<body class="pop-art-bg" data-page="noutati">

    <a href="#main" class="skip-link" data-i18n="a11y.skip">Sari la conținut</a>

    <header class="pop-header" id="site-header"></header>

    <main id="main">
        <section class="pop-inner-page pop-inner-page--top">
            <div class="pop-inner-content news-page">
                <h1 class="inner-title comic-pop" data-i18n="news.title">NOUTĂȚI</h1>
                <p class="inner-text comic-pop" style="transition-delay:0.1s"><span data-i18n="news.intro">Ce se mai întâmplă în proiect: povești de la evenimente, anunțuri și invitații.</span> <a href="calendar.html" data-i18n="news.introCal">Vezi ce urmează în calendar →</a></p>
                {listing}
            </div>
        </section>
    </main>

    <footer class="pop-footer" id="site-footer"></footer>

{scripts(root, ['site-data.js', 'i18n.js', 'shared.js', 'animations.js', 'search.js', 'blog.js', 'spark.js'])}
</body>
</html>
'''
    return write(os.path.join(ROOT, 'noutati.html'), page)


def build_home(posts):
    path = os.path.join(ROOT, 'index.html')
    src = read(path)
    start, end = '<!-- NOUTATI:START -->', '<!-- NOUTATI:END -->'
    if start not in src:
        print('! index.html nu are markerii NOUTATI: secțiunea de pe prima pagină nu a fost actualizată')
        return False
    if posts:
        cards = '\n                '.join(card_html(p, '', 'h3', delay=0.1 * i) for i, p in enumerate(posts[:3]))
        block = f'''{start}
        <section class="home-news" aria-labelledby="news-title">
            <h2 id="news-title" class="section-tag comic-pop" data-i18n="news.latest">Ultimele noutăți</h2>
            <div class="post-grid post-grid--home">
                {cards}
            </div>
            <div class="home-news-more comic-pop"><a href="noutati.html" class="btn btn-alt" data-i18n="news.seeAll">Toate noutățile</a></div>
        </section>
        {end}'''
    else:
        block = start + '\n        ' + end
    new = re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda m: block, src, flags=re.S)
    return write(path, new)


def build_search(posts, en):
    docs = []
    for name, _prio, key in PAGES:
        path = os.path.join(ROOT, name)
        if not os.path.exists(path):
            continue
        g = grab(read(path))
        title = re.sub(r'\s+-\s+' + re.escape(BRAND) + r'$', '', g.title.strip())
        title_en = re.sub(r'\s+-\s+' + re.escape(BRAND) + r'$', '', en.get('meta.title.' + key, ''))
        if name == 'index.html':
            title, title_en = 'Acasă — ' + BRAND, 'Home — ' + BRAND
        docs.append({
            'type': 'page', 'url': name, 'title': title, 'title_en': title_en,
            'desc': g.meta_desc, 'desc_en': en.get('meta.desc.' + key, ''),
            'headings': g.headings,
            'text': g.text()[:4000],
            'text_en': ' '.join(en[k] for k in dict.fromkeys(g.keys) if k in en)[:4000],
        })
    for p in posts:
        g = grab(p['body'], whole=True)
        docs.append({
            'type': 'post', 'url': p['url'], 'title': p['title'], 'date': p['date'],
            'desc': p['excerpt'], 'headings': g.headings,
            'tags': [TAGS[t][0] for t in p['tags']] + [TAGS[t][1] for t in p['tags']],
            'text': g.text()[:6000],
        })
    return write(os.path.join(ROOT, 'search-index.json'), json.dumps(docs, ensure_ascii=False, separators=(',', ':')) + '\n')


def build_feed(posts):
    now = email.utils.format_datetime(dt.datetime.now(dt.timezone.utc))
    items = []
    for p in posts[:20]:
        d = dt.datetime.fromisoformat(p['date'] + 'T09:00:00' + TZ_OFFSET)
        items.append(f'''    <item>
      <title>{esc(p['title'])}</title>
      <link>{SITE}/{p['url']}</link>
      <guid isPermaLink="true">{SITE}/{p['url']}</guid>
      <pubDate>{email.utils.format_datetime(d)}</pubDate>
      <description>{esc(p['excerpt'])}</description>
{''.join('      <category>%s</category>%s' % (esc(TAGS[t][0]), chr(10)) for t in p['tags'])}    </item>''')
    feed = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Noutăți - {BRAND}</title>
    <link>{SITE}/noutati.html</link>
    <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Noutăți din proiectul Erasmus+ Tineret în Reacțiune, clubul de implicare civică pentru tinerii din Vrancea.</description>
    <language>ro</language>
    <lastBuildDate>{now}</lastBuildDate>
{chr(10).join(items)}
  </channel>
</rss>
'''
    # lastBuildDate changes every run; only rewrite when the items changed.
    path = os.path.join(ROOT, 'feed.xml')
    if os.path.exists(path) and re.sub(r'<lastBuildDate>.*?</lastBuildDate>', '', read(path)) == re.sub(r'<lastBuildDate>.*?</lastBuildDate>', '', feed):
        return False
    return write(path, feed)


def build_sitemap(posts):
    def lastmod(name):
        return dt.date.fromtimestamp(os.path.getmtime(os.path.join(ROOT, name))).isoformat()
    rows = []
    for name, prio, _key in PAGES:
        if os.path.exists(os.path.join(ROOT, name)):
            loc = SITE + '/' if name == 'index.html' else SITE + '/' + name
            rows.append(f'    <url><loc>{loc}</loc><lastmod>{lastmod(name)}</lastmod><priority>{prio}</priority></url>')
    for p in posts:
        rows.append(f'    <url><loc>{SITE}/{p["url"]}</loc><lastmod>{p.get("updated") or p["date"]}</lastmod><priority>0.8</priority></url>')
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(rows) + '\n</urlset>\n'
    return write(os.path.join(ROOT, 'sitemap.xml'), xml)


PRIVATE = {'_content', '_tools', 'archive', '.git', '.github', '.claude'}


def site_changed_since(path):
    """True if any published file is newer than sw.js (e.g. style.css was edited by hand)."""
    ref = os.path.getmtime(path)
    for folder, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in PRIVATE]
        for name in files:
            full = os.path.join(folder, name)
            if full != path and os.path.getmtime(full) > ref + 1:
                return True
    return False


def build_sw(posts, changed):
    path = os.path.join(ROOT, 'sw.js')
    src = read(path)
    changed = changed or site_changed_since(path)
    core = SW_CORE + ['/' + p['url'] for p in posts]
    lines, line = [], '    '
    for item in core:
        piece = "'%s', " % item
        if len(line) + len(piece) > 118:
            lines.append(line.rstrip())
            line = '    '
        line += piece
    lines.append(line.rstrip().rstrip(','))
    new = re.sub(r'var CORE = \[.*?\];', lambda m: 'var CORE = [\n' + '\n'.join(lines) + '\n];', src, flags=re.S)
    if changed or new != src:
        stamp = dt.datetime.now().strftime('%Y-%m-%d-%H%M')
        new = re.sub(r"var VERSION = '[^']*';", "var VERSION = 'tr-%s';" % stamp, new)
    return write(path, new)


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    en = load_en()
    photos = optimize_photos()
    posts = load_posts()
    changed = []
    for p in posts:
        if build_post(p, posts):
            changed.append(p['url'])
    for fn, label in ((build_list, 'noutati.html'), (build_home, 'index.html')):
        if fn(posts):
            changed.append(label)
    if build_search(posts, en):
        changed.append('search-index.json')
    if build_feed(posts):
        changed.append('feed.xml')
    if build_sitemap(posts):
        changed.append('sitemap.xml')
    # Remove pages of deleted/draft posts.
    if os.path.isdir(OUT_DIR):
        keep = {p['slug'] + '.html' for p in posts}
        for name in os.listdir(OUT_DIR):
            if name.endswith('.html') and name not in keep:
                os.remove(os.path.join(OUT_DIR, name))
                changed.append('noutati/' + name + ' (șters)')
    if build_sw(posts, changed or photos):
        changed.append('sw.js')
    print('Articole: %d · poze noi: %d' % (len(posts), photos))
    print('Actualizate: ' + (', '.join(changed) if changed else 'nimic, totul era la zi'))


if __name__ == '__main__':
    main()
