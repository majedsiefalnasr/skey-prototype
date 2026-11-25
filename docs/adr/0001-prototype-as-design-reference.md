# 0001. Prototype is the look reference; ADS is the default for values and behaviour

- Status: Accepted
- Date: 2026-11-24
- Revised: 2026-11-25 (#22). ADS is the default for tokens, behaviour, sizes and breakpoints.

## Context

The prototype takes its visual language from the Atlassian Design System (ADS). Over time it has diverged in type, spacing, icons and some components. The team has agreed on the current screens, colours and spacing. Matching ADS exactly would change screens that are already agreed.

## Decision

ADS is the default for tokens, component behaviour, sizes and breakpoints. Every value that still differs from ADS is an exception, recorded in [DESIGN.md](../../DESIGN.md) with its reason. The agreed prototype screens, colours and layouts remain the reference for the look: a change that alters them is decided and measured before it lands.

## Consequences

- Each ADS alignment change is measured and decided before it lands (#18, #21 to #33).
- A value that is neither ADS nor a listed exception is a defect.
- Screenshot baselines stay the approved reference.
- Figma work follows the prototype.
- A component's move to ADS behaviour is still decided per component (#18).

## Alternatives

- Adopt the `@atlaskit/*` packages. This would replace agreed screens and needs a large migration.

