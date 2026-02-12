# Form Package

## Overview

The `/cmp/form/` package works along with `/cmp/input` to provide Hoist's form infrastructure -
models and components for building data entry forms with validation, data binding, and state
management. Forms can range from simple single-field inputs to complex nested structures with
dynamic collections.

The form system consists of:
- **FormModel** - Top-level container managing field state, validation, and data
- **FieldModel** - Individual field state, value, and validation rules
- **SubformsFieldModel** - Fields containing collections of nested forms
- **Form** - non-visual React component providing context to child FormField components
- **FormFieldSet** - Visual container for grouping FormFields with aggregate validation display

Platform-specific FormField components (in `/desktop/cmp/form/` and `/mobile/cmp/form/`) connect
FieldModels to input components with labels, validation display, and layout.

## Architecture

```
FormModel
├── fields: Record<string, FieldModel>     # All fields by name
├── values: Proxy                          # Observable proxy to field values
├── disabled / readonly                    # Form-wide state
├── validationState                        # Aggregate validation
└── Methods: init(), reset(), getData(), setValues(), validateAsync()

FieldModel (extends BaseFieldModel)
├── name: string                           # Field identifier
├── displayName: string                    # User-facing label
├── value: any                             # Current value (observable)
├── initialValue: any                      # Value for reset
├── rules: Rule[]                          # Validation rules
├── disabled / readonly                    # Field-level state
├── validationState                        # 'Valid' | 'NotValid' | 'Unknown'
└── Methods: setValue(), reset(), validateAsync(), focus(), blur()

SubformsFieldModel (extends BaseFieldModel)
├── value: FormModel[]                     # Array of nested FormModels
├── subforms: FormConfig                   # Template for creating subforms
└── Methods: add(), remove()               # Collection management

FormFieldSetModel (extends CardModel)
├── disabled / readonly                    # Cascades to descendant FormFields
├── displayedSeverity                      # Aggregate validation severity
├── displayedValidationMessages            # Messages at current severity
├── parent: FormFieldSetModel              # Auto-set when nested
└── Internal: childFieldModels, childFormFieldSetModels
```

## FormModel

The main entry point for form specification and state management.

### Creating a FormModel

```typescript
import {FormModel} from '@xh/hoist/cmp/form';
import {required, lengthIs, numberIs} from '@xh/hoist/data';

const formModel = new FormModel({
    fields: [
        {name: 'firstName', rules: [required]},
        {name: 'lastName', rules: [required]},
        {
            name: 'email',
            displayName: 'Email Address',
            rules: [required, validEmail]
        },
        {
            name: 'age',
            initialValue: 18,
            rules: [numberIs({min: 0, max: 150})]
        },
        {
            name: 'bio',
            rules: [lengthIs({max: 500})]
        }
    ],
    initialValues: {
        firstName: 'John',
        lastName: 'Doe'
    }
});
```

### FormModel Configuration

| Property | Type | Description |
|----------|------|-------------|
| `fields` | `Array<FieldModel \| FieldConfig>` | Field definitions |
| `initialValues` | `PlainObject` | Initial values keyed by field name |
| `disabled` | `boolean` | Disable all fields |
| `readonly` | `boolean` | Make all fields read-only |
| `persistWith` | `FormPersistOptions` | Options for persisting form state |

### Working with Data

```typescript
// Initialize with new data (resets form)
formModel.init({firstName: 'Jane', lastName: 'Smith'});

// Update specific field values
formModel.setValues({firstName: 'Janet'});

// Get all current values
const data = formModel.getData();
// {firstName: 'Janet', lastName: 'Smith', email: null, age: 18, bio: null}

// Get only changed values
const changes = formModel.getData(true);  // dirtyOnly = true

// Reset to initial values
formModel.reset();

// Check if any field has changed
formModel.isDirty;  // boolean
```

### Accessing Field Values

The `values` proxy provides observable access to individual field values:

```typescript
// Track a specific field value
this.addReaction({
    track: () => formModel.values.country,
    run: country => this.loadStatesForCountry(country)
});

// Track any change to form data (without enumerating fields)
// Note in this case the `values` proxy is explicitly *not* used as it will not trigger on any change.
this.addReaction({
    track: () => formModel.getData(),
    run: data => this.onFormDataChange(data)
});

// Conditional logic based on values
const showShipping = formModel.values.requiresShipping;

// Cross-field references in validation
{
    name: 'confirmPassword',
    rules: [
        ({value}, values) =>
            value !== values.password ? 'Passwords must match' : null
    ]
}
```

