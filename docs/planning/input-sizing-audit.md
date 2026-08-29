# Input Sizing Audit

Planning document for addressing the long-standing "inputs don't size predictably" issues
tracked across #3300, #4287, #4085, #2421.

A running test page is available at **Admin → Tests → Input Sizing** in Toolbox
(`toolbox/client-app/src/admin/tests/inputSizing/`). Use it to confirm current behavior,
validate proposed fixes, and prevent regressions.

## 1. Current state — desktop inputs

Inputs in `/desktop/cmp/input/`, ranked by layout-prop participation:

| Input | Hardcoded default | `flex` passthrough | Layout props land on | Fills under `flex:1`? |
|---|---|---|---|---|
| `textInput` | `width: 200` | yes (`style`) | `<input>` via BP | ✅ fills |
| `textArea` | `width: 300`, `height: 100` | yes (`style`) | `<textarea>` via BP | ✅ fills |
| `numberInput` | `width: 200` | yes (`style`) | inner `<input>` (BP `numericInput` buries it) | ❌ 200px |
| `select` | `width: 200` | via style | react-select root | ✅ fills |
| `slider` | `width: 200` | via style | outer `.xh-slider` | ✅ fills |
| `picker` | `width: 160` | via button props | inner trigger `<button>` | ❌ 160px (also outer wrapper is `inline-block`) |
| `dateInput` | `width: 200` (inherited from inner `textInput`) | via inner textInput | inner `.bp6-input` | ❌ 200px |
| `segmentedControl` | none | via `getLayoutProps` on BP control | inner BP control | ❌ content width |
| `buttonGroupInput` | none | via `getLayoutProps` on BP group | outer `.bp6-button-group` | ✅ fills |
| `codeInput` | `height: 100` only | via `getLayoutProps` on outer | outer wrapper | ✅ fills |
| `jsonInput` | inherited | via `getLayoutProps` on outer | outer wrapper | ✅ fills |

Non-layout-capable (intentional): `checkbox`, `checkboxButton`, `radioInput`, `switchInput`.

## 2. Current state — mobile inputs

All mobile inputs (`textInput`, `textArea`, `numberInput`, `select`, `dateInput`, `searchInput`,
`buttonGroupInput`) use `withDefault(width, null)` uniformly. No hardcoded pixel defaults;
inputs fill their container via CSS; no wrapper-element issues observed.

**Mobile is not broken — desktop is the inconsistent platform.**

## 3. Root causes, cross-referenced to tickets

**#3300 / #4287 Part 1 — "default width wins over flex":**
`withDefault(width, N)` emits an inline `width: 200px` style alongside any `flex` the developer
passed. Inline styles beat CSS, and when both `width` and `flex` are present, `width` becomes
flex-basis — so flex-grow can still win, but only when the framework also passes `flex` through
(TextInput, TextArea, Select, Slider do). For NumberInput and Picker, the flex prop never reaches
the outermost element that participates in parent layout, so the default width simply holds.

**#4287 Part 2 / #4085 — "layout props on wrong element":**
Several inputs apply `getLayoutProps(props)` to an inner control (the button for Picker,
BP `numericInput` for NumberInput, the BP textInput inside DateInput). The element that
actually participates in the parent's flex/block layout is a wrapper around that control,
which receives no layout props and is sized to content.

**#2421 — "outer wrapper swallows `className` and `style`":**
Same shape as #4287 Part 2 applied to `className` and `style`. DateInput is the canonical
example: a developer-supplied `className` lands on the inner input, not on the outermost
`div.xh-date-input__wrapper` that a stylesheet would need to target.

## 4. Proposed sizing contract

*Draft for insertion into `/cmp/input/README.md` once the library changes land.*

### Sizing model

Every Hoist input renders with a predictable outer element that is:
- The sole participant in its parent container's layout (flex/block/grid).
- The recipient of all developer-supplied `className`, `style`, layout props (`width`, `height`,
  `flex`, `margin`, `padding`, `minWidth`, `maxWidth`), and the component `ref`.
- Identified by the component's documented `xh-*` class (e.g. `.xh-picker`, `.xh-number-input`).

### Props-based sizing (supported, recommended)

