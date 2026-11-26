# Plan: Button redesign

Status: in progress on `claude/button-redesign`, stacked on `claude/blueprint-selector-rename`
(xh/hoist-react#5003). Not yet pushed or in a PR.

## Goal

One `Button`, `ButtonGroup` and `SplitButton` for desktop and mobile, so a component that renders
a button can be shared across platforms. Revisit the button while Blueprint's styles are gone:
a smaller stylesheet, sizes, a loading state and a split button.

## Review of the Blueprint-era stylesheet

`desktop/cmp/button/Button.scss` was 2,831 lines, up from 552 on `develop`. It held two layers:

- Lines 1-2240: Blueprint's button and button group CSS, translated class for class by the
  selector rename's `translate.cjs`, so every selector kept its weight. Every variant, intent,
  state and theme is spelled out, with Blueprint's palette inlined as hex values.
- Lines 2243-2831: Hoist's own layer, mostly unchanged from `develop`, which repainted nearly every
  color from `--xh-*` variables. It used doubled classes (`.xh-app.xh-dark.xh-dark`,
  `.xh-button.xh-button`) to outrank the Blueprint layer.

Most of the Blueprint layer lost to Hoist's. Recording computed styles of every style, intent,
state and theme showed what still applied: the standard button's shadows, the outlined button's
1px border, `box-shadow: none` on disabled buttons, and the button group's edge joining. The rest
was dead weight, and the doubled selectors made app overrides hard to write.

## Decisions

- **Shared component.** `Button` and `ButtonGroup` move to `cmp/button`. The desktop and mobile
  button packages re-export them. Desktop renders a native `<button>`. Mobile keeps its `div`
  with the button role, because browsers size a native button to its content, which broke
  full-width mobile buttons when the Onsen removal tried it (#4910).
- **One token-driven stylesheet.** `cmp/button/Button.scss` sets private `--_*` variables per
  style, intent, theme and platform, and draws every button from them with single-class rules.
  Under 500 lines, with SplitButton, replace 3,063 (desktop and mobile together).
- **No visual change** from the rewrite, checked by computed styles: 4,800 desktop and 1,920
  mobile button states match, apart from invisible properties (border colors on zero-width
  borders, `gap` in place of child margins). Full-route style diffs cover the components that
  restyle buttons.
- **`size`** takes the shared `ComponentSize` (`compact`, `standard`, `large`), as `Callout` and
  `StatCard` do. Each size swaps in its own height, padding and font-size variables. A group
  passes its size on, and a compact Toolbar now sets the same variables in place of its own
  high-specificity button rules.
- **`loading`** takes a boolean or a `TaskObserver`. The spinner replaces the icon, or covers the
  content of a button without one, and the button keeps its size. It stays focusable, with
  `aria-busy` and `aria-disabled`, and ignores clicks.
- **`SplitButton`** in `cmp/button`, on both platforms through the `dynamics` platform hooks. Two
  real buttons with two tab stops, as Carbon, Fluent and Atlassian build theirs. The arrow button
  gets `aria-haspopup` and `aria-expanded` from Popover, and a default name of "More [text]
  options".
- **No `aria-pressed` from `active`.** Hoist sets `active` on buttons whose popover is open, where
  `aria-expanded` is the right state. Toggle semantics stay with the component that knows them.

## Survey of other toolkits

Checked against the docs of Radix Themes, shadcn/ui, Mantine, Chakra v3, MUI and Joy, Ant Design,
Fluent v9, Spectrum 2, Carbon, Primer, Atlassian, Base UI and Ark UI.

- **Loading** - 8 of 11 styled toolkits have it. Keeping the width and swapping the icon or
  covering the content is the common behavior. Primer and React Aria keep the button focusable.
- **Split button** - Fluent, Carbon and Atlassian ship one. All build it from two buttons.
- **Style prop** - none use stacked booleans like `minimal` and `outlined`. About half use a
  `variant` enum beside a color or intent. Not changed here - see Follow-ups.
- **Sizes** - set by CSS variables per size: height, padding, font size and icon size.
- **Focusable disabled** - Fluent (`disabledFocusable`), Base UI and Primer offer a disabled state
  that keeps focus, so a tooltip can explain why. Hoist's loading state does this. A general
  option is a follow-up.

## Follow-ups

- A `variant` prop (`'standard' | 'minimal' | 'outlined'`) in place of the two booleans, keeping
  them as deprecated aliases. The survey's clearest gap, but a wide API change - decide first.
- Focusable disabled buttons, so a disabled button's tooltip can say why.
- Share `MenuButton`, whose desktop and mobile versions are near copies, and the platform buttons
  built on Button, such as `RefreshButton` and `ThemeToggleButton`.
- Simplify shared components that split by platform only for their buttons, such as
  `ErrorMessage`.
