import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpotlight, flipPlacementForRtl, SPOTLIGHT_STYLE_ID, SPOTLIGHT_POPOVER_CLASS} from '../concepts/app/components/spotlight/spotlight.js';
import {shellTourSteps, tourStepsFor, TOUR_SURFACES, SHELL_TOUR_ID} from '../concepts/app/components/spotlight/tour.js';

/* Minimal fake DOM: just enough for target resolution (querySelectorAll,
   rects) and style injection. Positioning/rendering belong to driver.js
   and are covered by browser smoke tests, not here. */

function fakeEl(tag = 'div', rect = {left: 100, top: 200, width: 120, height: 36}) {
  const el = {
    tag,
    children: [],
    style: {},
    dataset: {},
    attributes: {},
    hidden: false,
    className: '',
    textContent: '',
    id: '',
    focused: false,
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k] ?? null; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(child) { this.children.push(child); return child; },
    contains(node) {
      return node === this || this.children.some(c => c === node || c.contains?.(node));
    },
    focus() { this.focused = true; },
    getBoundingClientRect() {
      return {left: rect.left, top: rect.top, right: rect.left + rect.width,
        bottom: rect.top + rect.height, width: rect.width, height: rect.height};
    },
  };
  return el;
}

const HIDDEN_RECT = {left: 0, top: 0, width: 0, height: 0};

function fakeDocument({targets = {}, dir = 'ltr'} = {}) {
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
    contains(node) { return body.contains(node); },
  };
}

/* Fake driver.js factory: records configs, runs onDestroyed on destroy. */
function fakeDriverFactory(drivers) {
  return config => {
    const instance = {
      config,
      driven: false,
      destroyed: false,
      movedNext: 0,
      movedPrev: 0,
      drive() { this.driven = true; },
      destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.config.onDestroyed?.();
      },
      moveNext() { this.movedNext += 1; },
      movePrevious() { this.movedPrev += 1; },
    };
    drivers.push(instance);
    return instance;
  };
}

const STEPS = () => [
  {id: 'a', target: '.pager', headline: 'Move between records', body: 'Jump anywhere.', placement: 'top', primary: 'Next'},
  {id: 'b', target: 'button.stpill', headline: 'Track document status', body: 'Always named.', placement: 'bottom', primary: 'Next'},
  {id: 'c', targets: ['.save', '.modify'], headline: 'Modify, then save', body: 'Edit first.', placement: 'bottom', primary: 'Done'},
];

function visibleTargets() {
  return {
    '.pager': [fakeEl('div')],
    'button.stpill': [fakeEl('button')],
    '.save': [fakeEl('button', HIDDEN_RECT)],
    '.modify': [fakeEl('button')],
  };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

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
  const a = tourStepsFor('record');
  const b = tourStepsFor('record');
  assert.notEqual(a, b);
  assert.notEqual(a[2].targets, b[2].targets);
});

test('driver styles (base + Atlassian) inject exactly once', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const drivers = [];
  createSpotlight({document: doc, t: k => k, createDriver: fakeDriverFactory(drivers)});
  createSpotlight({document: doc, t: k => k, createDriver: fakeDriverFactory(drivers)});
  const styles = doc.body.children.filter(c => c.id === SPOTLIGHT_STYLE_ID);
  assert.equal(styles.length, 1);
  assert.match(styles[0].textContent, /\.driver-popover/);
  assert.match(styles[0].textContent, /skey-spotlight/);
  assert.ok(!styles[0].textContent.includes('spotlight-pulse'), 'no pulse ring on targets');
  // A stray backtick would terminate the template literal and break boot.
  assert.ok(!styles[0].textContent.includes('`'), 'injected CSS holds no backticks');
});

test('start maps steps to driver config with resolved elements', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const drivers = [];
  const dict = {'Move between records': 'التنقل بين السجلات', of: 'من', Next: 'التالي', Back: 'رجوع', Done: 'تم', Dismiss: 'إغلاق'};
  const tour = createSpotlight({document: doc, t: k => dict[k] || k, createDriver: fakeDriverFactory(drivers)});
  assert.equal(tour.start(STEPS()), true);
  assert.equal(tour.isActive(), true);
  assert.equal(drivers.length, 1);
  const [instance] = drivers;
  assert.equal(instance.driven, true);
  const {config} = instance;
  assert.equal(config.popoverClass, SPOTLIGHT_POPOVER_CLASS);
  assert.equal(config.nextBtnText, 'التالي');
  assert.equal(config.prevBtnText, 'رجوع');
  assert.equal(config.doneBtnText, 'تم');
  assert.equal(config.closeBtnLabel, 'إغلاق');
  assert.equal(config.progressText, '{{current}} من {{total}}');
  assert.equal(config.showProgress, true);
  assert.equal(config.steps.length, 3);
  // side/align split from placement; elements are first-visible matches.
  assert.deepEqual(config.steps.map(s => [s.popover.side, s.popover.align]), [['top', 'center'], ['bottom', 'center'], ['bottom', 'center']]);
  assert.deepEqual(config.steps.map(s => s.popover.title), ['التنقل بين السجلات', 'Track document status', 'Modify, then save']);
  const modify = doc.querySelectorAll('.modify')[0];
  assert.equal(config.steps[2].element, modify);
});

