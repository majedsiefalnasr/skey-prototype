window.__ModuleLoader__.load({
  id: 'dsh-genui-rtl',
  factory() {
    // GenUI ships CSS-module classes (hash_name). We match by the stable name part.
    const c = (...names) =>
      ':is(' + names.map((n) => `[class$="_${n}"],[class*="_${n} "]`).join(',') + ')';
    const R = '[data-genui-rtl]';

    const CSS = `
/* dsh-genui-rtl: mirrors @changfenhuang/dsh-genui components when a block is RTL.
   A block gets [data-genui-rtl] + dir="rtl" from the client script when its text is mostly RTL. */

/* 1. Physical text-align -> logical */
${R} :is(${[
      'thNum', 'tdNum', 'hbarLabel', 'hbarValue', 'cellBarText', 'sliderValue',
    ].map((n) => c(n)).join(',')}) { text-align: end; }
${R} :is(${[
      'thSort', 'detailToggle', 'accHead', 'quizOpt', 'quizOptCorrect', 'quizOptWrong',
      'quizOptReveal', 'ftNameBtn',
    ].map((n) => c(n)).join(',')}) { text-align: start; }
${R} ${c('thNum')} ${c('thSort')} { text-align: end; }
${R} table th, ${R} table td { text-align: start; }
${R} table th${c('thNum')}, ${R} table td${c('tdNum')} { text-align: end; }

/* 2. Lists: dot + padding */
${R} ${c('li')} { padding: 9px 16px 9px var(--dsl-g-gap-xs); }
${R} ${c('li')}::before { left: auto; right: 2px; }

/* 3. Steps connector */
${R} ${c('step')}:not(:last-child)::before { left: auto; right: 11px; }

/* 4. Stat cards: divider border */
${R} ${c('grid')} > ${c('stat')}, ${R} ${c('row')} > ${c('stat')} {
  border-left-color: var(--dsl-g-border-surface);
  border-right-color: var(--dsl-g-border);
}

/* 5. margin-left:auto -> push to the end side */
${R} :is(${['heroSpark', 'tlTime', 'panelChevron'].map((n) => c(n)).join(',')}) {
  margin-left: 0; margin-right: auto;
}
${R} :is(${['btnSent'].map((n) => c(n)).join(',')}) { margin-left: 0; margin-right: var(--dsl-g-gap-sm); }
${R} ${c('detailToggle')} { margin-right: 0; margin-left: 4px; }
${R} ${c('groupToggle')} { margin-right: 0; margin-left: 7px; }
${R} ${c('panelClose')} { margin-right: 0; margin-left: 8px; }
${R} ${c('panelTpl')} { margin-right: 0; margin-left: 4px; }
${R} ${c('detailCell')} { padding-left: 0; padding-right: var(--dsl-g-gap-sm); }
${R} ${c('detailBody')} { box-shadow: inset -2px 0 0 color-mix(in srgb, var(--dsl-g-accent) 45%, transparent); }

/* 6. Grouped table children guide rail */
${R} tbody tr${c('groupChild')} td:first-child { padding-left: var(--dsl-g-gap-md); padding-right: calc(var(--dsl-g-gap-md) + 22px); }
${R} tbody tr${c('groupChild')} td:first-child::before { left: auto; right: calc(var(--dsl-g-gap-md) + 8px); }

/* 7. Switch knob */
${R} ${c('switchKnob')} { left: auto; right: 3px; transition: right var(--dsl-g-dur-fast); }
${R} ${c('switchOn')} ${c('switchKnob')} { left: auto; right: 19px; }

/* 8. Chevrons point toward the reading direction */
${R} :is(${['accChevron', 'detailChevron', 'groupChevron', 'ftChevron'].map((n) => c(n)).join(',')}):not([data-open="true"]) {
  transform: scaleX(-1);
}

/* 9. Progress target marker + file tree (inline left -> mirrored via vars set by script) */
${R} ${c('targetMark')} { left: auto !important; right: var(--dsh-rtl-start, 0); margin-left: 0; margin-right: -1px; }
${R} ${c('ftRow')} { padding-left: 4px !important; padding-right: var(--dsh-rtl-start, 4px) !important; }
${R} ${c('ftGuide')} { left: auto !important; right: var(--dsh-rtl-start, 0); }

/* 10. Panel + fixed toasts */
[data-genui-achievement-toasts] { right: auto; left: 16px; }

/* 11. Content that must stay geometrically LTR: charts, diagrams, 3D, math, code. */
${R} :is([data-genui-chart], [data-genui-line], [data-genui-donut], [data-genui-echart],
  [data-genui-mermaid], [data-genui-scene3d], [data-genui-scene], [data-genui-plot],
  [data-genui-svg], [data-genui-svg-fence], [data-genui-diagram], svg, canvas) {
  direction: ltr;
}
${R} :is([data-genui-chart], [data-genui-line], [data-genui-donut], [data-genui-echart],
  [data-genui-plot], [data-genui-diagram]) :is(span, div, text, p) { unicode-bidi: plaintext; }
${R} :is(pre, code, kbd, samp, ${c('copyChip')}) { direction: ltr; unicode-bidi: isolate; text-align: left; }
${R} :is(input[type="text"], input[type="number"], input[type="email"], input[type="url"], textarea) {
  unicode-bidi: plaintext; text-align: start;
}
`;

    const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
    const LTR_REGEX = /[a-zA-Z\u00C0-\u024F]/g;
    function isRtlText(text) {
      if (!text) return false;
      const rtl = text.match(RTL_REGEX);
      if (!rtl) return false;
      const ltr = text.match(LTR_REGEX);
      return rtl.length / (rtl.length + (ltr ? ltr.length : 0)) >= 0.2;
    }

    const ROOT_SEL = '[data-genui], [data-genui-plot], [data-genui-panel], [data-genui-tool]';

    function textOf(root) {
      // Ignore code blocks so a Persian answer with long code is still RTL.
      let t = '';
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          const p = n.parentElement;
          return p && p.closest('pre, code, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        },
      });
      while (w.nextNode()) t += w.currentNode.nodeValue + ' ';
      return t;
    }

    function parseStart(el) {
      // Original inline physical offset (left / padding-left / left %) that we mirror to the end side.
      const s = el.style;
      const v = s.left || s.paddingLeft;
      return v || '';
    }

    function syncVars(root, on) {
      const sel = `${c('targetMark')}, ${c('ftRow')}, ${c('ftGuide')}`;
      root.querySelectorAll(sel).forEach((el) => {
        if (!on) { el.style.removeProperty('--dsh-rtl-start'); return; }
        // Cache the original value: after our CSS runs, React still keeps the inline original.
        const v = parseStart(el);
        if (v) el.style.setProperty('--dsh-rtl-start', v);
      });
    }

    function update(root) {
      if (!root.isConnected) return;
      const on = isRtlText(textOf(root));
      const has = root.hasAttribute('data-genui-rtl');
      if (on && !has) {
        root.setAttribute('data-genui-rtl', '');
        root.setAttribute('dir', 'rtl');
        root.setAttribute('data-genui-rtl-dir', '1');
      } else if (!on && has) {
        root.removeAttribute('data-genui-rtl');
        if (root.hasAttribute('data-genui-rtl-dir')) {
          root.removeAttribute('dir');
          root.removeAttribute('data-genui-rtl-dir');
        }
      }
      syncVars(root, on);
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement('style');
          style.setAttribute('data-genui-rtl-style', '');
          style.textContent = CSS;
          document.head.appendChild(style);

          const queue = new Set();
          let raf = null;
          const schedule = () => {
            if (raf !== null) return;
            raf = requestAnimationFrame(() => {
              raf = null;
              const items = Array.from(queue);
              queue.clear();
              items.forEach(update);
            });
          };
          const enqueueFrom = (node) => {
            const el = node.nodeType === 1 ? node : node.parentElement;
            if (!el) return;
            const up = el.closest(ROOT_SEL);
            if (up) queue.add(up);
            if (node.nodeType === 1) node.querySelectorAll(ROOT_SEL).forEach((r) => queue.add(r));
          };

          const observer = new MutationObserver((records) => {
            for (const r of records) {
              if (r.type === 'characterData') enqueueFrom(r.target);
              else if (r.type === 'childList') {
                r.addedNodes.forEach(enqueueFrom);
                if (r.target.nodeType === 1) enqueueFrom(r.target);
              }
            }
            if (queue.size) schedule();
          });
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
          document.querySelectorAll(ROOT_SEL).forEach((r) => queue.add(r));
          if (queue.size) schedule();

          return () => {
            observer.disconnect();
            if (raf !== null) cancelAnimationFrame(raf);
            queue.clear();
            document.querySelectorAll('[data-genui-rtl]').forEach((el) => {
              el.removeAttribute('data-genui-rtl');
              if (el.hasAttribute('data-genui-rtl-dir')) {
                el.removeAttribute('dir');
                el.removeAttribute('data-genui-rtl-dir');
              }
            });
            style.remove();
          };
        }, 'dsh-genui-rtl: styles and RTL detector');
      },
    };
  },
});