### Validation

```typescript
// Check current validation state
formModel.validationState;  // 'Valid' | 'NotValid' | 'Unknown'
formModel.isValid;          // boolean shortcut
formModel.allErrors;        // string[] of all error messages

// Trigger validation and display errors
const isValid = await formModel.validateAsync({display: true});

// Display validation without re-running (e.g., on submit attempt)
formModel.displayValidation();

// Check if validation is still running (async rules)
formModel.isValidationPending;
```

### Focus Management

```typescript
// Get currently focused field
formModel.focusedField;  // FieldModel or undefined

// Focus a specific field
formModel.focusField('email');
```

## FieldModel

Individual field state and validation.

### Field Configuration

```typescript
{
    name: 'salary',                           // Required: unique field identifier
    displayName: 'Annual Salary',             // Used in FormField labels and validation messages
    initialValue: 0,                          // Default value (also used by reset())
    disabled: false,                          // Disable input
    readonly: false,                          // Read-only display
    rules: [required, numberIs({min: 0})]     // Validation rules (see below)
}
```

All config properties are observable and can be read or updated at runtime (e.g., `field.disabled = true`).

### Validation Rules

Rules can be specified as:
- Built-in constraints (from `/data/validation/`)
- Custom constraint functions
- Rule configs with conditional `when` clauses

```typescript
import {required, numberIs, lengthIs, validEmail} from '@xh/hoist/data';

// Simple constraint
{name: 'email', rules: [required, validEmail]}

// Constraint with config
{name: 'price', rules: [numberIs({min: 0, max: 1000000})]}

// Custom constraint function
{
    name: 'username',
    rules: [
        ({value}) => value?.includes(' ') ? 'No spaces allowed' : null
    ]
}

// Cross-field validation (second arg is form values proxy)
{
    name: 'endDate',
    rules: [
        ({value}, values) => {
            if (values.startDate && value && value < values.startDate) {
                return 'End date must be after start date';
            }
            return null;
        }
    ]
}

// Conditional rule (only validates when condition is true)
{
    name: 'companyName',
    rules: [
        {
            when: (field, values) => values.accountType === 'business',
            check: required
        }
    ]
}
```

### Observable State

| Property | Type | Description |
|----------|------|-------------|
| `value` | `any` | Current field value |
| `isDirty` | `boolean` | Has value changed since init/reset? |
| `isRequired` | `boolean` | Does field have active `required` rule? |
| `validationState` | `ValidationState` | `'Valid'`, `'NotValid'`, or `'Unknown'` |
| `isValid` | `boolean` | Shortcut for `validationState === 'Valid'` |
| `errors` | `string[]` | Current error messages |
| `validationDisplayed` | `boolean` | Should errors be shown in UI? |
| `hasFocus` | `boolean` | Is bound input focused? |

### FieldModel Methods

```typescript
// Update value
field.setValue('new value');

// Reset to initial value
field.reset();

// Initialize with new initial value
field.init('new initial');

// Focus/blur the bound input
field.focus();
field.blur();

// Validate and optionally display errors
await field.validateAsync({display: true});

// Trigger error display (without revalidating)
field.displayValidation();
```

## SubformsFieldModel

For fields containing collections of complex objects, each managed by its own FormModel.

### Creating a Subforms Field

```typescript
const orderFormModel = new FormModel({
    fields: [
        {name: 'orderId'},
        {name: 'customer'},
        {
            name: 'lineItems',
            subforms: {
                fields: [
                    {name: 'product', rules: [required]},
                    {name: 'quantity', rules: [required, numberIs({min: 1})]},
                    {name: 'price', rules: [required, numberIs({min: 0})]}
                ]
            },
            initialValue: []
        }
    ]
});
```

### Working with Subforms

