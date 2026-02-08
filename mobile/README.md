# Mobile Package

## Overview

The `/mobile/` package provides Hoist's mobile-specific UI components, built on [Onsen UI](https://onsen.io/).
These components extend the cross-platform foundation from `/cmp/` with touch-optimized styling,
gestures, and navigation patterns designed for mobile devices.

Mobile applications use components from both `/mobile/` and `/cmp/` - the mobile package adds
platform-specific wrappers, inputs, and navigation while leveraging shared models and logic from
the cross-platform package.

## Architecture

```
/mobile/
├── /appcontainer/    # Mobile app shell and lifecycle
│   ├── AppContainer  # Top-level app wrapper
│   ├── LoginPanel    # Authentication UI
│   ├── ImpersonationBar, VersionBar  # Chrome elements
│   ├── Dialogs (About, Feedback, Options)
│   └── /suspend/ (IdlePanel, SuspendPanel)
│
└── /cmp/             # Mobile-specific components
    ├── Input components (Select, DateInput, NumberInput, etc.)
    ├── Navigator (page-based navigation with pull-to-refresh)
    ├── Panel, DialogPanel, Header/AppBar, Toolbar
    ├── Button (+ grid sub-buttons: ColChooser, ColAutosize, ExpandCollapse)
    ├── Dialog, Popover, MenuButton
    ├── Grid/Tab implementations, PinPad
    ├── Card, Mask, Error display
    └── Form, Grouping, Store filter, ZoneGrid mapper
```

## Relationship to /cmp/

Mobile components extend cross-platform models and components:

| Cross-platform (`/cmp/`) | Mobile (`/mobile/cmp/`) |
|--------------------------|-------------------------|
| GridModel | Grid component with touch selection |
| TabContainerModel | TabContainer with swipeable tabs |
| FormModel, FieldModel | FormField with mobile inputs |
| Store, StoreFilterField | SearchInput for filtering |

**Example:** Grid uses `GridModel` from `/cmp/grid/` but renders with mobile-appropriate
selection behavior (disabled by default) and touch-optimized scrolling.

## AppContainer

The mobile `AppContainer` is the top-level wrapper for mobile Hoist applications. It is imported
and passed as `containerClass` to `XH.renderApp()`, which handles React rendering internally:

```typescript
import {XH} from '@xh/hoist/core';
import {AppContainer} from '@xh/hoist/mobile/appcontainer';
import {AppComponent} from '../mobile/AppComponent';
import {AppModel} from '../mobile/AppModel';

XH.renderApp({
    componentClass: AppComponent,
    modelClass: AppModel,
    containerClass: AppContainer,
    isMobileApp: true,
    checkAccess: 'APP_READER'
});
```

Nearly all mobile applications use the default `AppContainer` shipped with Hoist — custom
containers are the rare exception.

**AppContainer provides:**
- Application lifecycle management (authentication, initialization)
- Impersonation bar (for admin users)
- Version bar footer
- App-wide load mask
- Exception dialog
- Toast and message support
- Idle detection and app suspension (IdlePanel, SuspendPanel)

## Component Sub-Packages

### Navigator (`/cmp/navigator/`)

Route-based page navigation for mobile apps with animated transitions:

```typescript
import {navigator, NavigatorModel} from '@xh/hoist/mobile/cmp/navigator';

const navModel = new NavigatorModel({
    pages: [
        {id: 'home', content: () => homePage()},
        {id: 'detail', content: () => detailPage()},
        {id: 'settings', content: () => settingsPage()}
    ],
    track: true,
    pullDownToRefresh: true,
    transitionMs: 500  // default
});

navigator({model: navModel})
```

**NavigatorModel config:**
- `pages` - Array of `PageConfig` objects defining available pages
- `track` - Enable page view tracking via `TrackService`
- `pullDownToRefresh` - Enable pull-down gesture to trigger page refresh
- `transitionMs` - Transition animation duration (default 500ms)
- `renderMode` / `refreshMode` - Default strategies for all pages (overridable per-page)

**NavigatorModel properties:**
- `activePage` - The currently displayed `PageModel`
- `activePageId` - ID of the current page
- `stack` - Observable array of `PageModel` instances representing the navigation stack

**Navigation** is route-based, driven by Router5 routes and `XH.appendRoute()`:

```typescript
// Navigate forward by appending to the current route
XH.appendRoute('detail', {recordId: 123});

// Or navigate to an absolute route
XH.navigate('home.detail', {recordId: 123});

// Route parts are dot-separated page IDs that build a navigation stack:
// 'home'          → stack: [home]
// 'home.detail'   → stack: [home, detail]
```

**PageConfig** supports:
- `id` - Unique page ID, must match a configured Router5 route name
- `content` - Component to render
- `renderMode` / `refreshMode` - Per-page render/refresh strategy overrides
- `disableDirectLink` - Prevent deep-linking to this page in new sessions

