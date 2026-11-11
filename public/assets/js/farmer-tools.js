/* Farmer toolbox: no dependencies, persistence or network requests.
 * Browser: window.SyrAgriMath. Node: require('./farmer-tools.js').
 * Pure functions throw RangeError with an optional .field for invalid inputs.
 * Numeric strings accept Arabic/Persian digits and Arabic decimal separator.
 * Units: m2, dunum (1000 m²), ha (10000 m²). All masses are kg.
 */
(function (browser) {
  'use strict';

  const AREA_UNITS = Object.freeze({ m2: 1, dunum: 1000, ha: 10000 });
  // Documented approximate factors, supplied by the integrating agent from
  // Virginia Tech SPES-299. Reverse factors are independently rounded;
  // therefore a forward/reverse round trip is not mathematically exact.
  const OXIDE_FACTORS = Object.freeze({
    'P2O5:P': 0.4365,
    'P:P2O5': 2.2910,
    'K2O:K': 0.8301,
    'K:K2O': 1.2051
  });
  const NUTRIENTS = Object.freeze(['N', 'P2O5', 'K2O']);

  function fail(message, field) {
    const error = new RangeError(message);
    if (field) error.field = field;
    throw error;
  }

  function normalizeNumberText(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
      .replace(/٫/g, '.').trim();
  }

  /** parseNonNegativeNumber(value, { label?, field?, max? }) -> number.
   * Blank, signed, grouped, exponent-formatted, nonfinite or malformed strings
   * are rejected, rather than silently coerced. Finite numbers are also accepted.
   */
  function parseNonNegativeNumber(value, options = {}) {
    const label = options.label || 'القيمة';
    const field = options.field;
    const normalized = normalizeNumberText(value);
    if (normalized === '' || normalized === undefined || normalized === null) {
      fail(`أدخل ${label}؛ الحقل الفارغ لا يساوي صفراً.`, field);
    }
    if (typeof normalized !== 'number' &&
        (typeof normalized !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized))) {
      fail(`${label}: أدخل رقماً غير سالب، دون فواصل آلاف أو رموز إضافية.`, field);
    }
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) {
      fail(`${label}: يجب أن تكون القيمة محدودة وغير سالبة.`, field);
    }
    const max = options.max === undefined ? Infinity : options.max;
    if (number > max) fail(`${label}: القيمة يجب ألا تتجاوز ${max}.`, field);
    return number;
  }

  function numeric(value, label, field, max) {
    return parseNonNegativeNumber(value, { label, field, max });
  }

  function choice(value, allowed, label, field) {
    if (!allowed.includes(value)) fail(`اختر ${label} صراحةً.`, field);
    return value;
  }

  function finiteResult(value) {
    if (!Number.isFinite(value) || value < 0) {
      fail('النتيجة خارج النطاق العددي الممكن؛ راجع حجم المدخلات والوحدات.');
    }
    return value;
  }

  function squareMetres(area, unit, field = 'area', unitField = 'areaUnit') {
    const size = numeric(area, 'المساحة', field);
    choice(unit, Object.keys(AREA_UNITS), 'وحدة المساحة', unitField);
    return finiteResult(size * AREA_UNITS[unit]);
  }

  /** convertArea({ mode:'dimensions', length, width }) or
   * convertArea({ mode:'area', area, unit }) -> {squareMetres,dunums,hectares}.
   */
  function convertArea(input = {}) {
    choice(input.mode, ['dimensions', 'area'], 'طريقة إدخال المساحة', 'mode');
    const area = input.mode === 'dimensions'
      ? finiteResult(numeric(input.length, 'الطول', 'length') * numeric(input.width, 'العرض', 'width'))
      : squareMetres(input.area, input.unit, 'area', 'unit');
    return { squareMetres: area, dunums: area / 1000, hectares: area / 10000 };
  }

  /** fertilizerMass({rate,rateUnit:'ha'|'dunum',area,areaUnit,
   * nutrient:'N'|'P2O5'|'K2O',productBasis,productPercent}).
   * Rate and product bases must match explicitly. No crop dose is inferred.
   * 0% is valid as a percentage but cannot define a finite product mass.
   */
  function fertilizerMass(input = {}) {
    const rate = numeric(input.rate, 'معدل العنصر', 'rate');
    const rateUnit = choice(input.rateUnit, ['ha', 'dunum'], 'وحدة المعدل', 'rateUnit');
    const areaSquareMetres = squareMetres(input.area, input.areaUnit);
    const nutrient = choice(input.nutrient, NUTRIENTS, 'أساس العنصر في المعدل', 'nutrient');
    const productBasis = choice(input.productBasis, ['N', 'P2O5', 'K2O', 'P', 'K'], 'أساس العنصر على المنتج', 'productBasis');
    if (productBasis !== nutrient) {
      fail('أساس العنصر غير متطابق: P ليس P₂O₅ وK ليس K₂O. حوّل الأساس بصورة مستقلة ثم أدخل قيماً متطابقة؛ لا يوجد تحويل تلقائي للجرعة.', 'productBasis');
    }
    const productPercent = numeric(input.productPercent, 'نسبة العنصر في المنتج (%)', 'productPercent', 100);
    if (productPercent === 0) fail('نسبة العنصر 0%: لا يمكن حساب كتلة منتج بتقسيم الكمية على صفر، حتى عند معدل صفري.', 'productPercent');
    const areaInRateUnits = areaSquareMetres / AREA_UNITS[rateUnit];
    const nutrientKg = finiteResult(rate * areaInRateUnits);
    const productKg = finiteResult(nutrientKg / (productPercent / 100));
    return {
      rate, rateUnit, nutrient, productBasis, productPercent,
      areaSquareMetres, areaInRateUnits, nutrientKg, productKg,
      suppliedNutrientKg: nutrientKg
    };
  }

  /** convertOxide({amount,from:'P2O5'|'P'|'K2O'|'K',to}) ->
   * {amount,from,to,factor,convertedAmount}. Unit remains unchanged.
   */
  function convertOxide(input = {}) {
    const amount = numeric(input.amount, 'القيمة المراد تحويلها', 'amount');
    const key = `${input.from}:${input.to}`;
    if (!Object.prototype.hasOwnProperty.call(OXIDE_FACTORS, key)) {
      fail('اختر تحويل P₂O₅ إلى P أو العكس، أو K₂O إلى K أو العكس.', 'direction');
    }
    const factor = OXIDE_FACTORS[key];
    return { amount, from: input.from, to: input.to, factor, convertedAmount: finiteResult(amount * factor) };
  }

  /** manureNutrients({wetMass,analysisBasis:'wet'|'dry',moisturePercent?,
   * nPercent,p2o5Percent,k2oPercent,nAvailabilityPercent,nGoalKg?}).
   * Each analysis percentage and first-season N availability is mandatory.
   * Moisture is mandatory only on dry basis. Blank optional goal means absent.
   * Remaining goal is max(0, goal - available N); other N sources are excluded.
   */
  function manureNutrients(input = {}) {
    const wetMass = numeric(input.wetMass, 'الكتلة الرطبة (كغ)', 'wetMass');
    const analysisBasis = choice(input.analysisBasis, ['wet', 'dry'], 'أساس التحليل', 'analysisBasis');
    let moisturePercent = null;
    const hasMoisture = input.moisturePercent !== undefined && input.moisturePercent !== null &&
      normalizeNumberText(input.moisturePercent) !== '';
    if (analysisBasis === 'dry' || hasMoisture) {
      moisturePercent = numeric(input.moisturePercent, 'الرطوبة (%)', 'moisturePercent', 100);
    }
    const nPercent = numeric(input.nPercent, 'N في التحليل (%)', 'nPercent', 100);
    const p2o5Percent = numeric(input.p2o5Percent, 'P₂O₅ في التحليل (%)', 'p2o5Percent', 100);
    const k2oPercent = numeric(input.k2oPercent, 'K₂O في التحليل (%)', 'k2oPercent', 100);
    const nAvailabilityPercent = numeric(input.nAvailabilityPercent, 'إتاحة N للموسم الأول (%)', 'nAvailabilityPercent', 100);
    const analysisMassFraction = analysisBasis === 'dry' ? 1 - moisturePercent / 100 : 1;
    const analysisMassKg = finiteResult(wetMass * analysisMassFraction);
    const totalNKg = finiteResult(analysisMassKg * (nPercent / 100));
    const availableNKg = finiteResult(totalNKg * (nAvailabilityPercent / 100));
    const totalP2O5Kg = finiteResult(analysisMassKg * (p2o5Percent / 100));
    const totalK2OKg = finiteResult(analysisMassKg * (k2oPercent / 100));
    const hasGoal = input.nGoalKg !== undefined && input.nGoalKg !== null && normalizeNumberText(input.nGoalKg) !== '';
    const nGoalKg = hasGoal ? numeric(input.nGoalKg, 'هدف N للموسم (كغ)', 'nGoalKg') : null;
    return {
      wetMass, analysisBasis, moisturePercent, analysisMassFraction, analysisMassKg,
      nPercent, p2o5Percent, k2oPercent, nAvailabilityPercent,
      totalNKg, availableNKg, totalP2O5Kg, totalK2OKg, nGoalKg,
      remainingNGoalKg: hasGoal ? Math.max(0, nGoalKg - availableNKg) : null,
      excessAvailableNKg: hasGoal ? Math.max(0, availableNKg - nGoalKg) : null
    };
  }

  /** parseDischargeReadings(text) -> fresh numeric array.
   * Commas (Latin/Arabic), newlines and whitespace delimit readings; a dot or
   * Arabic decimal mark is decimal. Empty comma-delimited values are invalid.
   */
  function parseDischargeReadings(text) {
    if (typeof text !== 'string' || normalizeNumberText(text) === '') {
      fail('أدخل قراءات التصريف المقاسة.', 'readings');
    }
    const normalized = normalizeNumberText(text).replace(/،/g, ',');
    const groups = normalized.split(',');
    if (groups.some((group) => group.trim() === '')) {
      fail('توجد قراءة فارغة بين الفواصل؛ أدخل كل قراءة صراحةً أو احذف الفاصلة الزائدة.', 'readings');
    }
    return groups.flatMap((group) => group.trim().split(/\s+/))
      .map((reading, index) => numeric(reading, `قراءة التصريف رقم ${index + 1}`, 'readings'));
  }

  /** dripUniformity(text | number[]) -> {count,lowestQuarterCount,
   * mean,lowestQuarterMean,duPercent,approximateQuarter,readings}.
   * Lowest quarter uses ceil(n/4); no thresholds or agronomic verdict.
   */
  function dripUniformity(input) {
    const readings = Array.isArray(input)
      ? Array.from(input, (value, index) => numeric(value, `قراءة التصريف رقم ${index + 1}`, 'readings'))
      : parseDischargeReadings(input);
    const count = readings.length;
    if (count < 4) fail('أدخل 4 قراءات على الأقل لحساب الربع الأدنى.', 'readings');
    const sorted = readings.slice().sort((a, b) => a - b);
    // Scaled mean avoids overflowing a sum of otherwise finite measurements.
    const scale = sorted[count - 1];
    if (scale === 0) fail('متوسط التصريف يجب أن يكون أكبر من صفر؛ جميع القراءات صفرية.', 'readings');
    const meanNormalized = readings.reduce((sum, value) => sum + value / scale / count, 0);
    const lowestQuarterCount = Math.ceil(count / 4);
    const lowestQuarterNormalized = sorted.slice(0, lowestQuarterCount)
      .reduce((sum, value) => sum + value / scale / lowestQuarterCount, 0);
    const mean = finiteResult(scale * Math.min(1, meanNormalized));
    if (mean === 0) fail('متوسط القراءات أصغر من النطاق العددي الممكن؛ راجع وحدة القياس.', 'readings');
    const lowestQuarterMean = finiteResult(scale * Math.min(1, lowestQuarterNormalized));
    const duPercent = finiteResult(Math.min(100, lowestQuarterNormalized / meanNormalized * 100));
    return { count, lowestQuarterCount, mean, lowestQuarterMean, duPercent, approximateQuarter: count % 4 !== 0, readings };
  }

  const api = Object.freeze({
    AREA_UNITS, OXIDE_FACTORS, normalizeNumberText, parseNonNegativeNumber,
    convertArea, fertilizerMass, convertOxide, manureNutrients,
    parseDischargeReadings, dripUniformity
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (browser) browser.SyrAgriMath = api;

  // All DOM access is conditional: requiring this file in Node needs no DOM.
  if (!browser || !browser.document) return;
  const document = browser.document;
  const unitLabels = { m2: 'م²', dunum: 'دونم', ha: 'هكتار' };
  const nutrientLabels = { N: 'N', P2O5: 'P₂O₅', K2O: 'K₂O', P: 'P', K: 'K' };
  const resultsText = new WeakMap();

  function format(value) {
    const scientific = value !== 0 && (Math.abs(value) < 0.0001 || Math.abs(value) >= 1e10);
    return new Intl.NumberFormat('ar-SY', {
      maximumSignificantDigits: 6,
      notation: scientific ? 'scientific' : 'standard'
    }).format(value);
  }

  function valueOf(form, name) {
    const field = form.elements && form.elements.namedItem(name);
    return field && typeof field.value === 'string' ? field.value : '';
  }

  function toggleFields(container, visible) {
    if (!container) return;
    container.hidden = !visible;
    container.querySelectorAll('input,select,textarea').forEach((field) => { field.disabled = !visible; });
  }

  function updateConditionalFields(form) {
    if (form.dataset.ftCalculator === 'area') {
      const mode = valueOf(form, 'mode');
      toggleFields(form.querySelector('[data-ft-dimensions]'), mode === 'dimensions');
      toggleFields(form.querySelector('[data-ft-known-area]'), mode === 'area');
    }
    if (form.dataset.ftCalculator === 'manure') {
      toggleFields(form.querySelector('[data-ft-moisture-field]'), valueOf(form, 'analysisBasis') === 'dry');
    }
  }

  function clearInvalid(form) {
    form.querySelectorAll('[aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
  }

  function resetResult(form, text) {
    const output = form.querySelector('[data-ft-result]');
    if (output) {
      output.removeAttribute('data-ft-state');
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      output.replaceChildren(paragraph);
    }
    resultsText.delete(form);
    const download = form.querySelector('[data-ft-download]');
    if (download) download.disabled = true;
    clearInvalid(form);
  }

  function renderResult(form, title, rows, notes) {
    const output = form.querySelector('[data-ft-result]');
    if (!output) return;
    output.dataset.ftState = 'success';
    const heading = document.createElement('p');
    heading.className = 'ft-result-title';
    heading.textContent = title;
    const list = document.createElement('dl');
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'ft-result-row';
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      list.append(row);
    });
    output.replaceChildren(heading, list);
    notes.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.className = 'ft-result-note';
      paragraph.textContent = text;
      output.append(paragraph);
    });
    const text = [title, ...rows.map(([label, value]) => `${label}: ${value}`), ...notes,
      'النتائج تقريبية بحسب دقة المدخلات. هذه محاسبة حسابية وليست توصية زراعية.'].join('\n');
    resultsText.set(form, text);
    const download = form.querySelector('[data-ft-download]');
    if (download) download.disabled = false;
  }

  function calculateForm(form) {
    const input = {};
    Array.from(form.elements || []).forEach((field) => {
      if (field.name && !field.disabled) input[field.name] = field.value;
    });
    const type = form.dataset.ftCalculator;
    const rows = [];
    const notes = [];
    let title;
    if (type === 'area') {
      const result = convertArea(input);
      title = 'نتيجة المساحة';
      rows.push(['بالمتر المربع', `${format(result.squareMetres)} م²`],
        ['بالدونم (1000 م²)', `${format(result.dunums)} دونم`],
        ['بالهكتار (10000 م²)', `${format(result.hectares)} هكتار`]);
      notes.push(input.mode === 'dimensions'
        ? `من طول ${format(numeric(input.length))} م × عرض ${format(numeric(input.width))} م. الحساب يفترض مستطيلاً.`
        : `المساحة المدخلة: ${format(numeric(input.area))} ${unitLabels[input.unit]}.`);
    } else if (type === 'fertilizer') {
      const result = fertilizerMass(input);
      title = 'كتلة المنتج المقابلة للمعدل المدخل';
      rows.push(['كتلة منتج السماد', `${format(result.productKg)} كغ`],
        [`العنصر المُزوَّد على أساس ${nutrientLabels[result.nutrient]}`, `${format(result.suppliedNutrientKg)} كغ`],
        ['مساحة التطبيق', `${format(result.areaSquareMetres)} م²`]);
      notes.push(`المعدل المدخل: ${format(result.rate)} كغ ${nutrientLabels[result.nutrient]} / ${unitLabels[result.rateUnit]}؛ نسبة المنتج: ${format(result.productPercent)}٪ على الأساس نفسه.`,
        'العناصر المضمونة الأخرى في المنتج تحتاج محاسبة مستقلة، وقد تُضاف مع هذه الكتلة. لا يحدد هذا الحساب احتياج المحصول أو توقيت الإضافة.');
    } else if (type === 'oxide') {
      const direction = (input.direction || '').split(':');
      const result = convertOxide({ amount: input.amount, from: direction[0], to: direction[1] });
      title = 'تحويل أساس العنصر فقط';
      rows.push([`من ${nutrientLabels[result.from]}`, format(result.amount)],
        [`إلى ${nutrientLabels[result.to]}`, format(result.convertedAmount)],
        ['عامل التحويل التقريبي', format(result.factor)]);
      notes.push('تبقى الوحدة كما أدخلتها (كغ أو نسبة مثلاً). العوامل الأمامية والعكسية تقريبية مقربة بصورة مستقلة. ليس هذا تفسيراً لمعدل تسميد محصول.');
    } else if (type === 'manure') {
      const result = manureNutrients(input);
      title = 'عناصر محمولة في الكتلة المعلومة';
      rows.push(['N الكلي', `${format(result.totalNKg)} كغ`],
        ['N المتوقع إتاحته في الموسم الأول', `${format(result.availableNKg)} كغ`],
        ['P₂O₅ الكلي فقط', `${format(result.totalP2O5Kg)} كغ`],
        ['K₂O الكلي فقط', `${format(result.totalK2OKg)} كغ`]);
      if (result.nGoalKg !== null) {
        rows.push(['هدف N للموسم المدخل بصورة مستقلة', `${format(result.nGoalKg)} كغ`],
          ['المتبقي المتوقع من هدف N بعد هذه المساهمة', `${format(result.remainingNGoalKg)} كغ`]);
        if (result.excessAvailableNKg > 0) rows.push(['مساهمة N المتاح فوق الهدف المدخل', `${format(result.excessAvailableNKg)} كغ`]);
        notes.push('المتبقي = أقصى قيمة بين صفر و(الهدف − N المتوقع إتاحته). مصادر N الأخرى غير محسوبة؛ النتيجة ليست جرعة سماد ولا ضماناً لتغطية الاحتياج.');
      }
      notes.push(`الكتلة الرطبة المدخلة: ${format(result.wetMass)} كغ. أساس التحليل: ${result.analysisBasis === 'dry' ? `جاف؛ الرطوبة ${format(result.moisturePercent)}٪؛ الكتلة الجافة ${format(result.analysisMassKg)} كغ` : 'رطب؛ لا يُطبق تصحيح رطوبة'}.`,
        `نسب التحليل المدخلة: N ${format(result.nPercent)}٪، P₂O₅ ${format(result.p2o5Percent)}٪، K₂O ${format(result.k2oPercent)}٪. إتاحة N التي أدخلتها: ${format(result.nAvailabilityPercent)}٪.`,
        'لم تُفترض إتاحة لـP₂O₅ أو K₂O. النضج وEC ومسببات الأمراض وحدود الفوسفور قد تمنع الاستخدام بصورة مستقلة. لا يُحسب معدل إضافة السماد العضوي.');
    } else if (type === 'drip') {
      const result = dripUniformity(input.readings);
      title = 'انتظام التوزيع للربع الأدنى (DU)';
      rows.push(['عدد القراءات', format(result.count)],
        ['متوسط جميع القراءات', format(result.mean)],
        ['عدد قراءات الربع الأدنى المستخدم', format(result.lowestQuarterCount)],
        ['متوسط قراءات الربع الأدنى', format(result.lowestQuarterMean)],
        ['DU', `${format(result.duPercent)}٪`]);
      notes.push(result.approximateQuarter
        ? `العدد ${format(result.count)} ليس مضاعفاً لـ4: استُخدم أقل ${format(result.lowestQuarterCount)} قراءة بتقريب العدد ÷ 4 إلى الأعلى؛ هذا تقريب للربع الأدنى.`
        : 'عدد القراءات مضاعف لـ4؛ الربع الأدنى يساوي ربع القراءات تماماً.',
        `القراءات المدخلة، بوحدة واحدة: ${result.readings.map(format).join('، ')}.`,
        'المتوسطات بنفس وحدة القياس المدخلة. لا توجد عتبات زراعية أو تصنيفات لونية في هذه النتيجة.');
    } else {
      return;
    }
    renderResult(form, title, rows, notes);
  }

  function downloadResult(form) {
    const text = resultsText.get(form);
    if (!text || typeof browser.Blob !== 'function' || !browser.URL || !browser.URL.createObjectURL) return;
    const blob = new browser.Blob(['\uFEFF' + text + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = browser.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `syragri-${form.dataset.ftCalculator}-result.txt`;
    link.hidden = true;
    form.append(link);
    link.click();
    link.remove();
    browser.setTimeout(() => browser.URL.revokeObjectURL(url), 1000);
  }

  function init() {
    const section = document.getElementById('farmerTools');
    if (!section || section.dataset.ftReady === 'true') return;
    section.dataset.ftReady = 'true';
    section.querySelectorAll('form[data-ft-calculator]').forEach((form) => {
      updateConditionalFields(form);
      const initialOutput = form.querySelector('[data-ft-result]');
      const initialText = initialOutput ? initialOutput.textContent.trim() : 'أكمل المدخلات ثم احسب النتيجة.';
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearInvalid(form);
        try {
          calculateForm(form);
        } catch (error) {
          resetResult(form, error instanceof Error ? error.message : 'تعذر الحساب؛ راجع المدخلات.');
          const output = form.querySelector('[data-ft-result]');
          if (output) output.dataset.ftState = 'error';
          const field = error && error.field && form.elements ? form.elements.namedItem(error.field) : null;
          if (field && !field.disabled && typeof field.focus === 'function') {
            field.setAttribute('aria-invalid', 'true');
            field.focus();
          }
        }
      });
      const onEdit = () => {
        updateConditionalFields(form);
        resetResult(form, 'تغيّرت المدخلات؛ اضغط زر الحساب لعرض نتيجة محدثة.');
      };
      form.addEventListener('input', onEdit);
      form.addEventListener('change', onEdit);
      form.addEventListener('reset', () => {
        resetResult(form, initialText);
        browser.setTimeout(() => updateConditionalFields(form), 0);
      });
      const download = form.querySelector('[data-ft-download]');
      if (download) download.addEventListener('click', () => downloadResult(form));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(typeof window !== 'undefined' ? window : null);
