"""Build the current static site; Python standard library only, no network."""
from pathlib import Path
from html import escape
from urllib.parse import urlsplit
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'

def load(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))

def e(text):
    return escape(str(text), quote=True)

config = load('site.config.json')
product = load('content/manure-product.json')
section_images = load('content/section-images.json').get('images', [])
organic = load('research/organic.json')
catalogue = load('research/crops.json')
audit = load('research/audit.json')
calculations = load('research/calculation-sources.json')
schedules = load('research/greenhouse-schedules.json')
crops = catalogue['crops']
reviewed = config['reviewed']
source_map = {}
for group in [organic, catalogue, audit, calculations, schedules]:
    for source in group.get('sources', []):
        source_map[source['id']] = source
# Existing source-linked Syrian contexts are preserved, not promoted to current recommendations.
legacy = [
    {'id':'legacy-fao','title':'FAO — Fertilizer use by crop in the Syrian Arab Republic, 2003','url':'https://www.fao.org/4/Y4732E/y4732e08.htm','supports':'سياق تاريخي لا توصية وطنية حالية.'},
    {'id':'legacy-icarda','title':'ICARDA — Impact of Modern Agricultural Technologies on Durum Wheat Production in Syria, 2003','url':'https://mel.cgiar.org/reporting/download/hash/YhMj6HXU','supports':'تقرير تاريخي؛ لا يُحوّل تصنيف مناطقه إلى محافظات اليوم.'},
    {'id':'legacy-cotton','title':'المجلة السورية للبحوث الزراعية — تجربة القطن حلب 118 في تل حديا، 2022–2023','url':'https://agri-research-journal.net/SjarEn/?p=10947','supports':'تجربة محلية محددة الصنف والتربة والري؛ لا تعمم جرعاتها.'},
    {'id':'legacy-pistachio','title':'المجلة السورية للبحوث الزراعية — كمبوست مخلفات الفستق، تجربة في حماة 2019–2020','url':'https://agri-research-journal.net/SjarEn/?p=8934','supports':'تجربة على أشجار عاشوري معمرة، لا وصفة موحدة للبساتين.'}
]
for source in legacy:
    source_map[source['id']] = source

# The website cannot build with unsourced crop/organic claims.
for record in crops + organic['paragraphs']:
    for id in record.get('sourceIds', []):
        if id not in source_map:
            raise ValueError('Unknown source: ' + id)

def links(ids):
    return '<div class="source-links">' + ''.join(f'<a href="#source-{e(id)}">{e(source_map[id]["title"])}</a>' for id in ids if id in source_map) + '</div>'

def section_start(id, kicker, title, intro):
    return f'<section id="{id}" class="agri-section" aria-labelledby="{id}Title"><span class="agri-kicker">{e(kicker)}</span><h2 id="{id}Title">{e(title)}</h2><p>{e(intro)}</p><span class="agri-review">مراجعة المصادر: {e(reviewed)}</span>'

