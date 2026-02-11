# Panel

## Overview

Panel is the standard container for desktop Hoist application views. Nearly every screen in a Hoist
app is built from one or more Panels. Panel renders content in a vertical flexbox (`vframe`) with
optional header, top toolbar (`tbar`), bottom toolbar (`bbar`), and mask overlay.

Panels also support collapsing, resizing, and popping out to a modal dialog — all configured via
`PanelModel` and persistable if so configured.

## Basic Usage

```typescript
import {panel} from '@xh/hoist/desktop/cmp/panel';

// Minimal panel with title and content
panel({
    title: 'User Details',
    icon: Icon.user(),
    item: userForm()
})

// Panel wrapping a grid with toolbars
panel({
    title: 'Orders',
    icon: Icon.list(),
    tbar: [refreshButton(), filler(), storeFilterField()],
    item: grid(),
    bbar: toolbar({compact: true, items: [filler(), colChooserButton(), exportButton()]})
})
```

## Layout

Panel's internal layout is a `vframe` (vertical flexbox). Content flows top-to-bottom:

```
┌──────────────────────────┐
│  Header (title + icon)   │
├──────────────────────────┤
│  tbar                    │
├──────────────────────────┤
│                          │
│  children (items/item)   │  ← contentBoxProps targets this area
│                          │
├──────────────────────────┤
│  bbar                    │
└──────────────────────────┘
```

When no `width`, `height`, or `flex` is specified, Panel defaults to `flex: 'auto'`, allowing it to
fill available space within its parent container.

**Note:** Padding props (`padding`, `paddingTop`, etc.) are stripped from Panel. The header and
toolbars are designed to be flush with the panel edges — use `contentBoxProps` to apply padding to
the content area instead.

## contentBoxProps

The `contentBoxProps` prop provides direct control over the inner frame that wraps Panel's children.
This frame sits between the top and bottom toolbars and receives the CSS class
`xh-panel__content`. It defaults to `flexDirection: 'column'` with `flex: 'auto'` and
`overflow: 'hidden'` (the latter two inherited from the `frame()` layout primitive), matching
Panel's standard vertical layout.

Use `contentBoxProps` to apply padding, change flex direction, enable scrolling, or add custom
classes — without introducing extra wrapper elements or CSS overrides. Pass `className` within
`contentBoxProps` to add custom CSS classes to the content frame — these are merged with the base
`xh-panel__content` class.

```typescript
// Padded content — toolbars remain flush with panel edges
panel({
    title: 'Details',
    contentBoxProps: {padding: true},
    item: detailForm()
})

// Horizontal content layout
panel({
    title: 'Comparison',
    contentBoxProps: {flexDirection: 'row', gap: 5},
    items: [leftPane(), rightPane()]
})

// Scrollable content
panel({
    title: 'Log',
    contentBoxProps: {overflow: 'auto'},
    item: logOutput()
})
```

This mirrors the `contentBoxProps` API available on `Card`.

## Toolbars

The `tbar` and `bbar` props accept either a `toolbar()` element or a plain array. When an array is
provided, it is automatically wrapped in a `toolbar()`:

```typescript
// These are equivalent:
panel({tbar: toolbar([refreshButton(), filler(), exportButton()])})
panel({tbar: [refreshButton(), filler(), exportButton()]})
```

### Separator Shortcut

The string `'-'` can be used as a toolbar item to insert a visual separator. Consecutive separators
are automatically filtered out, which is useful when some controls between separators might be
`omit`ed due to user roles or other conditions:

```typescript
panel({
    tbar: [refreshButton(), '-', exportButton(), '-', colChooserButton()]
})
```

### Compact Toolbars

Use `compact: true` for reduced-height toolbars. This can be used to keep them more visually lightweight, especially in space constrained layouts such as dashboard views.

```typescript
panel({
    bbar: toolbar({
        compact: true,
        items: [filler(), colChooserButton(), exportButton()]
    })
})
```

### Right-Aligning Controls

Use `filler()` to push subsequent items to the right side of the toolbar:

```typescript
toolbar([
    storeFilterField(),     // left-aligned
    filler(),               // pushes everything after it to the right
    colChooserButton(),     // right-aligned
    exportButton()          // right-aligned
])
```

### Overflow Menu

Set `enableOverflowMenu: true` on a toolbar to collapse overflowing items into a dropdown menu.
This is useful for responsive layouts where toolbar width may be constrained. Only available for
horizontal toolbars.