The Navigator supports swipe-back gestures for backward navigation.

### Input Components (`/cmp/input/`)

Mobile form inputs with touch-optimized styling:

| Component | Description |
|-----------|-------------|
| `TextInput` | Single-line text entry |
| `TextArea` | Multi-line text entry |
| `NumberInput` | Numeric input optimized for touch |
| `DateInput` | Date picker with native mobile controls |
| `Select` | Selection with mobile-friendly picker. Supports `enableFullscreen` for full-screen selection on small devices, and async `queryFn` for server-side filtering |
| `Checkbox` | Checkbox control |
| `CheckboxButton` | Button-style checkbox |
| `SwitchInput` | Toggle switch |
| `ButtonGroupInput` | Segmented button selection |
| `SearchInput` | Search field with clear button |
| `Label` | Form label |

```typescript
import {textInput, select, searchInput} from '@xh/hoist/mobile/cmp/input';

formField({
    field: 'name',
    item: textInput({placeholder: 'Enter name...'})
}),
formField({
    field: 'category',
    item: select({options: categories})
})

// Search input for filtering
searchInput({
    value: model.searchQuery,
    onCommit: v => model.setSearchQuery(v)
})
```

### Panel (`/cmp/panel/`)

Mobile panel with header and toolbar support:

```typescript
import {panel} from '@xh/hoist/mobile/cmp/panel';

panel({
    title: 'User Details',
    icon: Icon.user(),
    headerItems: [refreshButton()],
    items: [userForm()],
    bbar: toolbar(saveButton()),
    scrollable: true,
    mask: 'onLoad'
})
```

The package also provides `dialogPanel` — a panel variant rendered as a full-screen dialog overlay,
useful for detail views or modal editing workflows.

### AppBar (`/cmp/header/`)

Page/panel header with title and action buttons:

```typescript
import {appBar} from '@xh/hoist/mobile/cmp/header';

appBar({
    title: 'Dashboard',
    leftItems: [backButton()],
    rightItems: [menuButton()]
})
```

AppBar also provides built-in back, refresh, and app menu buttons that can be shown/hidden
via `hideBackButton`, `hideRefreshButton`, and `hideAppMenuButton` props.

### Button (`/cmp/button/`)

Mobile buttons with touch-optimized hit areas:

```typescript
import {button} from '@xh/hoist/mobile/cmp/button';

button({text: 'Save', onClick: save})
button({icon: Icon.menu(), minimal: true})
```

### Toolbar (`/cmp/toolbar/`)

Toolbar container for mobile actions:

```typescript
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';

toolbar(
    button({text: 'Cancel', onClick: cancel}),
    filler(),
    button({text: 'Save', intent: 'primary', onClick: save})
)
```

### Tab Container (`/cmp/tab/`)

Tabbed interface with swipeable content:

```typescript
import {tabContainer} from '@xh/hoist/mobile/cmp/tab';
import {TabContainerModel} from '@xh/hoist/cmp/tab';

const tabModel = new TabContainerModel({
    tabs: [
        {id: 'list', title: 'List', content: listPanel},
        {id: 'map', title: 'Map', content: mapPanel}
    ]
});

tabContainer({model: tabModel})
```

### Dialog (`/cmp/dialog/`)

Mobile dialog/action sheet:

```typescript
import {dialog} from '@xh/hoist/mobile/cmp/dialog';

dialog({
    title: 'Confirm',
    isOpen: model.showConfirm,
    content: 'Are you sure?',
    buttons: [
        button({text: 'Cancel', onClick: () => model.setShowConfirm(false)}),
        button({text: 'OK', intent: 'primary', onClick: confirm})
    ]
})
```

### MenuButton (`/cmp/menu/`)

Button that opens a mobile action menu/popover:

```typescript
import {menuButton} from '@xh/hoist/mobile/cmp/menu';

menuButton({
    icon: Icon.ellipsisV(),
    menuItems: [
        {text: 'Edit', icon: Icon.edit(), actionFn: edit},
        {text: 'Delete', icon: Icon.delete(), actionFn: del}
    ]
})
```

Menu items are `MenuItemLike` objects with `text`, `icon`, and `actionFn` properties.

### Popover (`/cmp/popover/`)

Touch-triggered popover for additional content:

```typescript
import {popover} from '@xh/hoist/mobile/cmp/popover';

popover({
    item: button({icon: Icon.info()}),
    content: detailCard(),
    position: 'auto'
})
```

### Other Mobile Components