- `width`, `height`, `flex`, `minWidth`, `maxWidth`, `margin`, `padding` are supported on every
  layout-capable input and always land on the outer element.
- Passing `flex: 1` (or any flex-grow value) causes the input to fill its share of a flex
  container. No other prop or CSS is required.
- Passing `width: null` clears any default width and lets the CSS / container drive sizing.
- Passing a pixel width, percentage, or CSS length (`width: 240`, `width: '50%'`) sets
  that width on the outer element.

### CSS-based sizing (supported, scoped)

- Target the documented outer class (e.g. `.xh-picker`, `.xh-select`) for sizing, borders,
  margins, backgrounds. Inline styles are not used for component defaults, so normal CSS
  cascade applies.
- Internal class names (e.g. `.xh-picker__trigger`, `.bp6-input`) are implementation detail —
  not part of the public API — and may change without notice. Do not rely on them for layout
  overrides.

### Default widths (design choice — see §5)

Inputs have a reasonable default width for casual out-of-the-box use. That default:
- Is applied via CSS, not inline style — so any developer-supplied CSS rule overrides it.
- Is cleared automatically when any sizing prop is passed that implies filling
  (`flex`, `width: '100%'`, `width: null`, or any `minWidth`/`maxWidth`).

### What is not supported

- Setting layout styles on internal wrapper elements via CSS selectors (`!important` or
  otherwise). If a layout prop is missing, file an issue — we'll add it.
- Passing `style` or `className` with the expectation that it reaches an inner control
  (e.g. targeting the `<input>` element inside a `numberInput` by className). Use
  component props (`placeholder`, `leftIcon`, `textAlign`, etc.) for content-level styling.

## 5. Design decision — how to preserve "nice out of the box"

The original hardcoded defaults existed to make `textInput()` or `picker()` render at a sensible
width with zero developer effort. That goal is still valid. Three ways to deliver it:

**Path A — CSS default, overridable by cascade.** Move `width: 200px` from inline style to
`.xh-text-input { width: 200px; }` in the package SCSS. Developer CSS overrides it with any
selector of equal or higher specificity. Layout props (`width`, `flex`, etc.) still win because
they emit inline styles on the outer element. Closest to current behavior; minimal breakage.

**Path B — Flex-aware default.** Keep inline default but suppress it whenever `flex`,
`minWidth`, `maxWidth`, or `width: '100%' | null` is present. Doesn't address CSS-override
frustrations but solves the flex mixing problem. Smallest diff.

**Path C — No pixel default (match MUI/Ant/Chakra/Mantine).** Default `width` to `null`; inputs
fill their container by default via CSS (`width: 100%`) or sit at content width depending on
parent. Developers explicitly set a width when they need one. Largest behavior change; most
aligned with modern libraries; mirrors what mobile already does.

**Recommendation:** Path A for the fix, with the flex-aware guard from Path B as a safety net.
Preserves zero-config look, makes CSS overrides "just work", handles flex cleanly. Revisit
Path C in a subsequent milestone if we want full convergence with mobile + library norms.

## 6. Phased fix plan

1. **Phase 1 — Test page (DONE).** Admin/Tests/Input Sizing. Establishes baseline and regression
   surface. ✅
2. **Phase 2 — Shared helper + flex-aware defaults.** Introduce `resolveInputLayout(props, def)`
   in `utils/react`. Apply across the six inputs with hardcoded defaults. Closes #3300 and
   the first half of #4287.
3. **Phase 3 — Outer-wrapper refactor.** For Picker, NumberInput, DateInput, SegmentedControl:
   route layout props / `className` / `style` / `ref` to the outermost DOM element. Uses
   Blueprint `targetProps` / `wrapperStyle` where needed, otherwise introduces a thin wrapper
   div owned by Hoist. Closes #4287 Part 2, #4085, #2421.
4. **Phase 4 — CSS-default migration (Path A).** Move pixel defaults from inline style to the
   input SCSS files. Remove inline defaults once the flex-aware guard has shipped.
5. **Phase 5 — Contract docs.** Commit §4 into `/cmp/input/README.md`. Update
   `/desktop/cmp/input/*` per-input READMEs if/as they exist.
6. **Phase 6 — Mobile parity check.** Confirm mobile inputs still pass the contract (they
   already do) and add mobile specimens to the test page if useful.
