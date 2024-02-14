/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {TestSupportProps} from '@xh/hoist/core';

export interface HoistInputProps extends TestSupportProps {
    /**
     * Field or model property name from which this component should read and write its value
     * in controlled mode. Can be set by parent FormField.
     */
    bind?: string;

    /** True to disable user interaction. Can be set by parent FormField. */
    disabled?: boolean;

    /** DOM ID of this input. */
    id?: string;

    /** Called when value changes - passed new and prior values. */
    onChange?: (value: any, oldValue: any) => void;

    /** Called when value is committed to backing model - passed new and prior values. */
    onCommit?: (value: any, oldValue: any) => void;

    /** Tab order for focus control, or -1 to skip. If unset, browser layout-based order. */
    tabIndex?: number;

    /** Value of the control, if provided directly. */
    value?: any;
}