organic_html = section_start('organicManure','سماد الزراعة النظيفة · السماد العضوي الحيواني',organic['title'],product.get('description', 'روث الأبقار والأغنام والماعز والدواجن مواد متغيرة التركيب؛ لا توجد قيمة NPK ثابتة تُستنتج من اسم الحيوان وحده.'))
analysis_labels = [('moisturePercent','الرطوبة','%'),('organicMatterPercent','المادة العضوية','%'),('nitrogenPercent','النيتروجين الكلي N','%'),('phosphorusAsP2O5Percent','الفوسفور P₂O₅','%'),('potassiumAsK2OPercent','البوتاسيوم K₂O','%'),('ec','EC',''),('ph','pH','')]
analysis_rows = [(label, product.get('analysis', {}).get(key), unit) for key,label,unit in analysis_labels if product.get('analysis', {}).get(key) is not None]
analysis_html = '<table class="manure-analysis"><tbody>' + ''.join(f'<tr><th>{e(label)}</th><td>{e(value)}{(" " + e(unit)) if unit else ""}</td></tr>' for label,value,unit in analysis_rows) + '</tbody></table>' if analysis_rows else f'<p class="manure-analysis-empty">{e(product.get("analysisNote", "لا توجد نتائج تحليل منشورة لهذه الدفعة."))}</p>'
analysis_meta = ''.join([f'<span>تاريخ التحليل: {e(product["analysisDate"])}</span>' if product.get('analysisDate') else '', f'<span>أساس التحليل: {e(product["analysisBasis"])}</span>' if product.get('analysisBasis') else ''])
organic_html += f'<div class="manure-brand-card"><div><span class="manure-brand-kicker">{e(product.get("category", "سماد عضوي حيواني"))}</span><h3>{e(product.get("productName", "سماد الزراعة النظيفة"))}</h3><p>تركيب الدفعة يتغير. لا تستنتج النسب أو الملوحة أو النضج من اسم الحيوان أو المنتج؛ اعتمد تحليل العينة الحالية وملصق المنتج.</p><div class="manure-analysis-meta">{analysis_meta}</div>{analysis_html}</div><a href="https://info-samad.github.io/" target="_blank" rel="noopener noreferrer">زيارة موقع الزراعة النظيفة <span aria-hidden="true">↗</span></a></div>'
organic_html += '<div class="agri-notice"><strong>قبل أي إضافة داخل البيت:</strong> لا تستخدم الروث الطازج أو غير موثق المعالجة أثناء إنتاج الخضار؛ لا تُحقن منقوعاته في التنقيط. صلاحية المادة تتطلب تقييم النضج والسلامة والملوحة والفوسفور، لا اسم الحيوان أو مدة التخزين فقط.</div>'
steps = [
    ('01','حلّل أولاً','عينة تربة وماء ري ومادة عضوية ممثلة؛ سجّل EC وطريقة القياس والرطوبة وأساس العناصر.'),
    ('02','قيّم المادة','مصدر معلوم ومعالجة موثقة وإنضاج؛ افصل الروث الخام وأدواته عن المادة المنجزة والمحصول.'),
    ('03','وازن قبل الزراعة','كمية يحددها التحليل والتوصية، مع توزيع منتظم واحتساب العناصر وتجنب زيادة الأملاح والفوسفور.')
]
organic_html += '<div class="organic-workflow">' + ''.join(f'<article class="organic-step"><span class="organic-step-number">{n}</span><h3>{e(t)}</h3><p>{e(p)}</p></article>' for n,t,p in steps) + '</div>'
for record in organic['paragraphs']:
    organic_html += f'<details class="agri-details"><summary>{e(record["heading"])}</summary><p>{e(record["text"])}</p>{links(record["sourceIds"])}</details>'
organic_html += '<p class="crop-directory-help">تُطبّق هذه المبادئ على زراعة التربة، لا الزراعة المائية. لا تُستخدم أرقام المعايير الأجنبية بوصفها تشريعاً سورياً أو جرعات سورية.</p><a class="secondary-button" href="#farmerTools">احسب مساهمة سمادك من التحليل</a></section>'

def schedule_table(schedule):
    head = ''.join(f'<th>{e(col)}</th>' for col in schedule['columns'])
    rows = ''.join('<tr>' + ''.join(f'<td>{e(cell)}</td>' for cell in row) + '</tr>' for row in schedule['rows'])
    return f'<div class="schedule-table-wrap"><table class="schedule-table"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>'

schedule_html = section_start('greenhouseSchedules', 'جداول مرجعية · طماطم وخيار', schedules['title'], schedules['intro'])
schedule_html += '<div class="agri-notice"><strong>قبل استخدام أي رقم:</strong> حدّد هل البيت مزروع في التربة أم في وسط دون تربة، وسجّل تحليل ماء الري والتربة أو الوسط، EC وpH وطريقة القياس، حجم الري والصرف، والصنف والمرحلة. ppm تركيز في المحلول وليس كغ من منتج تجاري.</div>'
schedule_html += '<div class="schedule-tabs" role="tablist" aria-label="اختيار جدول المحصول"><button type="button" class="schedule-tab active" role="tab" aria-selected="true" data-schedule-target="tomato">جدول الطماطم</button><button type="button" class="schedule-tab" role="tab" aria-selected="false" data-schedule-target="cucumber">جدول الخيار</button></div><p class="crop-directory-help">اختر المحصول لعرض جدوله. داخل كل جدول مرّر أفقياً على الهاتف لقراءة الأعمدة، ثم استخدم مؤشر التعديل قبل تغيير البرنامج.</p>'
for key in ['tomato', 'cucumber']:
    item = schedules[key]
    hidden = '' if key == 'tomato' else ' hidden'
    schedule_html += f'<article class="schedule-card" data-schedule-card="{key}"{hidden}><h3>{e(item["title"])}</h3>{schedule_table(item)}<div class="schedule-notes"><h4>طريقة الاستخدام والتعديل</h4><ul>' + ''.join(f'<li>{e(note)}</li>' for note in item['operational']) + f'</ul>{links(item["sourceIds"])}</div></article>'
