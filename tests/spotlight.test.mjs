import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpotlight, flipPlacementForRtl, SPOTLIGHT_STYLE_ID} from '../concepts/app/components/spotlight/spotlight.js';
import {shellTourSteps, tourStepsFor, TOUR_SURFACES, SHELL_TOUR_ID} from '../concepts/app/components/spotlight/tour.js';

/* Minimal fake DOM: just enough for the engine's DOM surface
   (createElement, querySelectorAll, body, listeners, rects). */

function fakeEl(tag = 'div', rect = {left: 100, top: 200, width: 120, height: 36}) {
  const listeners = {};
  const el = {
    tag,
    children: [],
    style: {},
    dataset: {},
    attributes: {},
    hidden: false,
    className: '',
    textContent: '',
    type: '',
    disabled: false,
    id: '',
    focused: false,
    removed: false,
    offsetWidth: 0,
    offsetHeight: 0,
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] ?? null; },
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    removeEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    contains(node) {
      return node === this || this.children.some(c => c === node || c.contains?.(node));
    },
    remove() { this.removed = true; },
    focus() { this.focused = true; },
    getBoundingClientRect() {
      return {left: rect.left, top: rect.top, right: rect.left + rect.width,
        bottom: rect.top + rect.height, width: rect.width, height: rect.height};
    },
    dispatch(type, event = {}) { (listeners[type] || []).forEach(fn => fn(event)); },
  };
  return el;
}

const HIDDEN_RECT = {left: 0, top: 0, width: 0, height: 0};

function fakeDocument({targets = {}, dir = 'ltr'} = {}) {
  const listeners = {};
  const body = fakeEl('body');
  const findById = (node, id) => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const hit = findById(child, id);
      if (hit) return hit;
    }
    return null;
  };
  return {
    documentElement: {dir, clientWidth: 1280, clientHeight: 800},
    body,
    head: null,
    activeElement: null,
    createElement: tag => fakeEl(tag),
    querySelectorAll: sel => targets[sel] || [],
    getElementById: id => findById(body, id),
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    removeEventListener() {},
    contains(node) { return body.contains(node); },
    dispatch(type, event = {}) { (listeners[type] || []).forEach(fn => fn(event)); },
  };
}

const STEPS = () => [
  {id: 'a', target: '.pager', headline: 'Move between records', body: 'Jump anywhere.', placement: 'bottom', primary: 'Next'},
  {id: 'b', target: 'button.stpill', headline: 'Track document status', body: 'Always named.', placement: 'bottom', primary: 'Next'},
  {id: 'c', target: '.phead [data-act="Save"]', headline: 'Save only when dirty', body: 'Unlocks on change.', placement: 'bottom', primary: 'Done'},
];

function visibleTargets() {
  return {
    '.pager': [fakeEl('div')],
    'button.stpill': [fakeEl('button')],
    '.phead [data-act="Save"]': [fakeEl('button')],
  };
}

const cardOf = doc => doc.body.children.find(c => c.id === 'spotlight-card');
const primaryOf = card => card.children[2].children[1].children[1];
const secondaryOf = card => card.children[2].children[1].children[0];
const countOf = card => card.children[2].children[0];

test('flipPlacementForRtl mirrors left/right and keeps top/bottom', () => {
  assert.equal(flipPlacementForRtl('left-start'), 'right-start');
  assert.equal(flipPlacementForRtl('right-end'), 'left-end');
  assert.equal(flipPlacementForRtl('top-center'), 'top-center');
  assert.equal(flipPlacementForRtl('bottom'), 'bottom');
  assert.equal(flipPlacementForRtl(undefined), 'bottom');
});

test('tour definition is a 3-step, single-screen onboarding tour', () => {
  assert.equal(SHELL_TOUR_ID, 'invoice-shell-onboarding');
  const steps = shellTourSteps();
  assert.equal(steps.length, 3);
  assert.deepEqual(steps.map(s => s.id), ['pager', 'status', 'save']);
  assert.ok(steps.every(s => (s.target || s.targets) && s.headline && s.body && s.placement));
  // Engine must never mutate the shared definition.
  assert.notEqual(shellTourSteps(), shellTourSteps());
});

test('every registered surface tour obeys the 1–3 step rule', () => {
  assert.deepEqual([...TOUR_SURFACES].sort(), ['launchpad', 'list', 'organization', 'profile', 'record']);
  for (const surface of TOUR_SURFACES) {
    const steps = tourStepsFor(surface);
    assert.ok(steps.length >= 1 && steps.length <= 3, `${surface} has ${steps.length} steps`);
    for (const step of steps) {
      assert.ok(step.id && (step.target || step.targets), `${surface}/${step.id} names a target`);
      assert.ok(step.headline && step.headline.length <= 27, `${surface}/${step.id} headline budget`);
      assert.ok(step.body && step.body.length <= 75, `${surface}/${step.id} body budget`);
    }
  }
  assert.equal(tourStepsFor('nope'), null);
  assert.equal(tourStepsFor(undefined), null);
  // Registry copies are independent.
  const a = tourStepsFor('record');
  const b = tourStepsFor('record');
  assert.notEqual(a, b);
  assert.notEqual(a[2].targets, b[2].targets);
});

test('the pulsing ring style is injected exactly once per document', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  createSpotlight({document: doc, t: k => k});
  createSpotlight({document: doc, t: k => k});
  const styles = doc.body.children.filter(c => c.id === SPOTLIGHT_STYLE_ID);
  assert.equal(styles.length, 1);
  assert.match(styles[0].textContent, /spotlight-pulse/);
  assert.match(styles[0].textContent, /prefers-reduced-motion/);
});

