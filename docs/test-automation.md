# Test Automation Support

Hoist provides built-in support for automated end-to-end testing via the `testId` prop and
`TestSupportProps` interface. These features allow test automation tools (Playwright, Cypress,
Selenium, etc.) to reliably locate and interact with components using stable `data-testid` HTML
attributes, rather than fragile selectors based on CSS classes, DOM structure, or display text that
can change across releases.

This document covers how `testId` is defined, how it propagates through the component tree, how
forms and inputs automatically generate testable selectors, and how to use `getTestId()` and
`XH.getModelByTestId()` to support testing workflows.

## TestSupportProps and the `testId` Prop

The foundation of Hoist's test support is the `TestSupportProps` interface, defined in
`core/HoistProps.ts`:

```typescript
export interface TestSupportProps {
    testId?: string;
}
```

This interface adds a single optional `testId` prop to any component that includes it. When
provided, the component renders a `data-testid` attribute on an appropriate DOM element -- typically
(but not always) the outermost tag in the component's rendered markup.

`TestSupportProps` is mixed into:

| Interface / Base | Effect |
|---|---|
| `BoxProps` | All layout components (`Box`, `VBox`, `HBox`, `Frame`, etc.) accept `testId` |
| `HoistInputProps` | All input components (`TextInput`, `Select`, `Checkbox`, etc.) accept `testId` |
| `RecordActionSpec` | Record actions (`RecordAction`) accept `testId` for action buttons |
| Component-specific props | `ButtonProps`, `PanelProps`, `GridProps`, `AppBarProps`, `TabSwitcherProps`, `FormProps`, `ChartProps`, `DataViewProps`, `BadgeProps`, `FormFieldSetProps`, and many others |

Because `BoxProps` extends `TestSupportProps`, and nearly every Hoist layout component is built on
`Box`, the vast majority of the component tree supports `testId` out of the box.

## How `testId` Becomes `data-testid`

Components translate `testId` into a `data-testid` HTML attribute using one of two patterns,
depending on the component's structure.

### Pattern 1: Via Box Layout (most components)

Components that render through `Box` (or `VBox`, `HBox`, `Frame`) have their `testId` handled
automatically. `Box` extracts `testId` from its props and applies `[TEST_ID]: testId` to the
underlying `div`:

```typescript
// From cmp/layout/Box.ts
let [layoutProps, {children, model, testId, ...restProps}] = splitLayoutProps(props);

restProps = mergeDeep(
    {style: {display: 'flex', overflow: 'hidden', position: 'relative'}},
    {style: layoutProps},
    {[TEST_ID]: testId},   // TEST_ID = 'data-testid'
    restProps
);
```

Components like `Panel`, `Grid`, `Chart`, `DataView`, `TabContainer`, `Clock`, and `Toolbar` all
pass their `testId` through to a layout container, which handles the attribute insertion.

### Pattern 2: Direct Attribute on Wrapped Element

Components that delegate to a third-party widget (e.g. Blueprint's `Button`, `Checkbox`,
`InputGroup`) apply the `data-testid` directly to the wrapped element:

```typescript
// From desktop/cmp/button/Button.ts
return bpButton({
    [TEST_ID]: testId,
    // ...other props
});
```

This pattern is used by `Button`, `ButtonGroup`, `AppBar`, `Badge`, `Checkbox`, `SwitchInput`,
`NumberInput`, `TextArea`, and other components that render through third-party UI libraries.

### The TEST_ID Constant

Both patterns use the `TEST_ID` constant (exported from `@xh/hoist/utils/js`) as a computed
property key:

```typescript
import {TEST_ID} from '@xh/hoist/utils/js';
// TEST_ID = 'data-testid'
```

This ensures consistency across the codebase and makes it easy to search for all places where
test attributes are applied.

## The `getTestId()` Utility

Hoist provides a `getTestId()` helper function (from `utils/js/TestUtils.ts`) for generating
derived testIds for child elements within composite components:

```typescript
function getTestId(propsOrTestId: HoistProps | string, suffix?: string): string
```