schedule_html += '<p class="crop-directory-help">الجداول لا تستبدل برنامجاً محلياً. لا ترفع السماد بسبب اصفرار منفرد، ولا تخلط نترات الكالسيوم مع الفوسفات أو الكبريتات في خزان مركز. سجّل المدخلات والـEC والصرف ونتائج التحليل قبل كل تعديل.</p></section>'

categories = list(dict.fromkeys(c['category'] for c in crops))
directory = section_start('cropDirectory','دليل للمحاصيل والأشجار المزروعة في سورية','اختر محصولك، ثم راجع سياقه','محاصيل حقلية وخضروات وأشجار موثقة الزراعة في سورية. اضغط اسم المحصول لقراءة أولويات المتابعة؛ هذا دليل نوعي لا ترتيب إنتاج حالي ولا برنامج جرعات.')
directory += '<details class="agri-details"><summary>نطاق الدليل وكيف تُستخدم مصادره</summary><p>' + e(catalogue['scopeNote']) + '</p></details>'
directory += '<div class="crop-controls no-print"><div><label for="cropSearch">ابحث في الدليل</label><input id="cropSearch" type="search" class="field-control" placeholder="مثال: بندورة، عدس، زيتون"></div><div><label for="cropCategory">المجموعة</label><select id="cropCategory" class="field-control"><option value="">جميع المجموعات</option>' + ''.join(f'<option value="{e(x)}">{e(x)}</option>' for x in categories) + '</select></div><button class="secondary-button" type="button" id="cropReset">مسح التصفية</button></div><p id="cropResultCount" class="crop-result-count" aria-live="polite"></p><p id="cropEmpty" class="crop-empty" hidden>لا توجد محاصيل مطابقة. جرّب اسماً آخر أو ألغِ اختيار المجموعة.</p><div class="crop-catalogue">'
for crop in crops:
    systems = crop.get('systems', [])
    if isinstance(systems, list): systems = ' · '.join(str(x) for x in systems)
    checks = crop.get('checks', '')
    if isinstance(checks, list): checks = ' '.join(str(x) for x in checks)
    directory += f'<details class="crop-card" id="crop-{e(crop["id"])}" data-category="{e(crop["category"])}"><summary><span>{e(crop["name"])}<span class="crop-category">{e(crop["category"])}</span></span></summary><p><strong>السياق:</strong> {e(systems)}</p><p><strong>تركيز المتابعة:</strong> {e(crop["focus"])}</p><p><strong>قبل التسميد:</strong> {e(checks)}</p>{links(crop["sourceIds"])}<a href="#strategicCropRecommendations" class="agri-inline-source" data-crop-choice="{e(crop["id"])}">اختيار هذا المحصول في نموذج السياق</a></details>'
directory += '</div><p class="crop-directory-help">الأسماء تشمل تسميات محلية عند توفرها. مصادر الزراعة تثبت وجود المحصول؛ إرشادات التغذية النوعية مبادئ عامة وليست نتائج تجربة خاصة بكل صنف أو محافظة. زراعة محصول في سورية لا تعني أنه منتشر بالدرجة نفسها في كل منطقة.</p></section>'

options = ''.join(f'<optgroup label="{e(cat)}">' + ''.join(f'<option value="{e(c["id"])}">{e(c["name"])}</option>' for c in crops if c['category']==cat) + '</optgroup>' for cat in categories)

