/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {BoxProps, HoistProps} from '@xh/hoist/core';
import type {ReactElement, ReactNode} from 'react';
import type {FieldModel} from './field/FieldModel';

export interface BaseFormFieldProps extends HoistProps<FieldModel>, BoxProps {
    /**
     * CommitOnChange property for underlying HoistInput (for inputs that support).
     * Defaulted from containing Form.
     */
    commitOnChange?: boolean;

    /** True to disable user interaction. Defaulted from backing FieldModel. */
    disabled?: boolean;

    /** Property name on bound FormModel from which to read/write data. */
    field: string;

    /** Additional description or info to be displayed alongside the input control. */
    info?: ReactNode;

    /**
     * Renders the field's input in edit mode. Called with the input FormField has set up - bound
     * to the field, sized, and given the id the label points at - and returns what to show: the
     * input itself, a wrapper around it, or something else in its place, such as a chip for a
     * value the input can't edit. A replacement that should stay reachable by the label and by
     * `FieldModel.focus()` takes `id: input.props.id` and `ref: model.boundInputRef`.
     *
     * Wrap the input on every call or on none: switching between a wrapped and a bare input
     * remounts it, which drops its focus and any uncommitted text. Not called while the field is
     * readonly - see `readonlyRenderer`. Defaulted from containing Form - define the function once,
     * outside a render, as a new function re-renders every field.
     */
    inputRenderer?: (input: ReactElement, model: FieldModel) => ReactNode;

    /**
     * Label for form field. Defaults to Field displayName. Set to null to hide.
     * Can be defaulted from contained Form (specifically, to null to hide all labels).
     */
    label?: ReactNode;

    /**
     * Apply minimal styling - validation errors are only displayed with a red outline.
     * Defaulted from containing Form, or false.
     */
    minimal?: boolean;

    /**
     * Optional function for use in readonly mode. Called with the Field's current value and should
     * return an element suitable for presentation to the end-user. Defaulted from containing Form.
     */
    readonlyRenderer?: (v: any, model: FieldModel) => ReactNode;

    /** The indicator to display next to a required field. Defaults to `*`. */
    requiredIndicator?: string;

    /**
     * Per-field buttons or menus, such as a reset. Inline, they follow the input in its row.
     * Stacked, they sit at the right end of the label's row. Shown only while the field isn't
     * readonly. A function is called with the field's model on each render, so `fieldDefaults` can
     * give every field its own. FormField keys the elements and does not disable them with the
     * field - read `model.disabled`. Defaulted from containing Form - set null on a field to turn
     * off a form-wide default.
     */
    rightItems?: ReactNode[] | ((model: FieldModel) => ReactNode[]);
}