## Panel + Grid Pattern

A common pattern in Hoist apps is a panel wrapping a grid with toolbars for filtering and
grid helper buttons. This example shows the typical structure drawn from real applications:

```typescript
const reportPanel = hoistCmp.factory<ReportModel>({
    render({model}) {
        return panel({
            title: 'Time Tracking',
            icon: Icon.clock(),
            compactHeader: true,
            tbar: [
                viewManager(),
                groupingChooser({flex: 10, maxWidth: 350}),
                filler(),
                storeCountLabel({unit: 'entry'}),
                '-',
                storeFilterField()
            ],
            item: grid(),
            bbar: toolbar({
                compact: true,
                items: [
                    filler(),
                    expandToLevelButton(),
                    colChooserButton(),
                    exportButton()
                ]
            }),
            mask: 'onLoad'
        });
    }
});
```

## Mask

The `mask` prop displays a loading overlay on the panel. It accepts several forms:

| Value | Behavior |
|-------|----------|
| `'onLoad'` | Binds to the context model's `loadObserver`. The model must implement `doLoadAsync` with LoadSupport enabled. See [`/core/README.md`](../../../core/README.md) for Load Support details. |
| `someTaskObserver` | Binds to a specific `TaskObserver` instance. |
| `[task1, task2]` | Binds to multiple `TaskObserver` instances — mask shows when any task is pending. |
| `mask({bind: ..., spinner: false})` | Full control via the `mask()` component factory. |
| `true` | Static mask, always displayed. |

**Recommended:** Use `mask: 'onLoad'` as the default choice when the panel's linked context model
has load support. This is the simplest and most common pattern:

```typescript
// Model implements doLoadAsync via @managed LoadSupport
panel({
    mask: 'onLoad',
    item: grid()
})

// Bind to a specific or multiple tasks for more targeted masking
panel({
    mask: [model.saveTaskObserver, model.deleteTaskObserver],
    item: grid()
})
```

When `'onLoad'` is specified, Panel looks up the nearest context model's `loadObserver` and creates
a mask with `spinner: true` bound to it. A warning is logged if the context model does not support
loading.

## Collapsing and Resizing

Collapse and resize behavior is configured via `PanelModel`, provided either as a `model` prop or
inline via `modelConfig`. When using `modelConfig`, Panel creates and manages the `PanelModel`
internally.

### Requirements

`PanelModel` requires both `defaultSize` and `side` when `collapsible` or `resizable` is true.
These tell the panel which dimension to control and which direction to collapse toward.

### Configuration

```typescript
// Collapsible side panel (most common pattern)
panel({
    title: 'Details',
    compactHeader: true,
    modelConfig: {
        collapsible: true,
        side: 'right',
        defaultSize: 380
    },
    item: detailView()
})

// Bottom detail panel with percentage sizing
panel({
    collapsedTitle: 'Details',
    collapsedIcon: Icon.detail(),
    compactHeader: true,
    modelConfig: {
        collapsible: true,
        side: 'bottom',
        defaultSize: '30%',
        persistWith: {localStorageKey: 'myDetailPanelModel'}
    },
    item: dashContainer()
})

// Constrained resize range
panel({
    modelConfig: {
        side: 'left',
        defaultSize: 300,
        minSize: 200,
        maxSize: 600
    },
    item: navTree()
})
```

### PanelModel Config Options

| Option | Default | Description |
|--------|---------|-------------|
| `collapsible` | `true` | Can the panel be collapsed? |
| `resizable` | `true` | Can the panel be resized by dragging? |
| `side` | — | Side toward which the panel collapses/shrinks (`'top'`, `'bottom'`, `'left'`, `'right'`). Relates to the panel's position within a parent `hbox` or `vbox`. |
| `defaultSize` | — | Default size in pixels (number) or percent (string, e.g. `'30%'`). Percentage is used for initial sizing only — once the user resizes, the size is stored in pixels (including when persisted). |
| `minSize` | `0` | Minimum resize size in pixels. |
| `maxSize` | `null` | Maximum resize size in pixels. |
| `defaultCollapsed` | `false` | Start collapsed? |
| `showSplitter` | `resizable \|\| collapsible` | Show a draggable splitter at the panel edge. |
| `showSplitterCollapseButton` | `showSplitter && collapsible` | Show collapse button on the splitter. |
| `showHeaderCollapseButton` | `true` | Show collapse button in the panel header (when `collapsible`). |
| `renderMode` | `'lazy'` | How collapsed content is rendered: `'lazy'` (render once, preserve), `'always'`, or `'unmountOnHide'`. |
| `refreshMode` | `'onShowLazy'` | How collapsed content is refreshed when re-expanded. |
| `resizeWhileDragging` | `false` | Redraw panel continuously during resize drag. |