sources_html = section_start('sources','مراجع ظاهرة · معلومات قابلة للمراجعة','المصادر وحدود تطبيقها','المراجع السورية التاريخية والتجارب المحلية تعطي سياقاً محدداً. المراجع الجامعية الدولية تدعم مبادئ الإدارة والسلامة، ولا تُنقل معدلاتها إلى الحقول السورية تلقائياً.')
sources_html += '<div class="reference-list">'
for id, source in source_map.items():
    sources_html += f'<article class="reference-item" id="source-{e(id)}"><h3>{e(source["title"])}</h3><p>{e(source.get("supports", "مرجع داعم للفقرات المرتبطة به. راجع شروط الدراسة والمنطقة وطريقة القياس."))}</p><a href="{e(source["url"])}" target="_blank" rel="noopener noreferrer">قراءة المصدر الأصلي</a><p>تاريخ مراجعة الرابط والمحتوى: {e(reviewed)}</p></article>'
sources_html += '</div></section>'

# Safe brand asset handling: accept files inside public only; do not synthesize a QR.
def asset(path):
    file = (PUBLIC / path).resolve()
    if not file.is_relative_to(PUBLIC.resolve()) or not file.is_file():
        raise ValueError('Invalid brand asset: ' + path)
    return e(path)

allowed_image_sections = {'organicManure','greenhouseSchedules','cropDirectory','farmerTools','plantNutritionGuide','strategicCropRecommendations','diagnosisWizard','calculatorSection'}
section_image_html = {}
for image in section_images:
    section = image.get('section', '')
    if section not in allowed_image_sections:
        raise ValueError('Unsupported image section: ' + section)
    image_path = asset(image.get('file', ''))
    alt = e(image.get('alt', '').strip())
    if not alt:
        raise ValueError('Section image requires useful alt text: ' + image_path)
    caption = f'<figcaption>{e(image.get("caption", ""))}</figcaption>' if image.get('caption') else ''
    section_image_html.setdefault(section, []).append(f'<figure class="section-gallery-item"><img src="./{image_path}" alt="{alt}" loading="lazy">{caption}</figure>')

asset(config['logo'])
barcode = ''
header_barcode = ''
footer_qr = ''
if config.get('barcode'):
    image = asset(config['barcode'])
    label = e(config.get('barcodeLabel','رمز المنصة'))
    url = config.get('barcodeLink', '')
    if url and urlsplit(url).scheme != 'https': raise ValueError('Barcode link must be HTTPS')
    header_barcode = f'<a class="header-barcode" href="#platformBarcode" aria-label="عرض رمز QR المرفق بحجمه الواضح"><img src="./{image}" alt="رمز QR المرفق" width="48" height="48"></a>'
    footer_qr = f'<a href="#platformBarcode" aria-label="عرض رمز الزراعة النظيفة"><img src="./{image}" alt="رمز QR لموقع الزراعة النظيفة" width="80" height="80" loading="lazy"></a>'
    barcode = section_start('platformBarcode','هوية المنصة',label,'الصورة الأصلية التي زوّد بها صاحب الموقع، دون تغيير محتواها أو توليد بديل.')
    barcode += f'<div class="barcode-wrap"><img class="barcode-image" src="./{image}" alt="{label}" width="1024" height="1024" loading="lazy"><div>'
    if url:
        barcode += f'<p>الوجهة المقروءة من الرمز: <a class="agri-inline-source" href="{e(url)}" target="_blank" rel="noopener noreferrer" dir="ltr">{e(url)}</a></p><p class="crop-directory-help">إذا نُشر الموقع على عنوان مختلف، سيظل هذا الرمز يفتح الوجهة المذكورة أعلاه؛ لا يتغير الرابط بتغيير ملفات الموقع.</p>'
    barcode += f'<a href="./{image}" download class="secondary-button">تنزيل الرمز الأصلي</a></div></div></section>'

entry = '<nav class="farmer-entry" aria-label="مسارات المزارع"><a href="#organicManure"><i class="fa-solid fa-leaf" aria-hidden="true"></i>السماد الحيواني والبيوت البلاستيكية</a><a href="#greenhouseSchedules"><i class="fa-solid fa-table-list" aria-hidden="true"></i>جداول الطماطم والخيار</a><a href="#cropDirectory"><i class="fa-solid fa-seedling" aria-hidden="true"></i>دليل المحاصيل والأشجار</a><a href="#farmerTools"><i class="fa-solid fa-calculator" aria-hidden="true"></i>أدوات التسميد والري</a></nav>'