test('start shows step 1 with count and no Back', () => {
  const pager = fakeEl('div');
  const doc = fakeDocument({targets: {...visibleTargets(), '.pager': [pager]}});
  const tour = createSpotlight({document: doc, t: k => k});
  assert.equal(tour.start(STEPS()), true);
  assert.equal(tour.isActive(), true);
  const card = cardOf(doc);
  assert.ok(card);
  assert.equal(card.getAttribute('role'), 'dialog');
  assert.equal(card.getAttribute('aria-label'), 'Move between records');
  assert.equal(countOf(card).textContent, '1 of 3');
  assert.equal(secondaryOf(card).hidden, true);
  assert.equal(primaryOf(card).textContent, 'Next');
  // Target ring marks the live target (attribute, never dataset keys —
  // dataset['data-…'] throws in real browsers).
  assert.equal(pager.getAttribute('data-spotlight-target'), '');
});

test('next/back walk the tour; next on the last step dismisses', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const tour = createSpotlight({document: doc, t: k => k});
  tour.start(STEPS());
  tour.next();
  let card = cardOf(doc);
  assert.equal(card.getAttribute('aria-label'), 'Track document status');
  assert.equal(countOf(card).textContent, '2 of 3');
  assert.equal(secondaryOf(card).hidden, false);
  tour.next();
  card = cardOf(doc);
  assert.equal(countOf(card).textContent, '3 of 3');
  assert.equal(primaryOf(card).textContent, 'Done');
  tour.back();
  assert.equal(cardOf(doc).getAttribute('aria-label'), 'Track document status');
  tour.next();
  tour.next();
  assert.equal(tour.isActive(), false);
  assert.ok(cardOf(doc).removed);
});

test('primary/secondary buttons are wired', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const tour = createSpotlight({document: doc, t: k => k});
  tour.start(STEPS());
  primaryOf(cardOf(doc)).dispatch('click');
  assert.equal(cardOf(doc).getAttribute('aria-label'), 'Track document status');
  secondaryOf(cardOf(doc)).dispatch('click');
  assert.equal(cardOf(doc).getAttribute('aria-label'), 'Move between records');
});

test('kill switch OFF blocks start; turning OFF mid-tour dismisses', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const tour = createSpotlight({document: doc, t: k => k});
  tour.setEnabled(false);
  assert.equal(tour.isEnabled(), false);
  assert.equal(tour.start(STEPS()), false);
  assert.equal(cardOf(doc), undefined);
  assert.equal(tour.trigger(STEPS()[0]), false);

  tour.setEnabled(true);
  assert.equal(tour.start(STEPS()), true);
  assert.equal(tour.isActive(), true);
  tour.setEnabled(false);
  assert.equal(tour.isActive(), false);
  assert.ok(cardOf(doc).removed);
  // Re-enabling starts nothing on its own.
  tour.setEnabled(true);
  assert.equal(tour.isActive(), false);
});

test('triggered single step has no count and a Done action', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const tour = createSpotlight({document: doc, t: k => k});
  assert.equal(tour.trigger(STEPS()[0]), true);
  const card = cardOf(doc);
  assert.equal(countOf(card).textContent, '');
  assert.equal(primaryOf(card).textContent, 'Done');
});

test('hidden targets are skipped; no visible target starts nothing', () => {
  const targets = visibleTargets();
  targets['button.stpill'] = [fakeEl('button', HIDDEN_RECT)];
  const doc = fakeDocument({targets});
  const tour = createSpotlight({document: doc, t: k => k});
  assert.equal(tour.start(STEPS()), true);
  assert.equal(cardOf(doc).getAttribute('aria-label'), 'Move between records');
  tour.next();
  assert.equal(cardOf(doc).getAttribute('aria-label'), 'Save only when dirty');

  const empty = fakeDocument({targets: {}});
  const tour2 = createSpotlight({document: empty, t: k => k});
  assert.equal(tour2.start(STEPS()), false);
  assert.equal(tour2.isActive(), false);
});

test('a step with several selectors lands on the first visible one', () => {
  const save = fakeEl('button', HIDDEN_RECT);
  const modify = fakeEl('button');
  const doc = fakeDocument({targets: {'.save': [save], '.modify': [modify]}});
  const tour = createSpotlight({document: doc, t: k => k});
  assert.equal(
    tour.start([{id: 's', targets: ['.save', '.modify'], headline: 'H', body: 'B', placement: 'bottom'}]),
    true
  );
  assert.equal(cardOf(doc).getAttribute('aria-label'), 'H');
  assert.equal(modify.style.outline !== '', true);
  assert.equal(save.style.outline || '', '');
});

test('Escape dismisses the active spotlight', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const tour = createSpotlight({document: doc, t: k => k});
  tour.start(STEPS());
  assert.equal(tour.isActive(), true);
  doc.dispatch('keydown', {key: 'Escape', preventDefault() {}});
  assert.equal(tour.isActive(), false);
});

test('copy resolves through t() (EN/AR via the shared locale)', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const dict = {'Move between records': 'التنقل بين السجلات', of: 'من', Next: 'التالي'};
  const tour = createSpotlight({document: doc, t: k => dict[k] || k});
  tour.start(STEPS());
  const card = cardOf(doc);
  assert.equal(card.getAttribute('aria-label'), 'التنقل بين السجلات');
  assert.equal(countOf(card).textContent, '1 من 3');
  assert.equal(primaryOf(card).textContent, 'التالي');
});
