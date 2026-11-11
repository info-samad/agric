/* حسابات تحويلية فقط؛ لا توجد جرعات زراعية افتراضية. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const positive = id => {
    const input = byId(id);
    const text = input?.value.trim();
    if (!text || !input.checkValidity()) return null;
    const n = Number(text);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const output = (id, text) => { if (byId(id)) byId(id).textContent = text; };
  const fmt = n => new Intl.NumberFormat('ar-SY', {maximumFractionDigits: 3}).format(n);
  let activeCategory = 'all';
  const normalize = s => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[\u064B-\u065F]/g, '');

  window.filterContent = () => {
    const input = normalize(byId('searchInput')?.value.trim() || '');
    byId('clearBtn')?.classList.toggle('hidden', !input);
    let count = 0;
    document.querySelectorAll('#advisoryCards .card-item').forEach(card => {
      const show = (activeCategory === 'all' || card.classList.contains(activeCategory)) && (!input || normalize(card.textContent).includes(input));
      card.style.display = show ? 'flex' : 'none';
      if (show) count++;
    });
    const sectionIds = ['plantNutritionGuide', 'strategicCropRecommendations', 'diagnosisWizard', 'organicManure', 'cropDirectory', 'farmerTools'];
    sectionIds.forEach(id => {
      const section = byId(id);
      if (section) section.style.display = !input || normalize(section.textContent).includes(input) ? '' : 'none';
    });
    output('searchStatus', input ? `عُثر على ${count} بطاقات مواد؛ تظهر الأقسام التي تتضمن عبارة البحث أيضاً.` : 'ابحث عن محصول أو عنصر أو سماد عضوي.');
  };
  window.switchCategory = (cat, button) => {
    activeCategory = cat;
    document.querySelectorAll('.category-tab').forEach(tab => {
      const selected = tab === button;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    window.filterContent();
  };
  window.setSearchFilter = keyword => { byId('searchInput').value = keyword; window.filterContent(); };
  window.clearSearch = () => { byId('searchInput').value = ''; window.filterContent(); };
  window.switchCalcPane = paneName => {
    document.querySelectorAll('.calc-tab').forEach(tab => {
      const selected = tab.id === `calcTab-${paneName}`;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('.calc-pane').forEach(pane => pane.classList.toggle('hidden', pane.id !== `calcPane-${paneName}`));
  };
  window.updateAreaUnitLabel = (clearRate = false) => {
    if (clearRate) byId('dripRate').value = '';
    const names = {donum: 'دونم', hectare: 'هكتار', faddan: 'فدان'};
    output('dripRateLabel', `معدل المنتج (${byId('dripMassUnit').value || 'اختر وحدة الكمية'}) / ${names[byId('areaUnit').value]}:`);
    window.calculateDrip();
  };
  window.updateDripDefaults = () => {
    byId('dripMassUnit').value = '';
    byId('dripRate').value = '';
    window.updateAreaUnitLabel();
  };
  window.calculateDrip = () => {
    const area = positive('dripArea');
    const rate = positive('dripRate');
    if (area === null || rate === null || !['لتر','كغ'].includes(byId('dripMassUnit').value) || !Number.isFinite(area * rate)) {
      output('dripResultVal', 'أدخل قيماً موجبة وحدد وحدة المنتج');
      output('dripResultDesc', 'الكمية = المساحة × المعدل الموثق للوحدة نفسها. الأداة لا تقترح جرعة ولا تركيز حقن.');
      return;
    }
    const unitName = {donum: 'دونم', hectare: 'هكتار', faddan: 'فدان'}[byId('areaUnit').value];
    const massUnit = byId('dripMassUnit').value;
    output('dripResultVal', `${fmt(area * rate)} ${massUnit}`);
    output('dripResultDesc', `ناتج حسابي: ${fmt(area)} ${unitName} × ${fmt(rate)} ${massUnit}/${unitName}. ليست توصية إضافة.`);
  };
  window.updateSprayDefaults = () => { byId('sprayRate').value = ''; window.calculateSpray(); };
  window.calculateSpray = () => {
    const capacity = positive('tankCapacity');
    const rate = positive('sprayRate');
    if (capacity === null || rate === null || !Number.isFinite(capacity * rate)) {
      output('sprayResultVal', 'أدخل حجماً وتركيزاً موثقين');
      return;
    }
    const grams = capacity * rate;
    output('sprayResultVal', `${fmt(grams)} غرام${grams >= 1000 ? ` (${fmt(grams / 1000)} كغ)` : ''}`);
  };
  window.calculateFlush = () => {
    const water = positive('waterVolume');
    const flow = positive('flowRate');
    if (water === null || flow === null || !Number.isFinite(water / flow)) {
      output('flushResultVal', 'أدخل الحجم والتدفق الموجبين');
      output('flushDesc', 'حساب زمن نظري فقط، لا جرعة حمض أو زمن ملامسة.');
      return;
    }
    output('flushResultVal', `${fmt(water / flow)} دقيقة تقريباً`);
    output('flushDesc', `${fmt(water)} لتر ÷ ${fmt(flow)} لتر/دقيقة. لا يشمل تغير التدفق أو ضغط الشبكة.`);
  };
  document.addEventListener('DOMContentLoaded', () => {
    window.updateAreaUnitLabel();
    window.calculateSpray();
    window.calculateFlush();
    byId('searchInput')?.addEventListener('input', window.filterContent);
    window.filterContent();
  });
})();
