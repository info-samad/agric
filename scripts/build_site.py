from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SOURCE = ROOT / "src" / "source-original.html"
REC = ROOT / "src" / "recommendations-section.html"
DIAG = ROOT / "src" / "diagnosis-section.html"

html = SOURCE.read_text(encoding="utf-8")
html = "\n".join(line.rstrip() for line in html.splitlines()) + "\n"
start = html.index("    <!-- Tailwind CSS CDN -->")
style_start = html.index("    <style>", start)
local_head_assets = """    <meta name="theme-color" content="#163b27">
    <meta property="og:title" content="المنصة الاستشارية الزراعية السورية">
    <meta property="og:description" content="دليل تغذية النبات، إرشادات مشروطة للمحاصيل السورية، ومسار تشخيص أولي يعمل محلياً.">
    <link rel="stylesheet" href="./assets/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="./assets/css/site.css">
    <link rel="stylesheet" href="./assets/css/site-overrides.css">
"""
html = html[:start] + local_head_assets + html[style_start:]
html = html.replace("font-family: 'Tajawal', sans-serif;", "font-family: 'Noto Kufi Arabic', system-ui, sans-serif;")
html = html.replace('src="شعار.png"', 'src="./assets/images/شعار.png"')
html = html.replace('<main class="max-w-7xl', '<main id="main-content" class="max-w-7xl', 1)
html = html.replace('class="flex items-center justify-between h-24"', 'class="site-header-row flex items-center justify-between h-24"', 1)
html = html.replace('<!-- Brand Title & Brand Logo -->\n                <div class="flex items-center gap-4">', '<!-- Brand Title & Brand Logo -->\n                <div class="site-brand flex items-center gap-4">', 1)
html = html.replace('''src="./assets/images/شعار.png" class="w-full h-full object-contain" alt="شعار المنصة الزراعية">
                    </div>
                    <div>
                        <div class="flex items-center gap-2">''', '''src="./assets/images/شعار.png" class="w-full h-full object-contain" alt="شعار المنصة الزراعية">
                    </div>
                    <div class="site-brand-copy min-w-0">
                        <div class="flex items-center gap-2">''', 1)
html = html.replace('<div class="flex items-center gap-3 no-print">', '<div class="site-header-actions flex items-center gap-3 no-print">', 1)
mobile_nav = '''
    <nav class="site-mobile-nav xl:hidden" aria-label="تنقل سريع">
        <a class="site-mobile-nav-link" href="#plantNutritionGuide"><i class="fa-solid fa-book-open" aria-hidden="true"></i><span>دليل التغذية</span></a>
        <a class="site-mobile-nav-link" href="#strategicCropRecommendations"><i class="fa-solid fa-seedling" aria-hidden="true"></i><span>المحاصيل</span></a>
        <a class="site-mobile-nav-link" href="#diagnosisWizard"><i class="fa-solid fa-stethoscope" aria-hidden="true"></i><span>التشخيص</span></a>
    </nav>
'''
html = html.replace('</header>', '</header>\n' + mobile_nav, 1)
html = html.replace('id="searchInput" onkeyup="filterContent()"', 'id="searchInput" aria-label="البحث في الموسوعة الزراعية" onkeyup="filterContent()"', 1)
html = html.replace('<button onclick="clearSearch()" id="clearBtn"', '<button onclick="clearSearch()" id="clearBtn" aria-label="مسح البحث" title="مسح البحث"', 1)

body_start = html.index(">", html.index("<body")) + 1
html = html[:body_start] + '\n    <a class="skip-link" href="#main-content">انتقل إلى المحتوى</a>\n' + html[body_start:]
nav_anchor = '<a href="#plantNutritionGuide" class="hidden lg:inline-flex text-xs font-bold text-white hover:text-gold-400 px-2 py-2">دليل تغذية النبات</a>'
if nav_anchor not in html:
    raise RuntimeError("لم يُعثر على رابط دليل التغذية في شريط الرأس")
nav_links = nav_anchor + '''
                    <a href="#strategicCropRecommendations" class="hidden xl:inline-flex text-xs font-bold text-white hover:text-gold-400 px-2 py-2">توصيات المحاصيل</a>
                    <a href="#diagnosisWizard" class="hidden xl:inline-flex text-xs font-bold text-white hover:text-gold-400 px-2 py-2">تشخيص تفاعلي</a>'''
html = html.replace(nav_anchor, nav_links, 1)
section_anchor = "        <!-- SECTION 2: THE AGRONOMY CALCULATOR SYSTEM -->"
if section_anchor not in html:
    raise RuntimeError("لم يُعثر على موضع الحاسبات لإدراج الأقسام")
new_sections = REC.read_text(encoding="utf-8") + "\n" + DIAG.read_text(encoding="utf-8") + "\n"
html = html.replace(section_anchor, new_sections + section_anchor, 1)
last_script_end = html.rfind("</script>")
if last_script_end < 0:
    raise RuntimeError("لم يُعثر على مقطع JavaScript الأصلي")
script_end = last_script_end + len("</script>")
html = html[:script_end] + '\n    <script defer src="./assets/js/local-tools.js"></script>' + html[script_end:]
inline_style_end = html.find("</style>")
if inline_style_end < 0:
    raise RuntimeError("لم يُعثر على CSS المضمن")
skip_css = "\n        .skip-link{position:fixed;top:-5rem;right:1rem;z-index:100;background:#fff;color:#163b27;padding:.7rem 1rem;border:2px solid #d4af37;border-radius:.75rem;font-weight:800}.skip-link:focus{top:1rem}\n"
html = html[:inline_style_end] + skip_css + html[inline_style_end:]
html = "\n".join(line.rstrip() for line in html.splitlines()) + "\n"
(PUBLIC / "index.html").write_text(html, encoding="utf-8")
print(f"Built {PUBLIC / 'index.html'} ({len(html)} chars)")
