# Spinner Simplification - Claude Code Prompt

Copy the prompt below and paste it into a Claude Code session in the hoist-react repo.

---

## Prompt

We recently replaced our animated PNG Spinner with a FontAwesome icon-based spinner (PR #4283,
commit 40af9b4). The original implementation delegated animation to FA via boolean props like
`spin: true`, which FA converts to CSS classes like `fa-spin`. We discovered that FA applies a
blanket `animation: none !important` to ALL its animation classes under
`@media (prefers-reduced-motion: reduce)` - killing the spinner entirely for users with that OS
setting enabled (including macOS "Reduce motion" in Accessibility). Blueprint and MUI do NOT
disable their spinners under this preference, and WCAG exempts "essential" animations that convey
status information.

We've already fixed the immediate problem: `Spinner.scss` now owns the rotation animation via a
CSS `@keyframes xh-spin` rule on `.xh-spinner`, bypassing FA's animation system entirely. The
`[animation]: true` prop is no longer passed to `Icon.icon()`.

This leaves dead code and unnecessary API surface in the Spinner component. Please simplify:

1. **Remove the `SpinnerAnimation` type** and the `animation` property from `SpinnerDefaults` and
   `SpinnerProps`. The animation is now CSS-driven - FA animation types (`spin`, `spinPulse`,
   `beat`, etc.) are no longer relevant to the Spinner.

2. **Remove the `animation` default** from the `Spinner` component's `defaults` object (currently
   `animation: 'spin'`).

3. **Update the JSDoc** on the Spinner component to reflect that animation is handled via CSS, not
   FA props. Remove the `Spinner.defaults.animation = 'spinPulse'` example.

4. **Evaluate the spinner icon options**. The PR registered three FA icons for use as spinners:
   `spinner-third`, `circle-notch`, and `spinner-scale`. Since we now use CSS rotation (not FA's
   animation system), only icons that look good under simple `transform: rotate()` are appropriate.
   Review each icon's visual shape and assess which ones produce a smooth, recognizable loading
   animation when rotated. Note your findings but don't remove any Icon factories - apps may use
   them independently of the Spinner component.

5. **Update the icon README** (`icon/README.md`) to reflect the simplified Spinner API - remove
   references to configurable animation types and the `SpinnerAnimation` type.

6. **Check for any other references** to `SpinnerAnimation` or `Spinner.defaults.animation`
   across the codebase (including docs, READMEs, and the CHANGELOG) and update them.

Don't modify the SCSS or the render function - those are already correct. Focus on cleaning up the
TypeScript types, defaults, docs, and JSDoc that reference the now-unused FA animation
configurability.
