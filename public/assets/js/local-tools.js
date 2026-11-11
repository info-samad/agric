(() => {
  'use strict';

  const selectOptions = (select, options, placeholder) => {
    if (!select) return;
    select.replaceChildren();
    if (placeholder) {
      const first = document.createElement('option');
      first.value = '';
      first.textContent = placeholder;
      select.append(first);
    }
    for (const option of options) {
      const item = document.createElement('option');
      item.value = option[0];
      item.textContent = option[1];
      select.append(item);
    }
  };

  const cropSettings = {
    wheat: {
      title: 'القمح',
      systemLabel: 'نظام الزراعة والماء',
      stageLabel: 'الصنف/مرحلة النمو',
      systems: [['rainfed', 'بعلي'], ['supplemental', 'بعلي مع ري تكميلي'], ['irrigated', 'مروي']],
      stages: [['local', 'صنف محلي'], ['improved', 'صنف محسن'], ['unknown', 'الصنف غير معروف']]
    },
    cotton: {
      title: 'القطن',
      systemLabel: 'طريقة الري',
      stageLabel: 'مرحلة نمو المحصول',
      systems: [['drip', 'تنقيط/تسميد مع الري'], ['furrow', 'ري بالأخاديد'], ['other', 'طريقة أخرى/غير معروفة']],
      stages: [['preplant', 'قبل الزراعة'], ['vegetative', 'النمو الخضري'], ['flowering', 'التزهير والعقد'], ['boll', 'تكوين اللوز وامتلاؤه'], ['unknown', 'المرحلة غير معروفة']]
    },
    pistachio: {
      title: 'الفستق الحلبي',
      systemLabel: 'حالة البستان',
      stageLabel: 'العمر/المعاومة',
      systems: [['young', 'أشجار فتية غير مثمرة'], ['bearing', 'أشجار مثمرة'], ['unknown', 'حالة البستان غير معروفة']],
      stages: [['on', 'سنة حمل جيد'], ['off', 'سنة حمل خفيف/معاومة'], ['unknown', 'العمر أو سنة الحمل غير معروفين']]
    }
  };

  function updateRecommendation() {
    const crop = document.getElementById('recCrop')?.value || 'wheat';
    const record = (window.SyrAgriCrops || []).find(item => item.id === crop);
    const cfg = cropSettings[crop] || {
      title: record?.name || 'المحصول',
      systemLabel: 'بيئة الزراعة ونظام الماء',
      stageLabel: 'مرحلة النمو',
      systems: [['rainfed', 'بعلي'], ['irrigated', 'مروي في أرض مكشوفة'], ['protected', 'بيت بلاستيكي في تربة'], ['unknown', 'غير معروف']],
      stages: [['preplant', 'قبل الزراعة أو تأسيس البستان'], ['vegetative', 'نمو خضري'], ['flowering', 'تزهير وعقد'], ['bearing', 'إنتاج أو امتلاء'], ['after', 'بعد الحصاد'], ['unknown', 'غير معروف']]
    };
    const system = document.getElementById('recSystem')?.value || '';
    const stage = document.getElementById('recStage')?.value || '';
    const governorate = document.getElementById('recGovernorate')?.value || '';
    const analysis = document.getElementById('recAnalysis')?.value || 'unknown';
    const systemLabel = document.getElementById('recSystemLabel');
    const stageLabel = document.getElementById('recStageLabel');
    const systemSelect = document.getElementById('recSystem');
    const stageSelect = document.getElementById('recStage');
    const cropChanged = systemSelect.dataset.crop !== crop;

    if (cropChanged) {
      systemSelect.dataset.crop = crop;
      stageSelect.dataset.crop = crop;
      systemLabel.textContent = cfg.systemLabel;
      stageLabel.textContent = cfg.stageLabel;
      selectOptions(systemSelect, cfg.systems, 'اختر');
      selectOptions(stageSelect, cfg.stages, 'اختر');
      return updateRecommendation();
    }

    const messages = [];
    if (!system || !stage) messages.push('أكمل اختيار نظام الماء/حالة البستان ومرحلة المحصول ليصبح الملخص أوضح.');
    if (governorate) messages.push(`اخترت محافظة ${governorate}؛ اسم المحافظة وحده لا يحدد تحليل التربة أو كمية المطر أو فئة المنطقة الزراعية التاريخية.`);
    if (analysis === 'no') {
      messages.push('لا يوجد تحليل حديث: لا تحدد كمية سماد الآن. ابدأ بعينة تربة ممثلة، وأضف تحليل ماء الري عند وجود ملوحة أو مشكلة في الماء.');
    } else if (analysis === 'yes') {
      messages.push('يتوفر تحليل: راجع تاريخ العينة وعمقها ونتائج pH والملوحة والعناصر، ووازنها مع المحصول السابق وماء الري. لا يحسب هذا النموذج جرعة من دون قيم التحليل ومعيار محلي.');
    } else {
      messages.push('إذا لم تتأكد من وجود تحليل حديث، فاعتبر حالة التربة والماء غير معروفة ولا تبنِ الجرعة على لون النبات وحده.');
    }

    if (crop === 'wheat') {
      const waterText = system === 'irrigated' ? 'لنظام القمح المروي' : system === 'supplemental' ? 'للري التكميلي مع المطر' : system === 'rainfed' ? 'للزراعة البعلية' : 'للزراعة البعلية أو المروية';
      messages.unshift(`${waterText}: راعِ مطر الموسم ورطوبة الجذور والصنف وسجل المحصول السابق. الأرقام الظاهرة في الجدول المقابل مأخوذة من تقرير FAO لسوريا لعام 2003 وتصنيفاته التاريخية؛ ليست معدلات حالية، ولا يمكن استنتاج المنطقة الزراعية من المحافظة وحدها.`);
      if (stage === 'local' || stage === 'improved') messages.push('سجّل الصنف بدقة؛ جداول FAO القديمة فرّقت بين أصناف محسنة ومحلية، ولا تثبت صلاحية المعدل للصنف الحالي.');
      if (system === 'rainfed' || system === 'supplemental') messages.push('في البعل، اربط أي قرار نيتروجيني بعد الزراعة بحالة الرطوبة ومطر الموسم واحتمال الجفاف، وارجع إلى المرشد المحلي قبل إضافة دفعة إضافية.');
    } else if (crop === 'cotton') {
      messages.unshift(system === 'drip' ? 'القطن المروي بالتنقيط: أقرب دليل سوري معاصر وجدناه تجربة 2022–2023 في محطة تل حديا بحلب على صنف حلب 118 وتربة طينية عميقة؛ خفض العناصر إلى 75% من التوصية خفّض الغلة هناك، لكن ذلك لا يحدد الجرعة لحقل آخر.' : system === 'furrow' ? 'القطن بالري بالأخاديد: لا تنقل معدلات تجربة التنقيط مباشرة إلى الأخاديد. تختلف كفاءة الري والغسل ورطوبة الجذور؛ اعتمد تحليل الحقل والتوصية المحلية.' : 'القطن: اربط برنامج NPK بنظام الري والتربة والماء ومرحلة النبات، ولا تستخدم رقماً موحداً لكل الحقول.');
      if (stage === 'flowering' || stage === 'boll') messages.push('في التزهير والعقد وتكوين اللوز راقب انتظام الماء والحمل والنمو الخضري؛ لا تعالج التساقط أو ضعف العقد بإضافة عنصر دون تشخيص السبب.');
    } else if (crop === 'pistachio') {
      const status = system === 'young' ? 'الأشجار الفتية' : system === 'bearing' ? 'الأشجار المثمرة' : 'هذا البستان';
      messages.unshift(`${status}: تختلف احتياجات الفستق مع العمر وحمل الثمار والمعاومة والري. التجربة السورية المنشورة في حماة تخص أشجار عاشوري بعمر 33 سنة؛ لا تنقل نتائجها أو كميات المادة العضوية إلى أشجار فتية أو بستان مختلف.`);
      if (stage === 'on' || stage === 'off') messages.push('دوّن حمل الموسم السابق والحالي؛ لا ترفع أو تخفض التغذية آلياً بسبب سنة الحمل وحدها.');
      messages.push('في البستان، افحص التربة وماء الري، واطلب تحليل الأوراق بتوقيت وطريقة يحددهما المختبر أو المرشد المحلي. حلّل السماد العضوي/الكمبوست قبل الإضافة لمعرفة العناصر والملوحة.');
    } else if (record) {
      messages.unshift(record.focus);
      messages.push(Array.isArray(record.checks) ? record.checks.join(' ') : record.checks);
      if (system === 'protected') messages.push('للبيت البلاستيكي في تربة: راجع قسم السماد الحيواني. النضج والسلامة والملوحة والفوسفور شروط مستقلة عن الحساب الغذائي؛ لا تستخدم منقوع الروث في التنقيط.');
      messages.push('اختيارات النظام والمرحلة لتنظيم السياق فقط، ولا تثبت أن كل نظام أو مرحلة يناسب هذا المحصول. لا توجد جرعة تلقائية أو تعديل رقمي بحسب الاختيارات.');
    }

    document.getElementById('recResultTitle').textContent = `${cfg.title}${system ? ` — ${systemSelect.selectedOptions[0].textContent}` : ''}`;
    document.getElementById('recResultText').textContent = messages.join(' ');
  }

  const diagnosticSteps = [
    {
      id: 'crop', title: 'ما المحصول الذي تظهر عليه الأعراض؟', hint: 'هذا الاختيار يساعد على توجيه الأسئلة فقط، ولا يحدد السبب وحده.', options: [
        ['wheat', 'القمح'], ['cotton', 'القطن'], ['pistachio', 'الفستق الحلبي'], ['protected', 'خضروات بيت بلاستيكي'], ['vegetables', 'خضروات مكشوفة'], ['trees', 'أشجار مثمرة أخرى'], ['other', 'محصول آخر']
      ]
    },
    {
      id: 'age', title: 'أين بدأ العرض؟ وما عمر الأوراق المصابة؟', hint: 'قارن ورقة قديمة وأخرى حديثة على النبات نفسه.', options: [
        ['old', 'الأوراق الأقدم في أسفل النبات'], ['young', 'الأوراق الحديثة أو القمة النامية'], ['all', 'أوراق بأعمار مختلفة أو كامل النبات'], ['fruit', 'القمم أو الأزهار أو الثمار'], ['unsure', 'غير متأكد']
      ]
    },
    {
      id: 'symptom', title: 'ما الشكل الأقرب لما تراه؟', hint: 'اختر النمط الأوضح، لا لوناً واحداً فقط.', options: [
        ['uniform-yellow', 'اصفرار عام أو شحوب'], ['interveinal', 'اصفرار بين العروق مع بقاء العروق أوضح'], ['edge-burn', 'احتراق أو اصفرار عند حواف الأوراق'], ['spots', 'بقع محددة أو هالات أو مسحوق/زغب أو فسيفساء'], ['deformed', 'تشوه أو التفاف الأوراق الحديثة أو موت القمة'], ['wilt', 'ذبول أو تقزم أو ضعف نمو'], ['purple', 'تلون بنفسجي أو داكن مع بطء النمو'], ['other', 'علامة أخرى أو وصف غير واضح']
      ]
    },
    {
      id: 'pattern', title: 'كيف يتوزع العرض في الحقل أو البستان؟', hint: 'التوزع المكاني قد يكشف مشكلة ماء أو تربة أو رش أو عدوى.', options: [
        ['uniform', 'متقارب في معظم الحقل'], ['patches', 'بقع أو أجزاء محددة من الحقل'], ['row', 'خطوط/صفوف أو قرب نقاط الري'], ['spread', 'بدأ في نباتات ثم امتد إلى جوارها'], ['unknown', 'لا أستطيع تحديد النمط']
      ]
    },
    {
      id: 'trigger', title: 'هل سبق العرض عامل واضح أو تغير حديث؟', hint: 'اختر الأقرب خلال الأيام أو الأسابيع السابقة لظهور العلامات.', options: [
        ['spray', 'ظهر بعد رش مبيد أو سماد ورقي'], ['water-stress', 'جفاف أو زيادة ري أو تعطل صرف'], ['salinity', 'ماء مالح/تربة متملحة أو قشرة ملحية'], ['fert-change', 'تغيير حديث في التسميد أو مصدر السماد'], ['none', 'لا يوجد عامل واضح أو لا أعلم']
      ]
    }
  ];
  const answers = {};
  let stepIndex = 0;

  function renderDiagnosticStep() {
    const step = diagnosticSteps[stepIndex];
    const area = document.getElementById('diagQuestion');
    area.innerHTML = '';
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'diagnosis-fieldset';
    const legend = document.createElement('legend');
    legend.className = 'text-lg sm:text-xl font-black text-slate-900 mb-2';
    legend.textContent = step.title;
    fieldset.append(legend);
    const help = document.createElement('p');
    help.className = 'text-sm text-slate-600 leading-6 mb-4';
    help.textContent = step.hint;
    fieldset.append(help);
    const options = document.createElement('div');
    options.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2';
    step.options.forEach(([value, label], i) => {
      const wrap = document.createElement('label');
      wrap.className = 'diagnosis-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `diagnosis-${step.id}`;
      radio.value = value;
      radio.checked = answers[step.id] === value;
      radio.addEventListener('change', () => {
        answers[step.id] = value;
        document.getElementById('diagNext').disabled = false;
        options.querySelectorAll('.diagnosis-option').forEach((el) => el.classList.remove('is-selected'));
        wrap.classList.add('is-selected');
      });
      const text = document.createElement('span');
      text.textContent = label;
      wrap.append(radio, text);
      if (radio.checked) wrap.classList.add('is-selected');
      options.append(wrap);
    });
    fieldset.append(options);
    area.append(fieldset);

    const percent = Math.round(((stepIndex + 1) / diagnosticSteps.length) * 100);
    document.getElementById('diagStepStatus').textContent = `السؤال ${stepIndex + 1} من ${diagnosticSteps.length}`;
    document.getElementById('diagStepPercent').textContent = `${percent}٪`;
    document.getElementById('diagProgressBar').style.width = `${percent}%`;
    document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(percent));
    document.getElementById('diagBack').disabled = stepIndex === 0;
    document.getElementById('diagNext').disabled = !answers[step.id];
    document.getElementById('diagNext').innerHTML = stepIndex === diagnosticSteps.length - 1 ? 'اعرض الاحتمالات <i class="fa-solid fa-magnifying-glass mr-1"></i>' : 'التالي <i class="fa-solid fa-arrow-left mr-1"></i>';
  }

  function diagnose() {
    const { age, symptom, pattern, trigger, crop } = answers;
    const possibilities = [];
    const checks = [];
    const add = (title, detail) => {
      if (!possibilities.some((item) => item.title === title)) possibilities.push({ title, detail });
    };

    if (trigger === 'spray') {
      add('ضرر رش أو تفاعل معاملة حديثة', 'توقيت ظهور العرض بعد الرش يجعل مراجعة المادة والجرعة والخلط والطقس ومعايرة المرشة أولوية؛ لا تعاود الرش ولا تضف سماداً علاجياً قبل تقييم مختص.');
      checks.push('احتفظ بملصقات المواد وسجل وقت الرش والخلطة والطقس، وصوّر نمط الرش على الأوراق.');
    }
    if (symptom === 'spots' || pattern === 'spread') {
      add('مرض ورقي أو إصابة حيوية محتملة', 'البقع المحددة أو الانتشار بين نباتات متجاورة قد يشير إلى مسبب مرضي/حيوي، ولا يشبه وحده نمط نقص عنصر متجانس. يلزم فحص مباشر أو تشخيص مخبري.');
      checks.push('اعزل عينة حديثة من نبات مصاب وأخرى سليمة، ولا ترش مبيداً عشوائياً قبل تحديد المسبب.');
    }
    if (symptom === 'uniform-yellow' && age === 'old') {
      add('نقص نيتروجين محتمل أو مشكلة بالجذور/الماء', 'شحوب الأوراق القديمة قد يتوافق مع نقص N، لكنه قد ينتج أيضاً عن اختناق أو تلف الجذور أو الملوحة أو عدم انتظام الري.');
    }
    if (symptom === 'interveinal' && age === 'old') {
      add('نقص مغنيسيوم محتمل', 'اصفرار بين العروق في أوراق قديمة قد يتوافق مع نقص Mg؛ افحص أيضاً ملوحة التربة وتوازن البوتاسيوم والكالسيوم والجذور.');
    }
    if (symptom === 'interveinal' && (age === 'young' || age === 'fruit')) {
      add('عدم تيسر الحديد أو المنغنيز محتمل', 'اصفرار النمو الحديث بين العروق قد يرتبط بـFe أو Mn أو ارتفاع pH أو ضعف الجذور/الصرف؛ لا يخبرنا اللون وحده أي عنصر أو مصدر يلزم.');
    }
    if (symptom === 'edge-burn') {
      add('اختلال البوتاسيوم أو إجهاد مائي/ملحي', 'احتراق الحواف ليس دليلاً كافياً على نقص K؛ افحص ملوحة الماء والتربة وانتظام الري والجذور قبل التفكير في السماد.');
    }
    if (symptom === 'deformed' || age === 'fruit') {
      add('خلل في نمو القمم أو الكالسيوم/البورون محتمل', 'تشوه القمم أو الثمار قد يتصل بعناصر محدودة الحركة، لكنه قد ينتج من ضرر ميكانيكي أو آفة أو تفاوت الماء. البورون له هامش ضيق بين الكفاية والسمية؛ لا تضفه تخميناً.');
    }
    if (symptom === 'purple') {
      add('إجهاد برد/جذور أو انخفاض تيسر الفوسفور محتمل', 'قد يظهر اللون الداكن أو البنفسجي مع البرودة أو ضعف الجذور، ولا يثبت نقص الفوسفور. افحص حرارة التربة والرطوبة والتحليل.');
    }
    if (symptom === 'wilt' || trigger === 'water-stress') {
      add('اضطراب ماء أو جذور أو صرف', 'الذبول والتقزم قد يسبقان أعراض نقص العناصر؛ راجع وصول الماء وتصريفه وحالة الجذور والملوحة أولاً.');
    }
    if (pattern === 'patches' || pattern === 'row') {
      checks.push('ارسم موضع النباتات المتضررة على الحقل وقارنه بملوحة/قوام التربة وخطوط الري ومناطق تجمع الماء ومسارات الرش.');
    }
    if (trigger === 'salinity') {
      add('ملوحة ماء أو تربة محتملة', 'الملوحة قد تسبب احتراق الحواف وتعرقل امتصاص عدة عناصر؛ يلزم قياس EC للماء والتربة وتقييم الصرف قبل الغسيل أو إضافة المحسنات.');
    }
    if (trigger === 'fert-change') {
      add('ضرر سمادي أو عدم توافق محتمل', 'راجع نوع السماد وتركيزه وطريقة وضعه وموضعه قرب الجذور، ثم افحص الماء والملوحة؛ لا تكرر المعاملة قبل تأكيد الملصق والسبب.');
    }
    if (pattern === 'unknown') checks.push('أعد الفحص على عدة نباتات، وسجّل عمر الورقة ونسبة النباتات المصابة وهل العرض يتقدم مع الوقت.');
    if (!possibilities.length) {
      add('لا يمكن ترجيح عنصر من النمط الحالي', 'قد يتطلب الأمر صوراً أوضح من النبات والحقل ومراجعة الري والتربة والتحليل؛ لا يمكن تأكيد نقص عنصر من صورة منفردة.');
    }
    checks.push('صوّر النبات كاملاً ثم الورقة المصابة من الوجهين، مع ورقة سليمة للمقارنة، وسجّل تاريخ بدء الأعراض والرش والتسميد والري.');
    checks.push(crop === 'pistachio' ? 'في البستان، خذ عينات أوراق/تربة وفق بروتوكول المختبر الخاص بالمحصول والعمر والحمل.' : 'عند استمرار المشكلة، أرسل عينة نباتية وتربة/ماء إلى مختبر زراعي معتمد أو استشر مهندساً محلياً.');

    document.getElementById('diagResultTitle').textContent = 'أسباب محتملة — افحصها بالترتيب';
    const body = document.getElementById('diagResultBody');
    body.innerHTML = '';
    const intro = document.createElement('p');
    intro.className = 'mb-3';
    intro.textContent = 'هذه احتمالات أولية مبنية على اختياراتك، وليست تشخيصاً قطعياً. إذا كان الضرر سريعاً أو واسعاً، اطلب معاينة مهندس قبل أي معاملة.';
    body.append(intro);
    const list = document.createElement('ol');
    list.className = 'list-decimal pr-6 space-y-2';
    possibilities.forEach((item) => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = item.title;
      const p = document.createElement('p');
      p.className = 'text-slate-600';
      p.textContent = item.detail;
      li.append(strong, p);
      list.append(li);
    });
    body.append(list);
    const heading = document.createElement('p');
    heading.className = 'font-black mt-4';
    heading.textContent = 'خطوات تحقق آمنة';
    body.append(heading);
    const nextList = document.createElement('ul');
    nextList.className = 'list-disc pr-6 space-y-1 mt-1';
    [...checks, 'لا تضف عنصراً دقيقاً أو مبيداً استجابةً للتخمين؛ اتبع نتيجة تحليل أو توصية محلية ملائمة للمحصول.'].forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      nextList.append(li);
    });
    body.append(nextList);
    document.getElementById('diagCropLink').textContent = crop && cropSettings[crop] ? `انتقل إلى إرشادات ${cropSettings[crop].title}` : 'انتقل إلى إرشادات المحاصيل';
    document.getElementById('diagnosisResult').classList.remove('hidden');
    document.querySelector('.diagnosis-track').classList.add('hidden');
    document.getElementById('diagnosisResult').focus();
  }

  function resetDiagnosis() {
    Object.keys(answers).forEach((key) => delete answers[key]);
    stepIndex = 0;
    document.getElementById('diagnosisResult').classList.add('hidden');
    document.querySelector('.diagnosis-track').classList.remove('hidden');
    renderDiagnosticStep();
  }

  function initLocalTools() {
    const recCrop = document.getElementById('recCrop');
    if (recCrop) {
      ['recCrop', 'recSystem', 'recStage', 'recGovernorate', 'recAnalysis'].forEach((id) => document.getElementById(id)?.addEventListener('change', updateRecommendation));
      updateRecommendation();
    }
    if (document.getElementById('diagQuestion')) {
      renderDiagnosticStep();
      document.getElementById('diagBack').addEventListener('click', () => {
        if (stepIndex > 0) stepIndex--;
        renderDiagnosticStep();
      });
      document.getElementById('diagNext').addEventListener('click', () => {
        if (!answers[diagnosticSteps[stepIndex].id]) return;
        if (stepIndex < diagnosticSteps.length - 1) {
          stepIndex++;
          renderDiagnosticStep();
        } else diagnose();
      });
      document.getElementById('diagRestart').addEventListener('click', resetDiagnosis);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLocalTools, { once: true });
  else initLocalTools();
})();