base_url = config.get('publicUrl','').rstrip('/')
seo = f'<meta property="og:type" content="website"><meta property="og:site_name" content="{e(config.get("title", "الزراعة النظيفة"))}"><meta name="twitter:card" content="summary"><meta name="keywords" content="زراعة سورية، تسميد، سماد عضوي، بيوت بلاستيكية، تغذية النبات">'
if base_url:
    if urlsplit(base_url).scheme != 'https': raise ValueError('Public URL must be a real HTTPS origin/path')
    seo += f'<link rel="canonical" href="{e(base_url)}/"><meta property="og:url" content="{e(base_url)}/"><meta property="og:image" content="{e(base_url)}/{e(config["logo"])}"><meta name="twitter:image" content="{e(base_url)}/{e(config["logo"])}">'
    (PUBLIC / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{e(base_url + path)}</loc></url>' for path in ['/', '/consultation/new/'])+'</urlset>\n', encoding='utf-8')
else:
    (PUBLIC / 'sitemap.xml').unlink(missing_ok=True)
(PUBLIC / 'robots.txt').write_text('User-agent: *\nAllow: /\n' + (f'Sitemap: {base_url}/sitemap.xml\n' if base_url else ''), encoding='utf-8')

html = (ROOT / 'src/index.template.html').read_text(encoding='utf-8')
contact_email = config.get('contactEmail', '')
contact_phone = config.get('contactPhone', '')
contact_phone_uri = re.sub(r'[^0-9+]', '', contact_phone)
replacements = {'ORGANIC_SECTION':organic_html,'GREENHOUSE_SCHEDULES':schedule_html,'CROP_DIRECTORY':directory,'FARMER_TOOLS':(ROOT/'src/farmer-tools-section.html').read_text(encoding='utf-8'),'CROP_OPTIONS':options,'CROP_COUNT':str(len(crops)),'SOURCES_SECTION':sources_html,'BARCODE_SECTION':barcode,'HEADER_BARCODE':header_barcode,'FOOTER_QR':footer_qr,'FARMER_ENTRY':entry,'SEO_METADATA':seo,'CONTACT_EMAIL':e(contact_email),'CONTACT_PHONE_URI':e(contact_phone_uri),'CONTACT_PHONE_DISPLAY':e(contact_phone)}
for key,value in replacements.items():
    html = html.replace('@@'+key+'@@',value)
# Apply only exact original statements verified by the research audit. HTML-level issues are also amended in source template by parent.
for issue in audit.get('issues', []):
    original, replacement = issue.get('original',''), issue.get('replacement','')
    if original and replacement and '<' not in original:
        html = html.replace(original, e(replacement))
html = html.replace('./assets/images/logo.png','./'+config['logo'])
for section, figures in section_image_html.items():
    gallery = '<div class="section-gallery">' + ''.join(figures) + '</div>'
    pattern = re.compile(r'(<section\b[^>]*\bid=["\']' + re.escape(section) + r'["\'][^>]*>.*?)(</section>)', re.S)
    html, matches = pattern.subn(lambda match: match.group(1) + gallery + match.group(2), html, count=1)
    if matches != 1:
        raise ValueError('Could not attach section images to: ' + section)
if re.search(r'@@[A-Z_]+@@',html): raise ValueError('Unresolved build marker')
(PUBLIC / 'index.html').write_text(html.rstrip()+'\n', encoding='utf-8')
# Serialize trusted catalogue data, escape HTML-sensitive chars even though this is external JS.
data = json.dumps(crops, ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
(PUBLIC / 'assets/js/crop-data.js').write_text('window.SyrAgriCrops = '+data+';\n', encoding='utf-8')
consultation = (ROOT / 'src/consultation.template.html').read_text(encoding='utf-8')
consultation = re.sub(r'(<select\b[^>]*\bid="demoCrop"[^>]*>).*?(</select>)',r'\g<1><option value="">اختر المحصول</option>'+options+r'\g<2>',consultation,flags=re.S)
consultation = consultation.replace('../../assets/images/logo.png','../../'+config['logo'])
if base_url:
    consultation = consultation.replace('</head>',f'<link rel="canonical" href="{e(base_url)}/consultation/new/"></head>')
(PUBLIC/'consultation/new/index.html').write_text(consultation.rstrip()+'\n',encoding='utf-8')
(PUBLIC/'.nojekyll').touch()
print(f'Built {len(crops)} crop records, {len(organic["paragraphs"])} organic topics, {len(source_map)} references, original supplied QR.')
