'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { window } = parseHTML(fs.readFileSync('public/index.html', 'utf8'));
const { document } = window;
const context = { window, document, console, Event: window.Event };
vm.createContext(context);
vm.runInContext(fs.readFileSync('public/assets/js/site-enhancements.js', 'utf8'), context, { filename: 'site-enhancements.js' });
vm.runInContext(fs.readFileSync('public/assets/js/farmer-tools.js', 'utf8'), context, { filename: 'farmer-tools.js' });
document.dispatchEvent(new window.Event('DOMContentLoaded'));
assert.match(document.title, /المنصة الاستشارية للزراعة الذكية/, 'page title should use the official smart agriculture platform name');
assert.ok(document.querySelector('link[href*="Noto+Sans+Arabic"]'), 'page should use the reference Arabic font');
assert.ok(document.querySelector('a[href="mailto:info.samad@mail.com"]'), 'reference email should be published');
assert.ok(document.querySelector('a[href="tel:+15049000069"]'), 'provided phone should be clickable');
assert.match(document.querySelector('.manure-brand-card').textContent, /لا توجد نسب تحليل منشورة/, 'missing lab values must not be invented');
assert.match(document.getElementById('organicManureTitle').textContent, /الاستخدام غير الآمن/);
assert.ok(document.querySelector('#platformBarcode img[src="./assets/images/clean-agri-qr.webp"]'), 'provided QR should be shown');
const monthly = document.getElementById('monthlyGuidance');
const organic = document.getElementById('organicManure');
const organicLink = document.querySelector('[data-focus-section="organicManure"]');
assert.equal(monthly.hidden, false, 'compact default should show monthly summary');
assert.equal(organic.hidden, true, 'compact default should hide other long sections');
for (const [id, link] of [
  ['strategicCropRecommendations', 'header a[href="#strategicCropRecommendations"]'],
  ['diagnosisWizard', 'header a[href="#diagnosisWizard"]'],
  ['calculatorSection', 'header a[href="#calculatorSection"]'],
  ['platformBarcode', 'a.header-barcode']
]) {
  const anchor = document.querySelector(link);
  const click = new window.Event('click', { bubbles: true, cancelable: true });
  anchor.dispatchEvent(click);
  assert.equal(click.defaultPrevented, true, `${id} link should be handled by section navigation`);
  assert.equal(document.getElementById(id).hidden, false, `${id} should be revealed when linked from outside main`);
}
const organicRateLink = document.querySelector('a[href="#ftManureRateCard"]');
const organicRateClick = new window.Event('click', { bubbles: true, cancelable: true });
organicRateLink.dispatchEvent(organicRateClick);
assert.equal(organicRateClick.defaultPrevented, true);
assert.equal(document.getElementById('farmerTools').hidden, false);
assert.equal(document.getElementById('ftManureRateCard').open, true, 'deep link should open the manure calculator accordion');
const manureRateForm = document.querySelector('form[data-ft-calculator="manure-rate"]');
const manureRateFields = Array.from(manureRateForm.querySelectorAll('input,select,textarea'));
manureRateFields.namedItem = name => manureRateFields.find(field => field.name === name) || null;
Object.defineProperty(manureRateForm, 'elements', { configurable: true, value: manureRateFields });
const setManureRate = (name, value) => {
  Object.defineProperty(manureRateForm.querySelector(`[name="${name}"]`), 'value', { configurable: true, writable: true, value: String(value) });
};
setManureRate('rate', '10'); setManureRate('rateUnit', 'dunum'); setManureRate('nutrient', 'P2O5');
setManureRate('area', '5000'); setManureRate('areaUnit', 'm2'); setManureRate('analysisBasis', 'dry');
manureRateForm.querySelector('[name="analysisBasis"]').dispatchEvent(new window.Event('change', { bubbles: true }));
setManureRate('moisturePercent', '60'); setManureRate('nPercent', '2');
setManureRate('p2o5Percent', '1'); setManureRate('k2oPercent', '1');
manureRateForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
assert.equal(manureRateForm.querySelector('[data-ft-result]').getAttribute('data-ft-state'), 'success', manureRateForm.querySelector('[data-ft-result]').textContent);
assert.match(manureRateForm.querySelector('[data-ft-result]').textContent, /١٢٬٥٠٠|12,500/, 'dry-basis result should account for moisture');
organicLink.click();
assert.equal(monthly.hidden, true, 'choosing a topic should hide the previous section');
assert.equal(organic.hidden, false, 'choosing organic should show the organic section');
assert.equal(organicLink.getAttribute('aria-current'), 'page');
document.getElementById('showAllSections').click();
assert.equal(monthly.hidden, false, 'show all should restore all sections');
assert.equal(organic.hidden, false, 'show all should restore organic section');
const tomato = document.querySelector('[data-schedule-card="tomato"]');
const cucumber = document.querySelector('[data-schedule-card="cucumber"]');
const cucumberTab = document.querySelector('[data-schedule-target="cucumber"]');
assert.equal(tomato.hidden, false);
assert.equal(cucumber.hidden, true);
cucumberTab.click();
assert.equal(tomato.hidden, true);
assert.equal(cucumber.hidden, false);
assert.equal(cucumberTab.getAttribute('aria-selected'), 'true');
assert.equal(document.querySelector('[data-schedule-target="tomato"]').getAttribute('aria-selected'), 'false');
console.log('PASS: focus navigation, full-page toggle, greenhouse schedule tabs and ARIA state work without network.');