```typescript
const lineItemsField = orderFormModel.getField('lineItems') as SubformsFieldModel;

// Add a new item
lineItemsField.add({
    initialValues: {product: '', quantity: 1, price: 0}
});

// Add at specific index
lineItemsField.add({index: 0, initialValues: {...}});

// Remove an item (pass the FormModel instance)
lineItemsField.remove(lineItemFormModel);

// Access subform array
const subforms = lineItemsField.value;  // FormModel[]

// Get all data (flattened)
const lineItemsData = lineItemsField.getData();  // PlainObject[]
```

### Subforms Validation

Validation bubbles up from subforms to the parent:

```typescript
// Parent field shows 'NotValid' if any subform is invalid
lineItemsField.validationState;

// All errors including subform errors
lineItemsField.allErrors;

// Validate all subforms
await lineItemsField.validateAsync({display: true});
```

## Form Component

The Form component provides React context for child FormField components. It is **non-visual** -
it does not render any DOM elements itself, only provides context that FormFields use to connect
to their FieldModels.

```typescript
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput, numberInput} from '@xh/hoist/desktop/cmp/input';

form({
    model: formModel,
    fieldDefaults: {
        inline: true,
        labelWidth: 120
    },
    items: [
        formField({field: 'firstName', item: textInput()}),
        formField({field: 'lastName', item: textInput()}),
        formField({field: 'age', item: numberInput()})
    ]
})
```

### Form Props

| Prop | Type | Description |
|------|------|-------------|
| `model` | `FormModel` | The form model (required) |
| `fieldDefaults` | `Partial<FormFieldProps>` | Default props for child FormFields |
| `testId` | `string` | Base testId for child fields |

## FormFieldSet

A visual container for grouping related `FormField` components. FormFieldSet extends
[Card](../card/Card.ts) to display aggregate validation state for all contained fields as
intent-colored borders and header tooltips (desktop only).

FormFieldSet is backed by `FormFieldSetModel`, which extends `CardModel` with:
- **Validation aggregation** - Collects validation results from all descendant FormFields and
  child FormFieldSets, computing the highest severity and associated messages.
- **`disabled` / `readonly` cascading** - Setting `disabled` or `readonly` on a FormFieldSetModel
  cascades to all descendant FormFields within the group.
- **Nesting** - FormFieldSets can be nested. Child sets register with their parent, and validation
  and disabled/readonly state cascade through the hierarchy.

### Basic Usage

```typescript
import {form} from '@xh/hoist/cmp/form';
import {formFieldSet, FormFieldSetModel} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput, numberInput} from '@xh/hoist/desktop/cmp/input';

form({
    model: formModel,
    items: [
        formFieldSet({
            title: 'Contact Information',
            icon: Icon.user(),
            items: [
                formField({field: 'firstName', item: textInput()}),
                formField({field: 'lastName', item: textInput()}),
                formField({field: 'email', item: textInput()})
            ]
        }),
        formFieldSet({
            title: 'Employment',
            icon: Icon.briefcase(),
            items: [
                formField({field: 'company', item: textInput()}),
                formField({field: 'salary', item: numberInput()})
            ]
        })
    ]
})
```

When validation errors are displayed for fields within a FormFieldSet, the set's border and header
change color to reflect the highest severity (danger for errors, warning for warnings, primary for
info). On desktop, the header also shows a tooltip listing the validation messages.

### Collapsible and Persistent

FormFieldSet inherits Card's collapsibility and persistence support:

```typescript
const contactFieldSetModel = new FormFieldSetModel({
    collapsible: true,
    defaultCollapsed: false,
    persistWith: {localStorageKey: 'contactFieldSet'}
});

formFieldSet({
    model: contactFieldSetModel,
    title: 'Contact Information',
    items: [/* ... */]
})
```

### Disabling / Read-only Groups

```typescript
const billingModel = new FormFieldSetModel({disabled: true});

// All FormFields within this set will be disabled
formFieldSet({
    model: billingModel,
    title: 'Billing (locked)',
    items: [
        formField({field: 'cardNumber', item: textInput()}),
        formField({field: 'expiry', item: textInput()})
    ]
})

// Toggle at runtime
billingModel.setDisabled(false);
billingModel.setReadonly(true);
```

### FormFieldSetModel Configuration

