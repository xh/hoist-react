# Layout Package

## Overview

The `/cmp/layout/` package provides foundational flexbox-based containers for building application
layouts. These components handle positioning, sizing, and arrangement of content using CSS flexbox,
forming the structural backbone of Hoist applications.

All layout components export both a React component (PascalCase) and an element factory (camelCase).

## Core Components

### VBox / HBox / Box

Flexbox containers with layout prop support.

```typescript
import {vbox, hbox} from '@xh/hoist/cmp/layout';

// Vertical layout (column direction)
vbox({
    padding: 10,
    items: [header(), content(), footer()]
})

// Horizontal layout (row direction)
hbox({
    items: [sidebar(), mainContent()]
})
```

**All Box variants provide:**
- `display: flex` with `overflow: hidden` and `position: relative`
- All flexbox layout props via the `BoxProps` interface (see [Layout Props](#layout-props-boxprops))
- Pass-through of standard HTML div attributes

**Prefer `vbox` and `hbox`** over bare `box` — they make layout direction explicit. `box` applies
`display: flex` with the CSS default direction (row) but does not communicate that intent clearly.

### VFrame / HFrame / Frame

Flexing containers that stretch to fill their parent via `flex: auto`.

```typescript
import {vframe, hframe} from '@xh/hoist/cmp/layout';

// Vertical frame (stretches and arranges children vertically)
vframe({
    items: [toolbar(), grid()]
})

// Horizontal frame (stretches and arranges children horizontally)
hframe({
    items: [leftPanel(), rightPanel()]
})
```

**Key difference from Box variants:** Frame adds `flex: auto`, making it stretch to consume
available space in its parent container. Use Frame variants for content areas that should grow;
use Box variants when you need explicit size control.

**Prefer `vframe` and `hframe`** over bare `frame` for the same reason as above — they make
layout direction explicit.

### Viewport

Full-screen container for the application root.

```typescript
import {viewport} from '@xh/hoist/cmp/layout';

viewport({
    item: vframe({
        items: [appHeader(), appContent(), appFooter()]
    })
})
```

**Viewport provides:**
- `position: fixed` to fill the entire browser window
- Standard starting point for application layout

### Spacer / Filler

Spacing utilities for flexbox layouts.

```typescript
import {spacer, filler, hspacer, vspacer} from '@xh/hoist/cmp/layout';

// Fixed spacer (flex: none)
hbox({
    items: [
        leftButton(),
        hspacer(20),    // 20px horizontal space
        rightButton()
    ]
})

// Flexible filler (flex: auto) - pushes items apart
toolbar({
    items: [
        saveButton(),
        filler(),       // Stretches to push cancelButton to the right
        cancelButton()
    ]
})

// Vertical spacer
vbox({
    items: [
        header(),
        vspacer(10),    // 10px vertical space
        content()
    ]
})
```

| Component | Purpose |
|-----------|---------|
| `spacer` | Generic fixed-size spacer (`flex: none`) |
| `hspacer(px)` | Horizontal spacer with specified width |
| `vspacer(px)` | Vertical spacer with specified height |
| `filler` | Stretches to fill available space (`flex: auto`) |

### Placeholder

Styled empty-state container for areas without content.

```typescript
import {placeholder} from '@xh/hoist/cmp/layout';

// Show placeholder when no selection
model.selectedRecord
    ? detailPanel({record: model.selectedRecord})
    : placeholder('Select a record to view details')
```

**Use cases:**
- Detail panels without a current selection
- Conditional content areas before data loads
- Empty states with muted, standard styling

### TileFrame

Auto-arranging tile container that positions children as equally-sized tiles.

```typescript
import {tileFrame} from '@xh/hoist/cmp/layout';

tileFrame({
    desiredRatio: 1.5,        // Width/height ratio for tiles (1.5 = wider than tall)
    spacing: 10,              // Gap between tiles in px
    minTileWidth: 200,        // Minimum tile width
    maxTileWidth: 400,        // Maximum tile width
    minTileHeight: 150,       // Minimum tile height
    maxTileHeight: 300,       // Maximum tile height
    onLayoutChange: (layout) => console.log(layout),
    items: [
        chartTile(),
        gridTile(),
        summaryTile(),
        alertsTile()
    ]
})
```

**TileFrame features:**
- Automatically arranges children in a grid
- Maintains consistent tile sizes
- Responds to container resizing
- Optimizes layout to minimize empty space while respecting constraints
- Reports layout changes via callback

### Tags

HTML element factories for common tags.

```typescript
import {div, span, img, a, p, h1, h2, h3, h4} from '@xh/hoist/cmp/layout';

div({
    className: 'my-container',
    items: [
        h1('Title'),
        p('Description text...'),
        a({href: '/details', item: 'View details'})
    ]
})
```

These factories provide Hoist-style element creation for standard HTML elements, accepting
config objects with `item`/`items` for children.

## Layout Props (BoxProps)

All layout components accept common sizing and flexbox CSS properties as **top-level props** rather
than requiring nested `style` objects. This keeps component configuration clean and consistent with
Hoist's declarative element factory pattern.

**Numeric values are automatically converted to pixels:**

```typescript
// Hoist style - clean and concise
vbox({
    width: 300,
    padding: 10,
    gap: 8,
    items: [...]
})

// Equivalent React style object - more verbose
<div style={{width: '300px', padding: '10px', gap: '8px', display: 'flex', flexDirection: 'column'}}>
    ...
</div>
```

**Multi-value strings are also supported** for margin and padding, with numeric values in the
string converted to pixels:

```typescript
padding: '10 20'        // becomes '10px 20px'
margin: '0 auto'        // preserved as-is (auto is not a number)
padding: '10 20 10 20'  // becomes '10px 20px 10px 20px'
```

**Supported properties:**

| Prop | CSS Property | Description |
|------|--------------|-------------|
| `flex` | flex | Shorthand flex (e.g., `'auto'`, `'none'`, `1`) |
| `flexGrow` | flex-grow | Grow factor |
| `flexShrink` | flex-shrink | Shrink factor |
| `flexBasis` | flex-basis | Initial size |
| `flexDirection` | flex-direction | `'row'`, `'column'`, etc. |
| `flexFlow` | flex-flow | Shorthand direction and wrap |
| `flexWrap` | flex-wrap | `'wrap'`, `'nowrap'` |
| `alignItems` | align-items | Cross-axis alignment |
| `alignContent` | align-content | Multi-line alignment |
| `alignSelf` | align-self | Self alignment |
| `justifyContent` | justify-content | Main-axis alignment |
| `gap` | gap | Gap between items |
| `width` | width | Element width |
| `height` | height | Element height |
| `minWidth` | min-width | Minimum width |
| `maxWidth` | max-width | Maximum width |
| `minHeight` | min-height | Minimum height |
| `maxHeight` | max-height | Maximum height |
| `padding` | padding | Padding (all sides) |
| `paddingTop` | padding-top | Top padding |
| `paddingRight` | padding-right | Right padding |
| `paddingBottom` | padding-bottom | Bottom padding |
| `paddingLeft` | padding-left | Left padding |
| `margin` | margin | Margin (all sides) |
| `marginTop` | margin-top | Top margin |
| `marginRight` | margin-right | Right margin |
| `marginBottom` | margin-bottom | Bottom margin |
| `marginLeft` | margin-left | Left margin |
| `overflow` | overflow | Overflow behavior |
| `overflowX` | overflow-x | Horizontal overflow behavior |
| `overflowY` | overflow-y | Vertical overflow behavior |
| `textOverflow` | text-overflow | Clipped text treatment, e.g. `'ellipsis'` |
| `position` | position | Position type |
| `top` | top | Top offset |
| `left` | left | Left offset |
| `display` | display | Display type |

`margin`, `padding`, and `gap` also accept `true` for the standard app padding
(`var(--xh-pad-px)`). A `false` value is treated as unset.

### Supporting Layout Props in a Custom Component

Size a component the way a developer expects without reading its docs. With no layout props, it
takes its natural size, usually the size of its content, and does not stretch to fill its
container. Layout props such as `width` and `flex` are the only way to size it. Do not add a
component-specific sizing prop, such as a `fill` flag, that repeats what `flex` or `width` does.

A component that accepts layout props must do three things, and all three must agree. If it skips
one, a caller can pass `width: 150` and see it silently ignored.

1. **Declare them.** Extend `LayoutProps` in the props interface, so that callers can pass them
   without a type error.
2. **Apply them to the rendered element.** Spread them onto a component that handles layout props
   itself, such as `box`, `hbox`, `vbox`, or `frame`. Or set them as the `style` of a DOM element.
   Never spread them onto a DOM element factory like `div` or `span`. React then renders each one
   as an HTML attribute, such as `width="150px"`, which CSS ignores.
3. **Flag an input as sizeable.** Inputs set `(MyInput as any).hasLayoutSupport = true` after the
   component definition. `FormField` reads this flag to size the input to the field. On desktop,
   an input with no `width` or `flex` of its own gets `flex: 1`, so it fills the field. Set the
   flag only on an input that applies its layout props as in step 2.

```typescript
const [layoutProps, restProps] = splitLayoutProps(props);

// ✅ A component that handles layout props itself
hbox({...layoutProps, className, items: children});

// ✅ The style of a DOM element
div({style: layoutProps, className, items: children});

// ❌ Each prop becomes an HTML attribute - the element renders at its natural size
div({...layoutProps, className, items: children});
```

The `style` form is safe because `getLayoutProps()` returns a style object. Each key is a CSS
property name, and the function converts each value to valid CSS (see the conversions above).
`Box`, `Card`, and `Badge` apply layout props as `style` in the same way.

Relay only the non-layout props (`getNonLayoutProps()`, or the second value from
`splitLayoutProps()`) to any inner component. Layout props then size the outer element only.

To check the result, inspect the rendered element in a browser. Each layout prop must appear in the
element's `style` attribute, not as an attribute of its own.

## Common Patterns

### Basic Application Layout (Desktop)

This desktop example shows how cross-platform layout components structure an application viewport:

```typescript
import {viewport, vframe, hframe, frame} from '@xh/hoist/cmp/layout';
import {appBar} from '@xh/hoist/desktop/cmp/appbar';

viewport({
    item: vframe({
        items: [
            appBar(),                         // Desktop navigation bar
            hframe({
                items: [
                    navPanel({width: 250}),   // Fixed-width sidebar
                    frame({item: mainContent()})  // Flexible main area
                ]
            })
        ]
    })
})
```

### Empty State with Placeholder

```typescript
import {placeholder} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';

// Detail panel shows placeholder when no selection
model.selectedRecord
    ? detailView({record: model.selectedRecord})
    : placeholder(Icon.user(), 'Select a user to view details')
```

When the first child of a placeholder is an icon, it receives special styling - enlarged, muted,
and spaced above the text - creating a polished empty-state UI with minimal code.

## Related Packages

- [`/core/`](../../core/README.md) - `hoistCmp.withFactory()`, `BoxProps` interface, `HoistProps`
- `/desktop/cmp/panel/` - Desktop Panel component with title bars and toolbars
- `/mobile/cmp/panel/` - Mobile Panel component
