# Tailwind migration design

## Goal

Migrate the app shell from authored component CSS to Tailwind CSS v4 utilities while
preserving the current HTML structure, JavaScript behavior, assets, public URL, and
visual parity as closely as practical. The existing screenshot baselines remain the
acceptance target; a difference must be inspected rather than hidden by looser image
tolerances.

## Scope

- Add the Tailwind v4 CLI to the existing Node build. Do not add Vite, a framework, or
  runtime Tailwind delivery.
- Compile one Tailwind source entry into a static CSS asset in `dist/`.
- Translate common layout, spacing, typography, color, border, shadow, responsive, and
  state styling into utility classes in the current fragments and templates.
- Preserve small, owner-local compatibility rules under `@layer components` for
  selector-driven behavior: dialogs, popovers, generated content, chart styling,
  complex state selectors, and accessibility/media-query rules that do not map cleanly
  to utilities.
- Retire existing CSS only after its owner is fully represented by utilities or its
  compatibility layer.

## Non-goals

- Redesigning the interface.
- Replacing native modules, changing navigation, changing fixtures, or changing the
  existing customer restoration behavior.
- Rewriting templates solely to reduce class count.
- Shipping a broad Tailwind utility catalog or adding unrelated dependencies.

## Build architecture

`scripts/build.mjs` continues to assemble HTML and copy public assets. It additionally
runs the Tailwind CLI against `concepts/app/styles/tailwind.css` and writes the compiled
stylesheet into `dist/concepts/app/styles/`. The authored entry links the compiled
stylesheet after any required third-party styles and before prototype-control overrides.

The Tailwind input registers existing CSS variables as theme values, imports Tailwind,
and declares local compatibility layers. The scanner includes authored HTML fragments
and JavaScript template strings. Dynamic class names use a small documented safelist;
the migration must not safelist broad patterns that inflate the delivered CSS.

Tailwind preflight is disabled or constrained unless it exactly preserves the existing
base styles. Existing custom base rules remain authoritative during the transition.

## Migration order

1. Add the CLI and prove it compiles a no-op-compatible stylesheet.
2. Move token and base declarations into the Tailwind theme and base layer.
3. Convert shell markup and compatibility rules.
4. Convert shared components: dialogs, toast, loading, notifications, pager, assistant,
   and data lists.
5. Convert page markup and owner-local rules: home, invoices, customers, geography, and
   email.
6. Remove retired stylesheets and stylesheet links once each owner passes parity.

Each stage retains its prior output until its direct browser scenarios and screenshots
pass. A visual difference is investigated at the relevant owner boundary; no screenshot
baseline is updated simply to accept a migration regression.

## Validation

- Build output has no unresolved includes and serves the compiled CSS with the expected
  MIME type.
- Unit tests verify build integration, scanner inputs, safelisted dynamic utilities, and
  removal of retired stylesheet links.
- Browser tests continue to cover desktop, mobile touch, dark, high contrast, RTL, and
  reduced motion; existing lifecycle and interaction tests stay enabled.
- The complete screenshot matrix compares with the current baselines using zero pixel
  tolerance where Tailwind produces identical rendering. Any unavoidable difference is
  documented with its cause and reviewed explicitly.
- The generated CSS is measured and its size documented to keep the migration efficient.

## Risks and mitigations

Tailwind cannot discover dynamic class names created in JavaScript. The build will use
a minimal, explicit safelist and test those classes in rendered dynamic views.

Utility conversion can alter specificity and cascade order. Owner-local compatibility
rules stay in declared layers and are converted incrementally so the current behavior is
always available as a reference.

Preflight can change default browser styling. It remains disabled until each affected
base rule has an equivalent tested replacement.
