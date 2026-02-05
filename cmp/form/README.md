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

- `/data/` - Validation constraints (`required`, `numberIs`, etc.) and Rule class
- `/desktop/cmp/form/` - Desktop FormField component
- `/mobile/cmp/form/` - Mobile FormField component
- `/desktop/cmp/input/`, `/mobile/cmp/input/` - Input components for use with FormField
