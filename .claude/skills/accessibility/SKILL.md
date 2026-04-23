---
name: accessibility
description: Activates when building or reviewing UI. Enforces WCAG 2.2 AA baselines, semantic HTML, keyboard navigation, and screen reader support.
allowed-tools: Read, Grep, Glob, Bash(npx:*)
---

# Accessibility Skill

You build UIs that work for people using a keyboard, a screen reader, a
magnifier, or in bright sunlight. Accessibility isn't a feature; it's
correctness.

## Non-negotiables (WCAG 2.2 AA)

- **Every interactive element reachable by keyboard.** Tab order must be
  logical. Focus must be visible (not `outline: none` without a replacement).
- **Every form input has a label.** `<label for=...>` or `aria-label` or
  `aria-labelledby`. Placeholder is not a label.
- **Every image has alt text.** Decorative images get `alt=""`, not
  missing alt.
- **Color is not the only signal.** Red error text also gets an icon or
  a prefix like "Error:". Contrast ratio ≥ 4.5:1 for body, 3:1 for large
  text / UI controls.
- **Headings describe structure, not style.** One `h1` per page, no
  skipped levels.
- **Live regions for async updates.** Toasts / alerts need
  `role="status"` or `role="alert"`.
- **Motion is optional.** Respect `prefers-reduced-motion`.

## Semantic HTML first

Prefer `<button>` over `<div onClick>`. Prefer `<a href>` for navigation,
`<button>` for in-page actions. Prefer `<dialog>` over a custom modal.
Prefer native `<details>`/`<summary>` over a custom accordion.

If you must build custom, implement the ARIA authoring practices pattern
for that widget — and test it with a keyboard only.

## React/Vue/Svelte specifics

- Don't attach `onClick` to non-interactive elements. If you really must,
  add `role="button"`, `tabindex={0}`, and `onKeyDown` for Enter/Space.
- Manage focus on route change. SPAs often leave focus on whatever
  triggered navigation, which confuses screen readers.
- Modal dialogs: trap focus, restore focus on close, close on Escape.
- Form errors: associate error message with the field via
  `aria-describedby` and set `aria-invalid`.

## Testing

- **Keyboard only.** Tab through every flow. Can you complete the task?
- **axe.** Automated scan catches ~30% of issues.
  `npx @axe-core/cli https://localhost:3000`
- **Screen reader spot-check.** VoiceOver (macOS: Cmd+F5), NVDA (Windows),
  TalkBack (Android). Read the component you just built.
- **Reduced motion.** Toggle "Reduce motion" in OS settings and verify
  nothing breaks.

## Common anti-patterns to flag

- `<div onClick>` with no keyboard handling
- `outline: none` with no visible focus alternative
- `aria-hidden` on an interactive element
- Placeholder used as the only label
- Icon-only buttons with no `aria-label`
- Autofocus on page load (steals focus from screen reader on landing)
- Animations without `prefers-reduced-motion` guards
- Toasts that disappear too fast for assistive tech to announce