This function accepts either a props object (from which it reads the `testId` property) or a
testId string directly. When a `suffix` is provided, it returns `${testId}-${suffix}`. If no
testId is present, it returns `undefined`, so the child element simply has no test attribute.

### Usage Examples

```typescript
import {getTestId} from '@xh/hoist/utils/js';

// From a component's props object
getTestId(props, 'clear-btn')   // "my-input-clear-btn"  (if props.testId = "my-input")
getTestId(props, 'menu')        // "my-select-menu"      (if props.testId = "my-select")

// From a testId string directly
getTestId('settings-tabs', 'switcher')  // "settings-tabs-switcher"
getTestId('settings-tabs', 'general')   // "settings-tabs-general"
```

## Composite Components and Sub-TestIds

Several Hoist components automatically generate `testId` values for their internal elements when a
parent `testId` is set. This is a key feature: it means setting a single `testId` on a high-level
container can make an entire subtree of elements testable without any additional configuration.

### TabContainer

When a `TabContainer` receives a `testId`, it generates sub-testIds for:

- Each tab's content area: `${testId}-${tabId}`
- The tab switcher: `${testId}-switcher`
- Individual switcher tabs: `${testId}-switcher-${tabId}`
- Tab remove buttons: `${testId}-switcher-${tabId}-remove-btn`

```typescript
tabContainer({
    testId: 'settings',
    model: tabContainerModel,
    // Generates:
    //   data-testid="settings"               on the container
    //   data-testid="settings-general"        on the "general" tab content
    //   data-testid="settings-switcher"       on the tab switcher
    //   data-testid="settings-switcher-general" on the "general" switcher tab
});
```

### Form and FormField

The `Form` component accepts a `testId` and propagates it to all child `FormField` components by
deriving a testId from the field name. This is one of the most powerful test automation features
in Hoist -- a single `testId` on a `Form` makes every field in it addressable.

When a `Form` has `testId = "order-form"` and contains a `FormField` bound to a field named
`"quantity"`, the FormField automatically receives `testId = "order-form-quantity"`. The FormField
then further generates sub-testIds for its child input and readonly display:

- The FormField wrapper: `${formTestId}-${fieldName}`
- The input within the field: `${formTestId}-${fieldName}-input`
- The readonly display (if in readonly mode): `${formTestId}-${fieldName}-readonly-display`

```typescript
form({
    model: formModel,
    testId: 'order-form',
    items: [
        formField({field: 'customer'}),
        // Generates:
        //   data-testid="order-form-customer"           on the FormField wrapper
        //   data-testid="order-form-customer-input"     on the input element
        //   data-testid="order-form-customer-readonly-display"  (if readonly)

        formField({field: 'quantity'}),
        // Generates:
        //   data-testid="order-form-quantity"
        //   data-testid="order-form-quantity-input"
    ]
});
```

This automatic generation means QA engineers can write selectors like
`[data-testid="order-form-customer-input"]` without the application developer needing to manually
configure testIds on every field and input.

Note that the `testId` on the `Form` component does **not** render into the DOM directly -- `Form`
is a context provider, not a concrete visual component. The testId is stored in `FormContext` and
consumed by child `FormField` components.

Individual `FormField` components can also specify their own `testId` prop directly, which
overrides any auto-generated value from the parent `Form`.

### TextInput (Clear Button)

When `TextInput` has `enableClear` and a `testId`, the clear button receives
`${testId}-clear-btn`.

### DateInput (Sub-Elements)

`DateInput` generates testIds for its internal elements:

- The text input: the `testId` itself
- The clear button: `${testId}-clear`
- The calendar picker button: `${testId}-picker`

### Select (Menu)

`Select` generates a testId for its dropdown menu: `${testId}-menu`. It also generates
`${testId}-clear-btn` for the clear indicator button (when the select is clearable).

### RadioInput (Options)

`RadioInput` generates testIds for each radio option: `${testId}-${optionLabel}`, where
`optionLabel` is derived from the option's `label` property (not `value`). Note that labels
with spaces or special characters are included as-is — for example, an option with
`label: 'High Risk'` would generate `data-testid="my-radio-High Risk"`. This can be surprising
for test authors expecting normalized or slugified identifiers.