### Collapse Behavior

- Double-clicking the header toggles collapse.
- When collapsed to left or right, the header rotates vertically, showing the collapsed title/icon.
- When collapsed to top or bottom, the header remains horizontal.
- The splitter collapse button provides an additional collapse/expand affordance.

## collapsedTitle / collapsedIcon

Always set `collapsedTitle` and `collapsedIcon` on collapsible panels so users can identify the
panel when collapsed. These default to the panel's `title` and `icon` but can be customized for a
more descriptive collapsed label:

```typescript
panel({
    title: `Time Tracking: ${model.datePeriodModel.periodDisplayName}`,
    icon: Icon.clock(),
    collapsedTitle: 'Details',
    collapsedIcon: Icon.detail(),
    compactHeader: true,
    modelConfig: {collapsible: true, side: 'bottom', defaultSize: '30%'},
    item: dashContainer()
})
```

## compactHeader

Use `compactHeader: true` for secondary or detail panels to create visual hierarchy. This reduces
the header's padding and font size, distinguishing it from primary panels with full-size headers:

```typescript
// Primary panel — full-size header (default)
panel({
    title: 'Positions Report',
    icon: Icon.portfolio(),
    item: hframe(
        gridPanel(),
        // Secondary panel — compact header
        panel({
            title: 'Contract Details',
            compactHeader: true,
            modelConfig: {collapsible: true, side: 'right', defaultSize: 400},
            item: detailGrid()
        })
    )
})
```

## headerItems

The `headerItems` prop places controls in the right side of the panel header, inline with the title.
This is useful for embedding lightweight status displays or contextual controls that relate to the
panel's content without taking up toolbar space:

```typescript
panel({
    title: 'Invoices',
    icon: invoiceIcon(),
    headerItems: [
        relativeTimestamp({prefix: 'Refreshed', timestamp: model.lastRefreshed}),
        select({bind: 'client', options: clientNames})
    ],
    item: grid()
})
```

Header items are hidden when the panel is collapsed — only the title, icon, and built-in
collapse/modal toggle buttons are shown in the collapsed header.

## Persistence

`PanelModel` supports persisting collapsed state and size via `persistWith`. This uses Hoist's
standard persistence system — collapsed/expanded state and drag-resized dimensions are restored
across sessions:

```typescript
panel({
    modelConfig: {
        side: 'bottom',
        defaultSize: '30%',
        persistWith: {localStorageKey: 'myDetailPanelModel'}
    },
    item: detailView()
})
```

The default persistence path is `'panel'`. Use the `path` option to disambiguate when multiple
panels persist via the same provider:

```typescript
panel({
    modelConfig: {
        side: 'right',
        defaultSize: 380,
        persistWith: {...model.persistWith, path: 'commentsPanel'}
    },
    item: commentView()
})
```

## Modal Support

Panels can pop out their content into a near-full-screen dialog while fully preserving state — no
re-render occurs. This is implemented via a DOM portal that moves the content between inline and
modal containers.

Enable via `modalSupport` in `modelConfig`:

```typescript
// Boolean — uses default 90vw x 90vh sizing
panel({
    modelConfig: {
        modalSupport: true,
        collapsible: false,
        resizable: false
    },
    bbar: toolbar({
        compact: true,
        items: [filler(), modalToggleButton()]
    }),
    item: chart({model: chartModel})
})

// Object config — custom sizing
panel({
    modelConfig: {
        modalSupport: {width: '95vw', height: '95vh'},
        defaultSize: '60%',
        side: 'bottom',
        collapsible: false
    },
    item: rateSheetForm()
})
```

### Modal Controls

- `modalToggleButton()` — Place in a toolbar to give users a button to toggle modal state. Shows
  an "open external" icon inline and a "close" icon when in modal state.
- `showModalToggleButton: true` (default when `modalSupport` is enabled) — Automatically adds a
  toggle button to the panel header.
- Double-clicking the header while in modal state closes the modal.

### ModalSupportConfig Options

