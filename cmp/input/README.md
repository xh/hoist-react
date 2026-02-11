# Input Package

## Overview

The `/cmp/input/` package provides the base classes and interfaces for Hoist input components.
These abstractions define the common behavior for all form inputs across platforms, including
value binding, change/commit lifecycle, focus management, and validation display.

Platform-specific input implementations in `/desktop/cmp/input/` and `/mobile/cmp/input/` extend
these base classes to provide concrete UI components like TextInput, Select, DateInput, etc.

## Architecture

```
HoistInputProps (interface)
├── bind: string          # Property name on model to bind to
├── value: any            # Direct value (alternative to binding)
├── disabled: boolean     # Disable user interaction
├── onChange: callback    # Called on every value change
├── onCommit: callback    # Called when value is committed
└── tabIndex: number      # Focus order

HoistInputModel (class)
├── hasFocus: boolean     # Is input focused?
├── renderValue: any      # Value to render (computed)
├── externalValue: any    # Value from bound model or props
├── internalValue: any    # Cached internal representation
├── commitOnChange: bool  # Commit immediately on change?
├── Methods:
│   ├── focus(), blur(), select()
│   ├── noteValueChange(), doCommit()
│   ├── toExternal(), toInternal()
│   └── noteBlurred(), noteFocused()
└── DOM access:
    ├── domEl: HTMLElement
    └── inputEl: HTMLInputElement
```

## HoistInputModel

The local model powering input components. Manages value conversion, commit lifecycle, and
focus state.

### Key Concepts

**Bound vs Controlled Mode:**
- **Bound mode**: Input reads/writes to a model property via `model` and `bind` props
- **Controlled mode**: Input uses `value` prop directly

```typescript
// Bound mode - connects to FieldModel via FormField
formField({field: 'email', item: textInput()})

// Also bound mode - direct binding to any HoistModel
textInput({model: myModel, bind: 'searchQuery'})

// Controlled mode - explicit value management
textInput({
    value: model.query,
    onChange: (v) => model.setQuery(v)
})
```

**Change vs Commit:**
- `onChange` fires on every value change (typing, selection)
- `onCommit` fires when user completes a discrete edit (blur, enter, selection)
- For model binding, values are written on commit, not on every change
- Some inputs (checkbox, switch, select) inherently commit on every change - there's no way to
  change without committing

```typescript
// For text inputs, commit happens on blur or Enter
textInput({
    bind: 'name',
    model: myModel,
    onChange: (v) => console.log('typing:', v),   // Fires on each keystroke
    onCommit: (v) => console.log('committed:', v) // Fires on blur/Enter
})

// This can be controlled via commitOnChange prop where supported
textInput({
    commitOnChange: true  // Commit immediately on change
})
```

### Value Conversion

Inputs can convert between internal and external representations:

```typescript
// Simplified example - NumberInput converts string input to numbers
// (Actual Hoist implementation handles additional formatting, precision, etc.)
class NumberInputModel extends HoistInputModel {
    toExternal(internal: string): number {
        return parseFloat(internal) || null;
    }

    toInternal(external: number): string {
        return external?.toString() ?? '';
    }
}
```

### Focus Management

```typescript
// Access from component ref
const inputRef = useRef<HoistInputModel>();

// Later...
inputRef.current.focus();
inputRef.current.blur();
inputRef.current.select();  // For text inputs

// Check focus state
inputRef.current.hasFocus;
```

### DOM Access

```typescript
// Get the root DOM element
const domElement = inputModel.domEl;

// Get the actual <input> or <textarea> element
const inputElement = inputModel.inputEl;
```

## HoistInputProps

The common props interface extended by all input components.

| Prop | Type | Description |
|------|------|-------------|
| `bind` | `string` | Model property name to bind to |
| `value` | `any` | Direct value (alternative to binding) |
| `disabled` | `boolean` | Disable user interaction |
| `onChange` | `(value, oldValue) => void` | Called on value changes |
| `onCommit` | `(value, oldValue) => void` | Called when value is committed |
| `tabIndex` | `number` | Tab order for focus (-1 to skip) |
| `id` | `string` | DOM ID for the input element |

## Integration with Forms

HoistInputModel integrates with the form system:

```typescript
// When used inside FormField, inputs automatically:
// 1. Read/write from the associated FieldModel
// 2. Trigger display of validation errors (by wrapping FormField) on blur
// 3. Inherit disabled/readonly state from the form

form({
    model: formModel,
    items: [
        formField({
            field: 'email',          // Connects to formModel.fields.email
            item: textInput()        // textInput gets model/bind props automatically
        })
    ]
})
```

### Validation Display

When bound to a FieldModel, inputs display validation states:

```typescript
// CSS classes applied based on validation:
// - xh-input--error: Field has error severity
// - xh-input--warning: Field has warning severity
// - xh-input--info: Field has info severity
// - xh-input--invalid: Alias for error (backwards compat)
// - xh-input-disabled: Input is disabled
```

Validation is displayed after:
- Field is blurred (via `noteBlurred()`)
- Form validation is triggered with `display: true`
- Field value becomes dirty

This deferred display prevents forms with e.g. many required fields from rendering initially with
numerous red invalid indicators before the user has had a chance to interact.

## Building Custom Inputs

To create a custom input component:

```typescript
import {hoistCmp} from '@xh/hoist/core';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {div} from '@xh/hoist/cmp/layout';

// 1. Extend HoistInputModel - can be minimal if no custom behavior needed
class MyInputModel extends HoistInputModel {
    // Override for inputs that should commit on every change (e.g., checkbox, select)
    override get commitOnChange(): boolean {
        return true;
    }

    // Optional: convert between internal (UI) and external (model) representations
    // override toExternal(internal: string): MyType { return parseMyType(internal); }
    // override toInternal(external: MyType): string { return formatMyType(external); }
}

// 2. Create the public component with hoistCmp.withFactory
export const [MyInput, myInput] = hoistCmp.withFactory({
    displayName: 'MyInput',
    className: 'xh-my-input',

    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, MyInputModel);
    }
});

// 3. Internal implementation component
const cmp = hoistCmp.factory<MyInputModel>(({model, className, ...props}, ref) => {
    return div({
        className,
        ref,                                      // Outer ref on wrapper
        onFocus: model.onFocus,
        onBlur: model.onBlur,
        item: input({
            ref: model.inputRef,                  // inputRef on actual <input>
            value: model.renderValue ?? '',
            onChange: e => model.noteValueChange(e.target.value),
            disabled: props.disabled
        })
    });
});
```

### Key Implementation Points

1. **Use `useHoistInputModel` hook** - Handles model creation, ref forwarding, and CSS class composition
2. **Pass `className` to wrapper** - `useHoistInputModel` composes validation/disabled classes into this
3. **Place `ref` on outer element** - The component ref goes on the wrapper div
4. **Place `model.inputRef` on `<input>`** - For focus/select support on the actual input element
5. **Wire `model.onFocus` and `model.onBlur`** - Required for commit-on-blur and validation display
6. **Call `model.noteValueChange()`** - On user input, triggers onChange and potential commit
7. **Use `model.renderValue`** - Returns appropriate value for display

## Related Packages

- [`/cmp/form/`](../form/README.md) - Form and FieldModel that inputs bind to
- `/desktop/cmp/input/` - Desktop input implementations
- `/mobile/cmp/input/` - Mobile input implementations
- `/desktop/cmp/form/` - Desktop FormField component
- `/mobile/cmp/form/` - Mobile FormField component
