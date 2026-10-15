# Hoist React v90 Upgrade Notes

> **From:** v89.x → v90.0.0 | **Released:** unreleased | **Difficulty:** 🟢 LOW

## Overview

Hoist React v90 changes how `SegmentedControl` is sized, on desktop and mobile. Most steps apply
only to apps that use the control.

- **`SegmentedControl.fill` removed (required if used)** - The control is now sized to its
  options by default. Size it with layout props such as `flex` and `width` - see Step 2.
- **Equal segment widths (review)** - Segments are now equal width by default at any size,
  including controls that set `fill: false` - see Step 3.
- **Layout props now apply (review)** - Desktop `SegmentedControl` and `IntentInput` ignored
  layout props such as `width` and `flex`. They now apply them - see Step 4.

## Prerequisites

Before starting, ensure:

- [ ] Running hoist-react v89.x.
- [ ] Your package manager (**pnpm**, **yarn**, or **npm**) is available and working.

## Upgrade Steps

### 1. Update `package.json`

Bump hoist-react to v90.

**File:** `client-app/package.json`

Before:

```json
"@xh/hoist": "^89.0.0",
```

After:

```json
"@xh/hoist": "^90.0.0",
```

### 2. Replace `SegmentedControl.fill` with Layout Props

`SegmentedControlProps.fill` is gone. A `SegmentedControl` is now as wide as its options and does
not stretch to fill its container. Size it with layout props, as for any other component.

**Find affected code:** run your type check. TypeScript reports each `fill` passed to
`segmentedControl()` in an object literal. Also search for props built elsewhere and spread in:

```bash
grep -rn "segmentedControl(" client-app/src/
```

- Delete `fill: false`. It is now the default.
- Replace `fill: true` with `flex: 1` in a row, such as a toolbar or `hbox`. Use `width: '100%'`
  in a column or block container, such as a panel body or card.

Before:

```typescript
segmentedControl({bind: 'view', options: VIEWS, fill: false});
segmentedControl({bind: 'weight', options: WEIGHTS, fill: true});
```

After:

```typescript
segmentedControl({bind: 'view', options: VIEWS});
segmentedControl({bind: 'weight', options: WEIGHTS, width: '100%'});
```

A control with no `fill` used the old default, `fill: true`. In a toolbar or other row, it was
already sized to its options, so it needs no change. In a column or block container, it spanned
the container. Add `width: '100%'` to keep that.

### 3. Review Equal Segment Widths

`equalSegmentWidths` (default `true`) now applies at any size. A control sized to its options
gives every segment the width of its widest label. A control given a width divides it equally.

Controls that set `fill: false` used to size each segment to its own label. They now show equal
segments, which makes the control wider. Set `equalSegmentWidths: false` to keep label-width
segments.

```typescript
segmentedControl({bind: 'level', options: LEVELS, equalSegmentWidths: false});
```

### 4. Review Layout Props on `SegmentedControl` and `IntentInput`

Desktop `SegmentedControl` and `IntentInput` ignored layout props such as `width`, `flex`, and
`margin`. They now apply them. An app that passed these props, through a cast or a spread object,
may see them take effect for the first time.

A desktop `FormField` passes `flex: 1` to an input with no `width` or `flex` of its own. In some
field layouts, that now stretches a `SegmentedControl` across the field. Set `flex: 'none'` on the
control to keep it at the width of its options.

```typescript
formField({field: 'level', item: segmentedControl({options: LEVELS, flex: 'none'})});
```

## Verification Checklist

After completing all steps:

- [ ] `pnpm lint` / `yarn lint` / `npm run lint` passes.
- [ ] `pnpm typecheck` / `npx tsc --noEmit` passes.
- [ ] The application builds and loads without console errors.
- [ ] No `segmentedControl()` call sets `fill`.
- [ ] Each `SegmentedControl` renders at the intended width, in toolbars, panels, and forms.
- [ ] Segments are equal width, except where `equalSegmentWidths: false` is set.

## Reference

- [Toolbox on GitHub](https://github.com/xh/toolbox) - canonical example of a Hoist app.