| Option | Default | Description |
|--------|---------|-------------|
| `width` | `'90vw'` | Width of the modal dialog. |
| `height` | `'90vh'` | Height of the modal dialog. |
| `defaultModal` | `false` | Start in modal state? |
| `canOutsideClickClose` | `true` | Close modal when clicking outside? |

**Recommended for:** Charts, visualizations, document previews, and any panel in space-constrained
layouts like dashboards.

## Configuration Reference

### Panel Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `ReactNode` | Title text in the panel header. |
| `icon` | `ReactElement` | Icon in the panel header. |
| `collapsedTitle` | `ReactNode` | Title shown when collapsed. Defaults to `title`. |
| `collapsedIcon` | `ReactElement` | Icon shown when collapsed. Defaults to `icon`. |
| `compactHeader` | `boolean` | Reduced-size header styling. |
| `headerItems` | `ReactNode[]` | Items added to the right side of the header. |
| `headerClassName` | `string` | CSS class for the header element. |
| `tbar` | `ReactNode` | Top toolbar. Array auto-wrapped in `toolbar()`. |
| `bbar` | `ReactNode` | Bottom toolbar. Array auto-wrapped in `toolbar()`. |
| `contentBoxProps` | `BoxProps` | Props for the inner frame wrapping content items. |
| `mask` | `Some<TaskObserver> \| ReactElement \| boolean \| 'onLoad'` | Mask overlay specification. |
| `loadingIndicator` | `Some<TaskObserver> \| ReactElement \| boolean \| 'onLoad'` | Loading indicator (same forms as `mask`). |
| `model` | `PanelModel` | Explicit PanelModel for collapse/resize. |
| `modelConfig` | `PanelConfig` | Inline config — Panel creates PanelModel internally. |
| `contextMenu` | `ContextMenuSpec` | Right-click context menu. |
| `hotkeys` | `HotkeyConfig[]` | Keyboard shortcuts scoped to this panel. |

### PanelModel Config

See [Collapsing and Resizing](#collapsing-and-resizing) for the full `PanelConfig` options table.

## Common Pitfalls

### `mask: 'onLoad'` requires LoadSupport on the context model

Panel resolves `'onLoad'` by looking up the `loadObserver` on the nearest context model. If that
model does not implement `doLoadAsync` (and therefore has no `loadObserver`), the mask will
silently fail — no mask will appear, and a warning will be logged to the console. Ensure the model
linked to the panel has LoadSupport enabled, or bind to a specific `TaskObserver` instead.

```typescript
// ❌ Don't: model has no doLoadAsync — mask: 'onLoad' will not work
panel({
    mask: 'onLoad',
    item: grid()
})

// ✅ Do: bind to a specific TaskObserver when the model lacks LoadSupport
panel({
    mask: model.saveTask,
    item: grid()
})
```

### Collapsible panel without `collapsedTitle`

A collapsible panel that has no `title`, `collapsedTitle`, or `icon` will not render a header
when collapsed — it collapses down to just the splitter bar. This is supported and valid, but can
make it difficult for users to locate the collapsed panel and find the small control on the
splitter to re-expand it. Setting `collapsedTitle` and/or `collapsedIcon` ensures a visible,
identifiable header is always shown when collapsed.

```typescript
// ❌ Avoid: no title or collapsedTitle — collapses to splitter only
panel({
    modelConfig: {collapsible: true, side: 'right', defaultSize: 400},
    item: detailView()
})

// ✅ Better: collapsedTitle ensures the panel is identifiable when collapsed
panel({
    collapsedTitle: 'Details',
    collapsedIcon: Icon.detail(),
    modelConfig: {collapsible: true, side: 'right', defaultSize: 400},
    item: detailView()
})
```

## Key Source Files

| File | Description |
|------|-------------|
| `desktop/cmp/panel/Panel.ts` | Panel component — vframe layout, mask/toolbar parsing. |
| `desktop/cmp/panel/PanelModel.ts` | Collapse/resize state, persistence, modal support config. |
| `desktop/cmp/panel/impl/PanelHeader.ts` | Header rendering, collapsed title/icon switching. |
| `desktop/cmp/toolbar/Toolbar.ts` | Toolbar with separator shortcut, compact mode, overflow menu. |
| `desktop/cmp/modalsupport/ModalSupportModel.ts` | Modal pop-out config and state management. |
| `desktop/cmp/modalsupport/ModalSupport.ts` | Portal-based modal implementation. |
| `cmp/mask/Mask.ts` | Mask component with TaskObserver binding. |
