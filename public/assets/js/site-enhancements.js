(() => {
  'use strict';
  const norm = value => value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[\u064B-\u065F]/g, '');
  function filterCrops() {
    const term = norm(document.getElementById('cropSearch')?.value.trim() || '');
    const category = document.getElementById('cropCategory')?.value || '';
    let count = 0;
    document.querySelectorAll('.crop-card').forEach(card => {
      const show = (!category || card.dataset.category === category) && (!term || norm(card.textContent).includes(term));
      card.hidden = !show;
      if (show) count++;
    });
    const status = document.getElementById('cropResultCount');
    if (status) status.textContent = `${count} محاصيل مطابقة`;
    const empty = document.getElementById('cropEmpty');
    if (empty) empty.hidden = count > 0;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const scheduleTabs = document.querySelectorAll('[data-schedule-target]');
    const scheduleCards = document.querySelectorAll('[data-schedule-card]');
    scheduleTabs.forEach(tab => tab.addEventListener('click', () => {
      const target = tab.dataset.scheduleTarget;
      scheduleTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
      });
      scheduleCards.forEach(card => { card.hidden = card.dataset.scheduleCard !== target; });
    }));
    ['cropSearch', 'cropCategory'].forEach(id => {
      const element = document.getElementById(id);
      element?.addEventListener('input', filterCrops);
      element?.addEventListener('change', filterCrops);
    });
    document.getElementById('cropReset')?.addEventListener('click', () => {
      document.getElementById('cropSearch').value = '';
      document.getElementById('cropCategory').value = '';
      filterCrops();
    });
    filterCrops();
    document.querySelectorAll('a[data-crop-choice]').forEach(link => {
      link.addEventListener('click', () => {
        window.clearSearch?.();
        const select = document.getElementById('recCrop');
        if (select) {
          select.value = link.dataset.cropChoice;
          select.dispatchEvent(new Event('change'));
        }
      });
    });
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (target?.style.display === 'none') window.clearSearch?.();
      });
    });
  });
})();
