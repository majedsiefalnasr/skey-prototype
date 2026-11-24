# 0001. Prototype is the design reference, not the Atlassian Design System

- Status: Accepted
- Date: 2026-11-24

## Context

The prototype takes its visual language from the Atlassian Design System (ADS). Over time it has diverged in type, spacing, icons and some components. The team has agreed on the current screens, colours and spacing. Matching ADS exactly would change screens that are already agreed.

## Decision

The agreed prototype is the reference. ADS remains the source for tokens and component behaviour where the prototype has mapped them. Each difference is recorded in [DESIGN.md](../../DESIGN.md).

## Consequences

- Visual changes follow the prototype, not the ADS documentation alone.
- Screenshot baselines stay the approved reference.
- Figma work follows the prototype.
- Moving closer to ADS later is a separate decision with its own plan.

## Alternatives

- Adopt the `@atlaskit/*` packages. This would replace agreed screens and needs a large migration.

