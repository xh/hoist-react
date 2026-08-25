# Desktop Package

| Section | Description |
|---------|-------------|
| [Overview](#overview) | Desktop platform, Blueprint foundation |
| [Architecture](#architecture) | Directory structure and key sub-packages |
| [Relationship to /cmp/](#relationship-to-cmp) | Platform-specific vs. cross-platform components |
| [AppContainer](#appcontainer) | Desktop app shell and lifecycle |
| [Component Sub-Packages](#component-sub-packages) | Panel, Toolbar, Button, Grid, Dashboard, Tabs, Inputs, and more |
| [Dialogs](#dialogs) | Custom modal dialogs via Blueprint Kit export |
| [Desktop Hooks](#desktop-hooks) | useContextMenu |
| [Common Patterns](#common-patterns) | Blueprint wrappers, Popover, ContextMenu |
| [Related Packages](#related-packages) | Links to cross-platform and utility packages |

## Overview

The `/desktop/` package provides Hoist's desktop-specific UI components, incorporating the
[Blueprint](https://blueprintjs.com/) UI library for a number of key components (buttons, inputs,
dialogs, popovers, and more). These components extend the cross-platform foundation from `/cmp/`
with desktop-appropriate styling, interactions, and features optimized for mouse/keyboard input and
larger screens.

Desktop applications use components from both `/desktop/` and `/cmp/` - the desktop package adds
platform-specific wrappers, inputs, and UI chrome while leveraging shared models and logic from
the cross-platform package.

## Architecture

```
/desktop/
├── /appcontainer/    # Desktop app shell and lifecycle
│   ├── AppContainer  # Top-level app wrapper
│   ├── LoginPanel    # Username/password auth UI (edge case - most apps use OAuth)
│   ├── ImpersonationBar, VersionBar  # Chrome elements
│   └── Dialogs (About, Changelog, Feedback, Options)
│
├── /cmp/             # Desktop-specific components
│   ├── Input components (Select, DateInput, NumberInput, etc.)
│   ├── Panel, Toolbar, Button variants
│   ├── Grid extensions (editors, column chooser, filters)
│   ├── Dash (dashboard/canvas system)
│   └── Platform-specific UI (dock, leftrightchooser, etc.)
│
└── /hooks/           # Desktop React hooks
    └── useContextMenu, useHotkeys
```

## Relationship to /cmp/

Desktop components extend cross-platform models and components:

| Cross-platform (`/cmp/`) | Desktop extensions (`/desktop/cmp/`) |
|--------------------------|--------------------------------------|
| GridModel, Grid | Cell editors, column chooser, filter dialogs |
| TabContainerModel | TabContainer with Blueprint tab styling |
| FormModel, FieldModel | FormField wrapper with desktop inputs |
| ChartModel, Chart | Context menu integration |
| Store, StoreFilterField | StoreFilterField with text input |

**Example:** Grid uses `GridModel` from `/cmp/grid/` but renders with desktop-specific column
chooser dialogs, filter UIs, and cell editors from `/desktop/cmp/grid/`.

## AppContainer

The desktop `AppContainer` is the top-level wrapper for desktop Hoist applications. It is imported
and passed as `containerClass` to `XH.renderApp()`, which handles React rendering internally:

```typescript
import {XH} from '@xh/hoist/core';
import {AppContainer} from '@xh/hoist/desktop/appcontainer';
import {AppComponent} from '../desktop/AppComponent';
import {AppModel} from '../desktop/AppModel';

XH.renderApp({
    componentClass: AppComponent,
    modelClass: AppModel,
    containerClass: AppContainer,
    isMobileApp: false,
    checkAccess: 'APP_READER'
});
```

Nearly all desktop applications use the default `AppContainer` shipped with Hoist — custom
containers are the rare exception.

**AppContainer provides:**
- Application lifecycle management (authentication, initialization)
- Impersonation bar (for admin users)
- Version bar footer
- App-wide load mask
- Global hotkeys (Shift+R refresh, Shift+I impersonate, Shift+O options)
- Exception dialog
- Toast and message support
- Context menu suppression (optional)

## Component Sub-Packages

### Input Components (`/cmp/input/`)

Desktop form inputs with Blueprint styling:

| Component | Description |
|-----------|-------------|
| `TextInput` | Single-line text entry |
| `TextArea` | Multi-line text entry |
| `NumberInput` | Numeric input with increment/decrement |
| `DateInput` | Date picker with calendar popup |
| `Select` | Dropdown/autocomplete selection |
| `Picker` | Popover-based option picker for space-constrained areas |
| `Checkbox` | Boolean checkbox |
| `SwitchInput` | Toggle switch |
| `RadioInput` | Radio button group |
| `Slider` | Range slider |
| `ButtonGroupInput` | Segmented button selection |
| `SegmentedControl` | Toggle group for mutually exclusive options with strong visual differentiation of the active selection |
| `CodeInput` | Code editor with syntax highlighting |
| `JsonInput` | JSON editor with validation |

```typescript
import {textInput, select, dateInput} from '@xh/hoist/desktop/cmp/input';

formField({
    field: 'name',
    item: textInput()
}),
formField({
    field: 'category',
    item: select({options: categories})
}),
formField({
    field: 'startDate',
    item: dateInput({enableClear: true})
})
```

`Picker` is designed for space-constrained areas like toolbars, especially for multi-select
scenarios where `Select` with its tag-picker style is too wide. It renders as a button that opens
a popover checklist, with built-in multi-select summarization.

Set `compact: true` to scale both the trigger button and popover list for use in compact toolbars
or other even tighter layouts.

```typescript
import {picker} from '@xh/hoist/desktop/cmp/input';

// Multi-select in a toolbar — button shows "3 selected"
picker({
    model: myModel,
    bind: 'selectedRegions',
    options: regions,
    enableMulti: true,
    enableClear: true,
    placeholder: 'Regions...'
})
```

### Panel (`/cmp/panel/`)

Desktop panel with title bar, toolbars, and collapsible behavior:

```typescript
import {panel} from '@xh/hoist/desktop/cmp/panel';

panel({
    title: 'User Details',
    icon: Icon.user(),
    tbar: toolbar(refreshButton(), exportButton()),
    bbar: toolbar(filler(), saveButton()),
    items: [userForm()]
})
```

**Panel features:**
- Title bar with icon
- Top bar (`tbar`) and bottom bar (`bbar`)
- Collapsible with animated transitions
- Mask support for loading states

See [`/desktop/cmp/panel/README.md`](./cmp/panel/README.md) for detailed Panel documentation
covering toolbars, masks, collapse/resize, persistence, and modal support.

### Toolbar (`/cmp/toolbar/`)

Horizontal (or vertical) container for action buttons and controls. Toolbars are typically
placed in a Panel's `tbar` (top) or `bbar` (bottom) slots. Use `filler()` to push items to
the right side, and `'-'` (shortcut for `toolbarSep()`) for visual dividers.

```typescript
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {filler} from '@xh/hoist/cmp/layout';

toolbar({
    items: [
        button({text: 'Add', icon: Icon.add()}),
        button({text: 'Edit', icon: Icon.edit()}),
        '-',        // separator token — shorthand for toolbarSep()
        filler(),
        searchField()
    ]
})
```

Key props:
- `compact` - reduced height and font size (useful in dense UIs)
- `vertical` - stack items vertically instead of horizontally
- `enableOverflowMenu` - collapse items that don't fit into a dropdown menu
- `collapseFrom` - `'start'` or `'end'` (default) for overflow direction
- `minVisibleItems` - minimum items to keep visible before overflowing

`Toolbar.defaults.compact` can be set at bootstrap for app-wide compact toolbars.

### Button (`/cmp/button/`)

Desktop buttons with Blueprint styling:

```typescript
import {button} from '@xh/hoist/desktop/cmp/button';

button({text: 'Save', icon: Icon.check(), intent: 'primary'})
button({icon: Icon.refresh(), minimal: true, onClick: refresh})
```

### Grid Extensions (`/cmp/grid/`)

Desktop-specific grid features:

- **Cell editors** - TextEditor, NumberEditor, DateEditor, SelectEditor
- **Column chooser** - Dialog for showing/hiding/reordering columns
- **Filter dialog** - UI for column-level filters
- **Context menus** - Right-click actions on rows/cells

```typescript
import {grid} from '@xh/hoist/desktop/cmp/grid';
import {textEditor, numberEditor} from '@xh/hoist/desktop/cmp/grid';

const gridModel = new GridModel({
    colChooserModel: true,
    filterModel: true,
    columns: [
        {field: 'name', editable: true, editor: textEditor()},
        {field: 'value', editable: true, editor: numberEditor({min: 0})}
    ]
});

grid({model: gridModel})
```

Grid context menus are configured via the `contextMenu` property on GridModel. Place app-specific
actions at the top, separated from the default grid menu items:

```typescript
const gridModel = new GridModel({
    contextMenu: [
        {
            text: 'View Details',
            icon: Icon.detail(),
            recordsRequired: true,
            actionFn: ({record}) => showDetail(record)
        },
        {
            text: 'Create Invoice',
            icon: invoiceIcon(),
            recordsRequired: true,
            displayFn: () => ({hidden: !XH.getUser().hasRole('CREATE_INVOICES')}),
            actionFn: ({selectedRecords}) => createInvoice(selectedRecords)
        },
        '-',
        ...GridModel.defaults.contextMenu
    ],
    columns: [...]
});
```

See [`/cmp/grid/README.md`](../cmp/grid/README.md) for comprehensive GridModel documentation
covering columns, sorting, grouping, filtering, selection, inline editing, and export.

### Dashboard (`/cmp/dash/`)

Configurable dashboard system with draggable, resizable widgets:

```typescript
import {DashContainerModel, dashContainer} from '@xh/hoist/desktop/cmp/dash';

const dashModel = new DashContainerModel({
    viewSpecs: [
        {id: 'chart', title: 'Chart', content: () => chartPanel()},
        {id: 'grid', title: 'Grid', content: () => gridPanel()},
        {id: 'summary', title: 'Summary', content: () => summaryPanel()}
    ]
});

dashContainer({model: dashModel})
```

See [`/desktop/cmp/dash/README.md`](./cmp/dash/README.md) for complete dashboard documentation.

### Tab Container (`/cmp/tab/`)

Tabbed interface with Blueprint styling:

```typescript
import {tabContainer} from '@xh/hoist/desktop/cmp/tab';
import {TabContainerModel} from '@xh/hoist/cmp/tab';

const tabModel = new TabContainerModel({
    tabs: [
        {id: 'overview', title: 'Overview', content: overviewPanel},
        {id: 'details', title: 'Details', content: detailsPanel}
    ]
});

tabContainer({model: tabModel})
```

See [`/cmp/tab/README.md`](../cmp/tab/README.md) for full TabContainerModel documentation covering
routing integration, render/refresh modes, and dynamic tab management.

### Dock (`/cmp/dock/`)

Dockable panel system for tool windows:

```typescript
import {dockContainer, DockContainerModel} from '@xh/hoist/desktop/cmp/dock';

const dockModel = new DockContainerModel({
    views: [
        {id: 'inspector', title: 'Inspector', content: inspectorPanel}
    ]
});

dockContainer({model: dockModel})
```

### Left-Right Chooser (`/cmp/leftrightchooser/`)

Dual-list selection interface:

```typescript
import {leftRightChooser, LeftRightChooserModel} from '@xh/hoist/desktop/cmp/leftrightchooser';

const model = new LeftRightChooserModel({
    leftTitle: 'Available',
    rightTitle: 'Selected',
    data: items
});

leftRightChooser({model})
```

### Other Desktop Components

| Sub-package | Description |
|-------------|-------------|
| `/appbar/` | Application bar with branding and navigation |
| `/appOption/` | App-wide configuration options UI |
| `/clipboard/` | Clipboard operations (copy with feedback) |
| `/contextmenu/` | Right-click context menu support |
| `/filechooser/` | File selection input |
| `/filter/` | Filter chooser and filter editor |
| `/form/` | FormField wrapper for desktop inputs |
| `/grouping/` | Grouping chooser UI |
| `/modalsupport/` | Panel modal pop-out support (see [Panel README](./cmp/panel/README.md#modal-support)) |
| `/record/` | Record action buttons and menus |
| `/rest/` | REST data editor grid |
| `/store/` | Store filter field component |
| `/viewmanager/` | View save/load UI |
| `/zoneGrid/` | Zone mapper for ZoneGrid columns |

## Dialogs

For simple alerts and confirmations, use the built-in `XH.message()` and `XH.confirm()` methods
(see the [appcontainer README](../appcontainer/README.md#messages)).

For custom dialogs with rich content (forms, grids, etc.), use the Blueprint `dialog` element
factory from `@xh/hoist/kit/blueprint`. This is the standard Hoist pattern for modal dialogs -
Blueprint's Dialog is re-exported through Kit with transitions disabled for snappy rendering.

The typical pattern uses a dedicated model to manage the dialog's open/closed state and content,
with the parent component always rendering the dialog component alongside its other children.
The dialog renders as a Blueprint portal overlay when open and returns null when closed, so it
can be included unconditionally in the parent's item list.

```typescript
// TaskDialogModel.ts - manages dialog open/closed state and form data
export class TaskDialogModel extends HoistModel {
    @observable isOpen = false;

    @managed formModel = new FormModel({
        fields: [{name: 'description', rules: [required]}]
    });

    @action
    open(initialValues?) {
        this.isOpen = true;
        this.formModel.init(initialValues);
    }

    @action
    close() { this.isOpen = false; }
}

// TaskDialog.ts - the dialog component, rendered by the parent
export const taskDialog = hoistCmp.factory({
    model: uses(TaskDialogModel),
    render({model}) {
        if (!model.isOpen) return null;
        return dialog({
            title: 'Edit Task',
            style: {width: 500},
            isOpen: true,
            onClose: () => model.close(),
            item: panel({
                item: form(
                    formField({field: 'description', item: textInput()})
                ),
                bbar: toolbar({
                    items: [filler(), button({text: 'Save', intent: 'primary'})]
                })
            })
        });
    }
});

// TodoPanel.ts - the parent component that owns and renders the dialog
export class TodoPanelModel extends HoistModel {
    @managed taskDialogModel = new TaskDialogModel();
    @managed gridModel = new GridModel({...});
}

export const todoPanel = hoistCmp.factory({
    model: creates(TodoPanelModel),
    render({model}) {
        return panel({
            tbar: toolbar({
                items: [
                    button({
                        text: 'New Task',
                        icon: Icon.add(),
                        onClick: () => model.taskDialogModel.open()
                    })
                ]
            }),
            items: [
                grid(),
                taskDialog()   // Always rendered - shows/hides based on isOpen
            ]
        });
    }
});
```

Key points:
- Import `dialog` from `@xh/hoist/kit/blueprint` (not from Blueprint directly) to get
  Hoist's transition-disabled wrapper.
- The parent model owns the dialog model as a `@managed` property and calls `open()`/`close()`.
- The parent component renders the dialog factory in its `items` alongside other children -
  the dialog shows/hides itself based on its model's `isOpen` state.
- Use `onClose` to handle the dialog's close button and outside-click-to-close.
- Wrap dialog content in a `panel()` when you need toolbars, masks, or standard layout.

Note: Hoist does not yet provide its own first-class Dialog component wrapper
([#861](https://github.com/xh/hoist-react/issues/861)) - the Blueprint Kit re-export is the
established pattern used throughout the framework and applications.

## Desktop Hooks

### useContextMenu

Attaches a context menu to a component:

```typescript
import {useContextMenu} from '@xh/hoist/desktop/hooks';

const MyComponent = hoistCmp({
    render() {
        const el = div('Right-click me');
        return useContextMenu(el, [
            {text: 'Copy', action: copy},
            '-',
            {text: 'Delete', action: del, intent: 'danger'}
        ]);
    }
});
```

### useHotkeys

Registers keyboard shortcuts:

```typescript
import {useHotkeys} from '@xh/hoist/desktop/hooks';

const MyComponent = hoistCmp({
    render() {
        const el = div('Press Ctrl+S');
        return useHotkeys(el, [
            {combo: 'ctrl+s', label: 'Save', onKeyDown: save}
        ]);
    }
});
```

## Common Patterns

### Building a Desktop Panel

```typescript
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {grid} from '@xh/hoist/desktop/cmp/grid';

const userListPanel = hoistCmp.factory({
    model: uses(UserListModel),

    render({model}) {
        return panel({
            title: 'Users',
            icon: Icon.users(),
            tbar: toolbar(
                button({text: 'Add', icon: Icon.add(), onClick: () => model.addUser()}),
                button({text: 'Edit', icon: Icon.edit(), onClick: () => model.editUser()}),
                '-',
                button({
                    text: 'Delete',
                    icon: Icon.delete(),
                    intent: 'danger',
                    onClick: () => model.deleteUser(),
                    omit: !XH.getUser().hasRole('DELETE_USER')
                }),
                filler(),
                storeFilterField()
            ),
            item: grid(),
            mask: 'onLoad'
        });
    }
});
```

### Form with Desktop Inputs

```typescript
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput, select, dateInput} from '@xh/hoist/desktop/cmp/input';

form({
    model: formModel,
    items: [
        formField({field: 'name', item: textInput()}),
        formField({field: 'role', item: select({options: roles})}),
        formField({field: 'startDate', item: dateInput()})
    ]
})
```

## Related Packages

- [`/appcontainer/`](../appcontainer/README.md) - Shared AppContainer models (messages, toasts, banners, theming, routing)
- [`/cmp/`](../cmp/README.md) - Cross-platform components and models
- [`/mobile/`](../mobile/README.md) - Mobile platform components
- [`/core/`](../core/README.md) - HoistModel, hoistCmp, XH singleton
- [`/kit/`](../kit/README.md) - Third-party library wrappers (Blueprint, ag-Grid, Highcharts, etc.)