test('hidden targets filter out; no visible target starts nothing', () => {
  const doc = fakeDocument({targets: {'.pager': [fakeEl('div', HIDDEN_RECT)]}});
  const drivers = [];
  const tour = createSpotlight({document: doc, t: k => k, createDriver: fakeDriverFactory(drivers)});
  assert.equal(tour.start(STEPS()), false);
  assert.equal(tour.isActive(), false);
  assert.equal(drivers.length, 0);
});

test('kill switch OFF blocks start; turning OFF mid-tour destroys', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const drivers = [];
  const tour = createSpotlight({document: doc, t: k => k, createDriver: fakeDriverFactory(drivers)});
  tour.setEnabled(false);
  assert.equal(tour.isEnabled(), false);
  assert.equal(tour.start(STEPS()), false);
  assert.equal(drivers.length, 0);

  tour.setEnabled(true);
  assert.equal(tour.start(STEPS()), true);
  assert.equal(tour.isActive(), true);
  tour.setEnabled(false);
  assert.equal(drivers[0].destroyed, true);
  assert.equal(tour.isActive(), false);
  // Re-enabling starts nothing on its own.
  tour.setEnabled(true);
  assert.equal(tour.isActive(), false);
  assert.equal(drivers.length, 1);
});

test('trigger runs a single step without progress', () => {
  const doc = fakeDocument({targets: visibleTargets()});
  const drivers = [];
  const tour = createSpotlight({document: doc, t: k => k, createDriver: fakeDriverFactory(drivers)});
  assert.equal(tour.trigger(STEPS()[0]), true);
  assert.equal(drivers[0].config.steps.length, 1);
  assert.equal(drivers[0].config.showProgress, false);
  assert.equal(tour.trigger(STEPS()[0]), false, 'no second tour while active');
});

test('dismiss clears state even when the driver skips onDestroyed', async () => {
  // Regression: driver.js skips onDestroyed when destroyed mid-transition
  // (its step state lands only after the enter animation), so dismiss()
  // must not depend on the hook firing.
  const silentFactory = configs => {
    const instances = [];
    const factory = config => {
      configs.push(config);
      const instance = {
        config,
        drive() {},
        destroy() {},
        moveNext() {},
        movePrevious() {},
      };
      instances.push(instance);
      return instance;
    };
    factory.instances = instances;
    return factory;
  };
  const configs = [];
  const factory = silentFactory(configs);
  const invoker = fakeEl('button');
  const doc = fakeDocument({targets: visibleTargets()});
  doc.body.appendChild(invoker);
  const tour = createSpotlight({document: doc, t: k => k, createDriver: factory});
  assert.equal(tour.start(STEPS(), invoker), true);
  tour.dismiss();
  assert.equal(tour.isActive(), false);
  await tick();
  assert.equal(invoker.focused, true);
  // A fresh tour starts cleanly afterwards.
  assert.equal(tour.start(STEPS(), invoker), true);
  assert.equal(factory.instances.length, 2);
});

test('next/back delegate to the driver; dismiss destroys and returns focus', async () => {
  const invoker = fakeEl('button');
  const doc = fakeDocument({targets: visibleTargets()});
  doc.body.appendChild(invoker);
  const drivers = [];
  const tour = createSpotlight({document: doc, t: k => k, createDriver: fakeDriverFactory(drivers)});
  tour.next();
  tour.back();
  tour.dismiss();
  tour.start(STEPS(), invoker);
  tour.next();
  tour.back();
  assert.equal(drivers[0].movedNext, 1);
  assert.equal(drivers[0].movedPrev, 1);
  tour.dismiss();
  assert.equal(drivers[0].destroyed, true);
  assert.equal(tour.isActive(), false);
  await tick();
  assert.equal(invoker.focused, true);
});

test('RTL flips physical sides before handing to driver.js', () => {
  const doc = fakeDocument({targets: {'.x': [fakeEl('div')]}});
  const drivers = [];
  const tour = createSpotlight({document: doc, t: k => k, getDirection: () => 'rtl', createDriver: fakeDriverFactory(drivers)});
  tour.start([{id: 'x', target: '.x', headline: 'H', body: 'B', placement: 'left-start'}]);
  assert.deepEqual(
    [drivers[0].config.steps[0].popover.side, drivers[0].config.steps[0].popover.align],
    ['right', 'start']
  );
});