### GroupingChooser (Popover)

`GroupingChooser` generates testIds for its editor panel (`${testId}-editor`), favorites panel
(`${testId}-favorites`), and add-favorite button (`${testId}-favorites-add-btn`).

### RecordAction (Per-Record Buttons)

When a `RecordAction` has a `testId` and is rendered as an action column button, each row's button
gets `${testId}-${recordId}`.

### RestGrid (Built-in Actions)

`RestGrid` generates `${testId}-grid` for its inner `Grid` and `${testId}-form` for its inner
`RestForm`. It also pre-defines testIds on its built-in CRUD actions: `add-action-button`,
`edit-action-button`, `view-action-button`, `clone-action-button`, and `delete-action-button`.
The `RestForm` also passes its `testId` to the internal `Form`, enabling automatic field-level
testIds.

## XH.getModelByTestId()

For advanced testing scenarios, `XH.getModelByTestId()` provides programmatic access to model
instances from the browser console or test automation scripts:

```typescript
XH.getModelByTestId<GridModel>('positions-grid');  // returns the GridModel instance
```

This method queries the `InstanceManager`, which automatically registers models for a small set
of supported model types when their component receives a `testId`:

| Supported Model Type |
|---|
| `GridModel` |
| `DataViewModel` |
| `FormModel` |
| `TabModel` |

Registration happens when the component mounts and is cleaned up on unmount.

This is a powerful tool for test automation. Rather than simulating dozens of individual UI
interactions to get a view into a particular state, test code can use `getModelByTestId()` to
access model APIs directly and set up preconditions programmatically. For example, a test that
needs to verify behavior after a complex form is filled out can call `FormModel.init()` to
bulk-load field values in a single step, then use interactive selectors only for the specific
action it actually wants to test. Similarly, test code can call `GridModel.selectAsync()` to
select a record, read `GridModel.selectedRecord` to assert on selection state, or use
`TabContainerModel.activateTab()` to navigate — all without clicking through the UI.

This "model as test API" pattern lets tests skip expensive setup interactions and focus on the
behavior under test, making test suites both faster to execute and easier to maintain.

## Applying testId in Application Code

### Basic Usage

```typescript
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {grid} from '@xh/hoist/cmp/grid';
import {button} from '@xh/hoist/desktop/cmp/button';

panel({
    testId: 'positions-panel',
    title: 'Positions',
    tbar: [
        button({testId: 'refresh-btn', icon: Icon.refresh(), onClick: onRefresh}),
        button({testId: 'export-btn', text: 'Export', onClick: onExport})
    ],
    item: grid({
        testId: 'positions-grid',
        model: gridModel
    })
});
```

### Forms with Automatic TestIds

```typescript
import {form, formField} from '@xh/hoist/desktop/cmp/form';
import {numberInput, select, textArea} from '@xh/hoist/desktop/cmp/input';

form({
    model: formModel,
    testId: 'trade-form',
    items: [
        formField({field: 'counterparty', item: select({options: counterparties})}),
        formField({field: 'amount', item: numberInput()}),
        formField({field: 'notes', item: textArea()})
    ]
});
// QA can now select:
//   [data-testid="trade-form-counterparty-input"]
//   [data-testid="trade-form-amount-input"]
//   [data-testid="trade-form-notes-input"]
```

### TabContainers

```typescript
import {tabContainer} from '@xh/hoist/cmp/tab';

tabContainer({
    testId: 'main-tabs',
    model: tabContainerModel
    // Tabs with ids "summary", "details", "history" auto-generate:
    //   [data-testid="main-tabs-summary"]
    //   [data-testid="main-tabs-details"]
    //   [data-testid="main-tabs-history"]
    //   [data-testid="main-tabs-switcher"]
});
```

### Direct testId on Inputs (Outside Forms)

When inputs are used outside a `Form`/`FormField` structure, testId can be applied directly:

```typescript
textInput({
    testId: 'search-input',
    value: searchQuery,
    onChange: v => setSearchQuery(v)
});
// Renders data-testid="search-input" on the input element
// Clear button (if enabled) gets data-testid="search-input-clear-btn"
```

## Best Practices

### Tag Major Landmarks, Not Every Component

Focus `testId` on the components that test automation actually needs to find and interact with:

- **Grids, forms, and data views** — primary data containers that tests will query and assert against
- **Buttons and actions** — interactive elements that tests need to click
- **Tab containers** — navigation targets for switching views
- **Panels and key layout sections** — top-level landmarks that define the page structure
- **Standalone inputs** — search fields, filters, and other inputs outside of forms

There is no need to add `testId` to every `Box`, `HBox`, or layout wrapper — these are structural
and rarely targeted by tests. Similarly, inputs inside a `Form` with a `testId` get their own
selectors automatically via `FormField`, so there is no need to tag them individually.

### Use Descriptive, Stable Identifiers

Choose `testId` values that describe the component's role in the application, not its type or
position. Good testIds remain meaningful even if the UI is rearranged:

```typescript
// ✅ Do: Describe the component's purpose
grid({testId: 'open-orders-grid', model: gridModel})
button({testId: 'submit-trade-btn', text: 'Submit'})
form({testId: 'trade-entry-form', model: formModel})

// ❌ Don't: Use generic or positional names
grid({testId: 'grid1', model: gridModel})
button({testId: 'top-right-button', text: 'Submit'})
form({testId: 'form', model: formModel})
```

### Let Composite Components Do the Work

