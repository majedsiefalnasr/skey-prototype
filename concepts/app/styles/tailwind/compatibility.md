# Compatibility selector manifest

Tailwind utilities own ordinary layout and presentation. A compatibility rule may use
only one of the categories below. Each later rule must have a row in this table.

| Owner | Selector | Reason | Removal condition |
| --- | --- | --- | --- |
| Policy | `::before` / `::after` | Generated content and pseudo-elements need a selector relationship. | Replace the generated content with a literal utility-backed element. |
| Policy | `@keyframes` | Named animation definitions cannot live on an element as literal utilities. | Replace with a Tailwind animation token or remove the animation. |
| Policy | ApexCharts DOM | ApexCharts creates its own DOM after the application renders. | Replace the third-party chart implementation. |
| Policy | `[aria-*]` relationships | ARIA state relationships require selectors across elements. | Express the state on the owning element with literal utilities. |
| Policy | prototype density/style modes | Prototype controls apply global density and input-style modes. | Move the mode value into literal owner utilities. |

The rows below are the compatibility selectors retained past the policy rows above.

| Shell | `.search-typing-label.is-typing::after` | The animated caret is generated content. | Render a caret element beside the label. |
| Shell | `@keyframes lp-search-caret-blink` | The search caret uses a named animation. | Replace with a Tailwind animation token. |
| Shell | `@keyframes lp-float-*`, `lp-reveal-up`, `lp-aurora` | Launchpad uses named visual animations. | Replace with Tailwind animation tokens or remove the animation. |
| Shell | `.swrap.open`, sidebar state selectors | Open/collapsed/current state applies across owned elements. | Express the state on the owning elements with literal utilities. |
| Shell | `.side-handle::before` | The sidebar grab target is generated content. | Render the visual handle as an element. |
| Shell | `.lp-tile[data-tone='...']` | Tile tone color is selected by a `data-tone` attribute value, not by a single element's own class; the eleven tone-to-color mappings are a selector relationship literal utilities cannot express per element. | Give each tone its own literal utility class applied by JavaScript instead of a shared `data-tone` attribute. |
| Shell | `.app-switcher-row.active`, `.active .sq`, `.active span:last-child` | The active app-switcher row's own background and its descendants' colors are a state applied by a sibling-toggled class, not expressible on each element's own static classes. | Apply the state's literal utilities directly via JavaScript classList toggles on each affected element instead of a shared `.active` ancestor selector. |
| Shell | `.spanel.open`, `.sscrim.open` | The search panel and its scrim toggle `display` via a JS-added `.open` class; the shown/hidden state is a class-relationship, not a static utility. | Toggle the display utility directly via JavaScript instead of a state class. |
| Shell | `.spanel.screens-only .sctx`, `.sfoot-scope`, `.sfoot-ctx` | Launchpad's screens-only search hides record context/scope/actions on three descendants keyed off an ancestor's `.screens-only` class. | Toggle each descendant's own hidden utility via JavaScript instead of an ancestor selector. |
| Shell | `.sitem:hover:not(:disabled)`, `.sitem.sel`, and their `.ic` child variants | Hover and keyboard-selection state on search result rows needs a pseudo-class/state selector and a matching child-selector variant that can't be a single element's own utility. | Express hover with a literal `hover:` utility variant and selection with a JS-toggled class per element once child-scoped state variants are unnecessary. |