| Sub-package | Description |
|-------------|-------------|
| `/appOption/` | App-wide configuration options (theme, sizing mode, auto-refresh) |
| `/button/grid/` | Grid action buttons: `colAutosizeButton`, `colChooserButton`, `expandCollapseButton`, `expandToLevelButton` |
| `/button/zoneGrid/` | `zoneMapperButton` for ZoneGrid column configuration |
| `/card/` | Card header implementation |
| `/error/` | Error message display |
| `/form/` | FormField wrapper for mobile inputs |
| `/grid/` | Mobile grid with column chooser |
| `/grouping/` | Grouping chooser UI |
| `/mask/` | Loading mask overlay |
| `/pinpad/` | Numeric PIN entry pad |
| `/store/` | Store filter field component |
| `/zoneGrid/` | Zone mapper for ZoneGrid columns |

## Platform Differences

### Selection Behavior

Grid selection is **disabled by default** on mobile (vs single-select on desktop):

```typescript
// Desktop default: selModel: 'single'
// Mobile default: selModel: 'disabled'

// To enable selection on mobile
const gridModel = new GridModel({
    selModel: 'single',  // or 'multiple'
    ...
});
```

### Navigation Patterns

Desktop apps typically use side navigation or top tabs. Mobile apps often use:
- **Navigator** - Stack-based page navigation with back gestures
- **TabContainer** - Bottom tabs for primary navigation
- Combination of both

```typescript
// Common mobile pattern: tabs with navigator per tab
const appModel = new TabContainerModel({
    tabs: [
        {id: 'home', title: 'Home', icon: Icon.home(), content: homeNavigator},
        {id: 'search', title: 'Search', icon: Icon.search(), content: searchNavigator},
        {id: 'profile', title: 'Profile', icon: Icon.user(), content: profileNavigator}
    ]
});
```

### Touch Considerations

- Larger touch targets for buttons and interactive elements
- Swipe gestures for navigation and dismissal
- Pull-to-refresh patterns
- Native-feeling momentum scrolling

## Common Patterns

### Building a Mobile Page

```typescript
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {toolbar} from '@xh/hoist/mobile/cmp/toolbar';
import {button} from '@xh/hoist/mobile/cmp/button';
import {searchInput} from '@xh/hoist/mobile/cmp/input';
import {grid} from '@xh/hoist/mobile/cmp/grid';

const userListPage = hoistCmp.factory({
    model: uses(UserListModel),

    render({model}) {
        return panel({
            title: 'Users',
            headerItems: [
                button({icon: Icon.add(), onClick: () => model.addUser()})
            ],
            items: [
                searchInput({
                    bind: 'searchQuery',
                    placeholder: 'Search users...'
                }),
                grid({model: model.gridModel})
            ]
        });
    }
});
```

### Navigator with Detail Pages

```typescript
class AppModel extends HoistModel {
    @managed navModel = new NavigatorModel({
        pages: [
            {id: 'list', content: () => listPage({model: this})},
            {id: 'detail', content: () => detailPage()}
        ]
    });

    showDetail(recordId: string) {
        // Navigate via route - builds stack [list, detail]
        XH.navigate('list.detail', {recordId});
    }
}
```

### Form with Mobile Inputs

```typescript
import {form, formFieldSet} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/mobile/cmp/form';
import {textInput, select, switchInput, numberInput} from '@xh/hoist/mobile/cmp/input';

form({
    model: formModel,
    items: [
        formFieldSet({
            title: 'Basic Info',
            modelConfig: {collapsible: true},
            items: [
                formField({field: 'name', item: textInput({enableClear: true})}),
                formField({
                    field: 'customer',
                    item: select({
                        enableFullscreen: true,
                        queryFn: q => model.queryCustomersAsync(q)
                    })
                }),
                formField({field: 'active', item: switchInput()})
            ]
        }),
        formFieldSet({
            title: 'Financials',
            items: [
                formField({
                    field: 'salary',
                    item: numberInput({displayWithCommas: true})
                })
            ]
        })
    ]
})
```

## Common Pitfalls

### Importing desktop components in a mobile app

Mobile apps should import platform-specific components from `@xh/hoist/mobile/` and shared models
from `@xh/hoist/cmp/`. Accidentally importing from `@xh/hoist/desktop/` will pull in Blueprint
dependencies and desktop-styled components that won't render correctly in a mobile context.

```typescript
// ✅ Do: Import cross-platform components from /cmp/ and mobile components from /mobile/
import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {panel} from '@xh/hoist/mobile/cmp/panel';
import {textInput} from '@xh/hoist/mobile/cmp/input';
import {formField} from '@xh/hoist/mobile/cmp/form';

// ❌ Don't: Import desktop components in a mobile app
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {formField} from '@xh/hoist/desktop/cmp/form';
```

## Related Packages

- [`/cmp/`](../cmp/README.md) - Cross-platform components and models
- [`/desktop/`](../desktop/README.md) - Desktop platform components
- [`/core/`](../core/README.md) - HoistModel, hoistCmp, XH singleton
- `/kit/onsen/` - Onsen UI library wrappers