| Property | Type | Description |
|----------|------|-------------|
| `collapsible` | `boolean` | Can the set be collapsed? (false) |
| `defaultCollapsed` | `boolean` | Initial collapsed state (false) |
| `disabled` | `boolean` | Disable all descendant fields (false). Cascades through nested FormFieldSets. |
| `readonly` | `boolean` | Make all descendant fields read-only (false). Cascades through nested FormFieldSets. |
| `persistWith` | `PersistOptions` | Options for persisting collapsed state |

## Common Patterns

### Form in a Model

```typescript
class UserEditorModel extends HoistModel {
    @managed formModel = new FormModel({
        fields: [
            {name: 'name', rules: [required]},
            {name: 'email', rules: [required, validEmail]}
        ]
    });

    loadUser(user: User) {
        this.formModel.init(user);
    }

    async saveAsync() {
        const isValid = await this.formModel.validateAsync();
        if (!isValid) return;

        const data = this.formModel.getData();
        await XH.postJson({url: 'api/users', body: data});
    }
}
```

### Cascading Dropdowns

```typescript
class LocationFormModel extends HoistModel {
    @managed formModel = new FormModel({
        fields: [
            {name: 'country'},
            {name: 'state'},
            {name: 'city'}
        ]
    });

    @observable.ref states = [];
    @observable.ref cities = [];

    constructor() {
        super();
        makeObservable(this);

        this.addReaction(
            {
                track: () => this.formModel.values.country,
                run: async country => {
                    this.states = country ? await this.loadStates(country) : [];
                    this.formModel.setValues({state: null, city: null});
                }
            },
            {
                track: () => this.formModel.values.state,
                run: async state => {
                    this.cities = state ? await this.loadCities(state) : [];
                    this.formModel.setValues({city: null});
                }
            }
        );
    }
}
```

### Persisting Form State

```typescript
const formModel = new FormModel({
    fields: [...],
    persistWith: {
        localStorageKey: 'searchForm',
        includeFields: ['query', 'dateRange'],  // Only persist these
        // OR
        excludeFields: ['password']              // Persist all except these
    }
});
```

### Dynamic Field Visibility

```typescript
// In render
formField({
    field: 'companyName',
    item: textInput(),
    omit: formModel.values.accountType !== 'business'
})

// Field is still in model, just not rendered
// Validation with `when` clause handles conditional requirements
```

### Scrollable Form Content

Forms with many fields may overflow their containing Panel. Use Panel's `scrollable` prop
to enable vertical scrolling — this keeps toolbars and headers fixed while the form content scrolls:

```typescript
panel({
    title: 'User Profile',
    tbar: [saveButton(), resetButton()],
    scrollable: true,
    contentBoxProps: {padding: true},
    item: form({
        fieldDefaults: {inline: true},
        items: [
            formField({field: 'firstName', item: textInput()}),
            formField({field: 'lastName', item: textInput()}),
            formField({field: 'email', item: textInput()}),
            // ... many more fields
        ]
    })
})
```

The `scrollable` prop sets `overflowY: 'auto'` on the inner content frame — toolbars remain fixed
at the panel edges while form content scrolls independently. `padding: true` via `contentBoxProps`
provides standard app spacing around the form without affecting toolbar alignment.

See the [Panel README](../../desktop/cmp/panel/README.md#scrollable) for full documentation.

## Common Pitfalls

### Confusing `form` Imports

Two different `form` factories exist in Hoist:

```typescript
// ✅ Form context provider (this package) - non-visual, provides FormModel context
import {form} from '@xh/hoist/cmp/form';

// ❌ HTML <form> tag factory - renders an actual form element
import {form} from '@xh/hoist/cmp/layout';
```

The `form` from this package is the context provider for FormField components. It does not render
a DOM element. If you need an actual HTML `<form>` element (rare in Hoist apps), import it from
`/cmp/layout/` - but note this is uncommon since Hoist forms handle submission programmatically.

## Related Packages

- `/cmp/card/` - Card component that FormFieldSet extends
- [`/data/`](../../data/README.md) - Validation constraints (`required`, `numberIs`, etc.) and Rule class
- `/desktop/cmp/form/` - Desktop FormField component
- `/mobile/cmp/form/` - Mobile FormField component
- [`/cmp/input/`](../input/README.md) - Base input model and props; `/desktop/cmp/input/`, `/mobile/cmp/input/` for platform implementations