Take advantage of Hoist's automatic sub-testId generation. A single `testId` on a `Form` or
`TabContainer` makes its entire subtree addressable — there is no need to manually tag each
child. See [Composite Components and Sub-TestIds](#composite-components-and-sub-testids) for the
full list of components that support this.

## Mobile Platform Support

The core `testId` infrastructure — `TestSupportProps`, `BoxProps`, the `TEST_ID` constant, and
the `getTestId()` utility — is fully cross-platform. Any component that renders through `Box`
(including cross-platform components like `Grid`, `DataView`, and `Chart`) will apply its
`testId` as a `data-testid` attribute on both desktop and mobile.

However, the **advanced propagation features** described in
[Composite Components and Sub-TestIds](#composite-components-and-sub-testids) are currently
**desktop-only**. Specifically, the mobile implementations of the following components do not
yet propagate `testId` or generate sub-testIds:

- **Mobile `FormField`** — does not read `testId` from `FormContext` or generate `-input` /
  `-readonly-display` sub-testIds
- **Mobile `TabContainer`** — does not apply `testId` to the Onsen tabbar or generate per-tab
  sub-testIds
- **Mobile input components** (`TextInput`, `Select`, `NumberInput`, `DateInput`, `Checkbox`,
  `SwitchInput`, `TextArea`, `ButtonGroupInput`) — do not apply `testId` to their rendered elements

Closing these gaps is tracked in [#4239](https://github.com/xh/hoist-react/issues/4239).

## Writing Test Selectors

With `testId` attributes in place, test automation code can use straightforward CSS attribute
selectors:

```typescript
// Playwright example
await page.locator('[data-testid="trade-form-amount-input"]').fill('1000000');
await page.locator('[data-testid="refresh-btn"]').click();
await page.locator('[data-testid="main-tabs-switcher-details"]').click();

// Cypress example
cy.get('[data-testid="positions-grid"]').should('be.visible');
cy.get('[data-testid="trade-form-counterparty-input"]').type('Acme Corp');
```

These selectors are stable across UI refactors (CSS class changes, layout restructuring, text
changes) as long as the `testId` values remain the same.

## Common Pitfalls

### Not Setting testId on the Form

The automatic `FormField` testId generation only works when the parent `Form` component has a
`testId` set. Without it, individual `FormField` components will not have test attributes unless
they specify their own `testId` prop explicitly. Always set a `testId` on the `Form` if you want
field-level test selectors for free.

### Expecting testId on Every DOM Element

`testId` is applied to one "primary" DOM element per component -- typically the outermost
container. It is not applied to every internal element. If you need to target a specific internal
element (e.g. a label, an error message), use the component's auto-generated sub-testIds where
available, or fall back to CSS selectors scoped within the `data-testid` container:
`[data-testid="my-field"] .xh-form-field__label`.

### Confusing `testId` with the `[TEST_ID]` Constant

Application code should use the `testId` prop on Hoist components. The `[TEST_ID]` constant
(`'data-testid'`) is an internal implementation detail used to apply the HTML attribute to raw
DOM elements or third-party widgets. You should not typically need to use `TEST_ID` directly in
application code -- if you do, it means you are applying test attributes to a non-Hoist element
(e.g. a plain `div` factory), which is fine but uncommon.

### Duplicate testIds

`testId` values should be unique within the rendered component tree. Hoist does not enforce
uniqueness -- it is the application developer's responsibility. Duplicate testIds will cause
ambiguous selectors and unreliable test results.

### getModelByTestId Only Works for Certain Model Types

`XH.getModelByTestId()` only finds models of types registered with `InstanceManager`:
`GridModel`, `DataViewModel`, `FormModel`, and `TabModel`. Calling it with a `testId` assigned
to a `Button` or `Panel` will return `null`, because those components do not register their
models (or have no models at all).

## Key Source Files

| File | Purpose |
|---|---|
| [`core/HoistProps.ts`](../core/HoistProps.ts) | Defines `TestSupportProps` interface and `BoxProps` (which extends it) |
| [`utils/js/TestUtils.ts`](../utils/js/TestUtils.ts) | `TEST_ID` constant and `getTestId()` utility function |
| [`cmp/layout/Box.ts`](../cmp/layout/Box.ts) | Shows how `testId` is applied to layout containers |
| [`cmp/form/Form.ts`](../cmp/form/Form.ts) | `Form` component storing `testId` in context for child `FormField` components |
| [`desktop/cmp/form/FormField.ts`](../desktop/cmp/form/FormField.ts) | Desktop `FormField` with automatic testId generation from field names |
| [`desktop/cmp/button/Button.ts`](../desktop/cmp/button/Button.ts) | Example of `[TEST_ID]` applied directly to a third-party widget |
| [`desktop/cmp/input/TextInput.ts`](../desktop/cmp/input/TextInput.ts) | Input with sub-testId on clear button |
| [`desktop/cmp/input/Select.ts`](../desktop/cmp/input/Select.ts) | Input with sub-testId on dropdown menu and clear button |
| [`desktop/cmp/input/RadioInput.ts`](../desktop/cmp/input/RadioInput.ts) | Input with sub-testIds derived from option labels |
| [`desktop/cmp/tab/impl/TabContainer.ts`](../desktop/cmp/tab/impl/TabContainer.ts) | TabContainer with sub-testIds for tabs and switcher |
| [`desktop/cmp/rest/RestGrid.ts`](../desktop/cmp/rest/RestGrid.ts) | RestGrid with sub-testIds for inner grid and form |
| [`desktop/cmp/grouping/GroupingChooser.ts`](../desktop/cmp/grouping/GroupingChooser.ts) | GroupingChooser with sub-testIds for editor and favorites |
| [`core/impl/InstanceManager.ts`](../core/impl/InstanceManager.ts) | Registers models by testId for `XH.getModelByTestId()` |
| [`core/XH.ts`](../core/XH.ts) | `getModelByTestId()` API on the `XH` singleton |
| [`desktop/cmp/rest/Actions.ts`](../desktop/cmp/rest/Actions.ts) | RestGrid built-in actions with pre-defined testIds |

## See Also

- [`/cmp/`](../cmp/README.md) -- Overview of Hoist's cross-platform component architecture
- [`/cmp/form/`](../cmp/form/README.md) -- Form infrastructure, FormModel, and FieldModel
- [`/cmp/input/`](../cmp/input/README.md) -- Input base classes and the change/commit lifecycle
- [`/utils/`](../utils/README.md) -- General-purpose utilities including `TestUtils`
