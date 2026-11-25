# 0001. Prototype is the look reference; ADS is the default for values and behaviour

- Status: Accepted
- Date: 2026-11-24
- Revised: 2026-11-25 (#22). ADS is the default for tokens, behaviour, sizes and breakpoints.
- Revised: 2026-11-25 (#17). The font stack stays; the approved spec and tickets are linked.

## Context

The prototype takes its visual language from the Atlassian Design System (ADS). Over time it has diverged in type, spacing, icons and some components. The team has agreed on the current screens, colours and spacing. Matching ADS exactly would change screens that are already agreed.

## Decision

ADS is the default for tokens, component behaviour, sizes and breakpoints. Every value that still differs from ADS is an exception, recorded in [DESIGN.md](../../DESIGN.md) with its reason. The agreed prototype screens, colours and layouts remain the reference for the look: a change that alters them is decided and measured before it lands.

The font stays the `system-ui` stack. Font sizes and line heights follow ADS (#28); the font family does not.

The work follows the [ADS alignment design](../superpowers/specs/2026-11-25-ads-alignment-design.md) and is implemented in issues #34 to #44.

## Consequences

- Each ADS alignment change is measured and decided before it lands (#18, #21 to #33). Each one is implemented in its own ticket (#34 to #44).
- A value that is neither ADS nor a listed exception is a defect.
- Screenshot baselines stay the approved reference. A baseline changes only with the user's approval of that change.
- The final visual check compares `0056a67`, the agreed state before 24 Nov, with the finished branch. The user does it after the work.
- Figma work follows the prototype.
- A component's move to ADS behaviour is still decided per component (#18).

## Alternatives

- Adopt the `@atlaskit/*` packages. This would replace agreed screens and needs a large migration.
- Use Atlassian Sans. This needs licence work and changes every agreed screen.

