/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {BoxProps, HoistProps} from '@xh/hoist/core';
import {ReactNode} from 'react';
import {FieldModel} from './field/FieldModel';

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
}
