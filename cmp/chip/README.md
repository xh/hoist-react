# Chip Package

## Overview

`Chip` is a compact label for a status, a category or a value. It can stand alone, sit in a row of
chips, or fill a grid cell. A chip can be clicked, toggled and removed. It takes no model and works
on desktop and mobile. The props and their defaults are documented in `Chip.ts`.

Use a `Badge` for a count or marker attached to other content, such as a tab title or a button.
A badge is small, bold and never interactive. A chip can hold one, e.g.
`chip({children: ['Errors ', badge(3)]})`.

## Usage

```typescript
import {chip} from '@xh/hoist/cmp/chip';
import {Icon} from '@xh/hoist/icon';

// A plain label
chip('Draft')

// A status in a grid cell
chip({intent: 'success', minimal: true, size: 'compact', children: 'Settled'})

// A category with its own color, which selects something on click
chip({
    color: 'var(--xh-purple)',
    minimal: true,
    onClick: () => model.selectPreset(preset),
    children: preset.name
})

// A toggle in a row of filter chips
chip({
    outlined: true,
    round: true,
    active: model.showOpen,
    onClick: () => (model.showOpen = !model.showOpen),
    children: 'Open only'
})

// A removable file, truncated to a width
chip({
    outlined: true,
    icon: Icon.file(),
    maxWidth: 200,
    title: file.name,
    onRemove: () => model.removeFile(file),
    children: file.name
})
```

There are three styles. A **filled** chip, the default, uses the intent's `-darker` step with white
text. A **`minimal`** chip uses the intent's 15% tint with its text color. An **`outlined`** chip
has a border in that text color and no fill. A chip with no `intent` is neutral.

`color` takes any CSS color for categories that the intents don't cover, and takes precedence over
`intent`. Its text and border are mixed with the theme's text color, so one value reads in both
light and dark themes.

`size` is `'compact'`, `'standard'` or `'large'`. Sizes are relative to the font size of the
container, so a chip in a grid cell scales with the grid's sizing mode. Set `round` for fully
rounded ends. For monospace text, add the `xh-font-family-mono` class.

### Interaction

- **`onClick`** makes the chip a button. It joins the tab order, and Enter and Space call the
  handler.
- **`active`** marks a toggle chip as selected. A minimal or outlined chip renders filled, and a
  clickable chip gets `aria-pressed`. Toggle chips should start minimal or outlined, since `active`
  changes nothing visible on a filled chip.
- **`onRemove`** adds a remove button, named "Remove {text}" for screen readers. A click on it never
  fires `onClick`. Backspace or Delete on the focused chip or its button also call `onRemove`. On a
  clickable chip the button is for pointers only, so the chip stays a single tab stop.
- **`disabled`** dims the chip and ignores all interaction.

Any key the chip handles stops propagating, so a chip inside a widget doesn't also trigger an
ancestor's shortcut, such as Delete to remove the selected item. Other keys bubble as usual.

## Styling

Set the `--xh-chip-*` variables on `body.xh-app` to change the size, padding, radius and the
neutral colors. The full set is in the `Chips` block of
[`styles/vars.scss`](../../styles/vars.scss). Intent colors come from the `--xh-intent-*` variables:

```scss
body.xh-app {
  --xh-chip-border-radius: 2px;
  --xh-chip-font-weight: 600;
  --xh-chip-minimal-bg: var(--xh-bg-highlight);
}
```

## Common Pitfalls

- **The text truncates, but only when the chip is constrained.** Set `maxWidth`, or place it in a
  container that limits it, and pass `title` so the full text shows on hover.
- **Filled warning chips have the lowest contrast.** White text on the warning fill is about 4.2:1
  in the light theme. Prefer `minimal` for warnings in small text, and add an icon.
- **`stopPropagation` reaches React handlers and `document` listeners only.** A native listener
  added directly to an element between the chip and the React root still sees the event.

## Related Packages

- [`/cmp/badge/`](../badge/Badge.ts) - `Badge`, for counts attached to other content
- [`/cmp/`](../README.md) - the component catalog
