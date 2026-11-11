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
    const main = document.getElementById('main-content');
    const hub = document.getElementById('sectionHub');
    const focusLinks = [...(hub?.querySelectorAll('[data-focus-section]') || [])];
    const showAllButton = document.getElementById('showAllSections');
    const hubStatus = document.getElementById('sectionHubStatus');
    const sectionTitle = id => focusLinks.find(link => link.dataset.focusSection === id)?.textContent.trim() || 'القسم المحدد';
    const topLevel = element => {
      let current = element;
      while (current && current.parentElement !== main) current = current.parentElement;
      return current?.parentElement === main ? current : null;
    };
    function setFocus(id) {
      const selected = topLevel(document.getElementById(id));
      if (!main || !selected) return false;
      [...main.children].forEach(child => {
        child.hidden = child !== selected && child !== hub;
      });
      focusLinks.forEach(link => {
        if (link.dataset.focusSection === id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      showAllButton?.setAttribute('aria-pressed', 'false');
      if (hubStatus) hubStatus.textContent = `يعرض الآن: ${sectionTitle(id)}. اختر موضوعاً آخر للتبديل.`;
      return true;
    }
    function showAll() {
      if (!main) return;
      [...main.children].forEach(child => { child.hidden = false; });
      focusLinks.forEach(link => link.removeAttribute('aria-current'));
      showAllButton?.setAttribute('aria-pressed', 'true');
      if (hubStatus) hubStatus.textContent = 'تُعرض جميع أقسام المنصة الطويلة في صفحة واحدة.';
    }
    function focusTarget(id, scroll = true) {
      const target = document.getElementById(id);
      if (!target || !setFocus(id)) return false;
      let disclosure = target.closest('details');
      while (disclosure) {
        disclosure.open = true;
        disclosure = disclosure.parentElement?.closest('details') || null;
      }
      try {
        if (window.history?.replaceState) window.history.replaceState(null, '', `#${encodeURIComponent(id)}`);
        else if (window.location) window.location.hash = `#${encodeURIComponent(id)}`;
      } catch (_) { /* Focusing still works if the host blocks history updates. */ }
      if (scroll) target.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      return true;
    }
    focusLinks.forEach(link => link.addEventListener('click', event => {
      if (focusTarget(link.dataset.focusSection)) event.preventDefault();
    }));
    showAllButton?.addEventListener('click', showAll);
    document.addEventListener('click', event => {
      const anchor = event.target?.closest?.('a[href^="#"]');
      if (!anchor || anchor.hasAttribute('data-focus-section')) return;
      const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
      if (id && focusTarget(id)) event.preventDefault();
    });
    const initialHash = window.location?.hash || '';
    const initialId = initialHash ? decodeURIComponent(initialHash.slice(1)) : 'monthlyGuidance';
    if (!focusTarget(initialId, Boolean(initialHash))) focusTarget('monthlyGuidance', false);

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
