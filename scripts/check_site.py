"""Validate committed static files using Python stdlib only."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
errors = []

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.refs = []
        self.labels = []
        self.controls = []
        self.lang = None
        self.direction = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'html':
            self.lang, self.direction = a.get('lang'), a.get('dir')
        if a.get('id'):
            self.ids.append(a['id'])
        for key in ['src', 'href']:
            if a.get(key):
                self.refs.append(a[key])
        if tag == 'label' and a.get('for'):
            self.labels.append(a['for'])
        if tag in ['input', 'select', 'textarea'] and a.get('type') not in ['radio','hidden','submit','button']:
            if a.get('id') and not a.get('aria-label') and not a.get('aria-labelledby'):
                self.controls.append(a['id'])
    handle_startendtag = handle_starttag

pages = {}
for file in PUBLIC.rglob('*.html'):
    page = Page()
    text = file.read_text(encoding='utf-8')
    page.feed(text)
    pages[file.resolve()] = page
    if '@@' in text:
        errors.append(f'{file.relative_to(ROOT)}: unresolved template marker')
    if not (page.lang or '').startswith('ar') or page.direction != 'rtl':
        errors.append(f'{file.relative_to(ROOT)}: Arabic/RTL missing')
    for id, count in Counter(page.ids).items():
        if count > 1:
            errors.append(f'{file.name}: duplicate id {id}')
    for control in page.controls:
        if control not in page.labels:
            errors.append(f'{file.relative_to(ROOT)}: no accessible label for {control}')

refs = 0
for file, page in pages.items():
    for ref in page.refs:
        parsed = urlsplit(ref)
        if parsed.scheme or parsed.netloc:
            if parsed.scheme not in ['https','mailto','tel','data']:
                errors.append(f'{file.name}: non-HTTPS external ref {ref}')
            continue
        refs += 1
        if parsed.path.startswith('/'):
            errors.append(f'{file.name}: root-absolute path breaks project Pages {ref}')
            continue
        target = (file.parent / unquote(parsed.path)).resolve() if parsed.path else file
        if target.is_dir():
            target /= 'index.html'
        if not target.is_relative_to(PUBLIC.resolve()) or not target.exists():
            errors.append(f'{file.name}: missing local target {ref}')
        elif parsed.fragment and target in pages and parsed.fragment not in pages[target].ids:
            errors.append(f'{file.name}: missing anchor {ref}')

for css in PUBLIC.rglob('*.css'):
    for ref in re.findall(r'url\([\"\']?([^\)\"\']+)', css.read_text(encoding='utf-8')):
        if not urlsplit(ref).scheme and not (css.parent / unquote(ref)).exists():
            errors.append(f'{css.name}: missing CSS asset {ref}')

routes = json.loads((PUBLIC / 'manus-routes.json').read_text())
for route in routes['routes']:
    target = PUBLIC / route['path'].lstrip('/')
    if target.is_dir():
        target /= 'index.html'
    if not target.exists():
        errors.append(f'Route missing: {route["path"]}')
if not (PUBLIC / '.nojekyll').exists():
    errors.append('Missing .nojekyll')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'PASS: {len(pages)} HTML pages, {refs} local links/assets, CSS assets, labels, unique IDs, route manifest, Pages-relative paths.')
