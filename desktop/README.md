# Desktop Package

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
| `Checkbox` | Boolean checkbox |
| `SwitchInput` | Toggle switch |
| `RadioInput` | Radio button group |
| `Slider` | Range slider |
| `ButtonGroupInput` | Segmented button selection |
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

Container for action buttons and controls:

```typescript
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';

toolbar(
    button({text: 'Add', icon: Icon.add()}),
    button({text: 'Edit', icon: Icon.edit()}),
    toolbarSep(),
    filler(),
    searchField()
)
```

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
        ...GridModel.defaultContextMenu
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

See `/desktop/cmp/dash/README.md` for complete dashboard documentation.

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

- [`/cmp/`](../cmp/README.md) - Cross-platform components and models
- `/mobile/` - Mobile platform components
- [`/core/`](../core/README.md) - HoistModel, hoistCmp, XH singleton
- `/kit/blueprint/` - Blueprint UI library wrappers
