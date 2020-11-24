/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';

export const HoistInputPropTypes = {

    /**
     * Field or model property name from which this component should read and write its value
     * in controlled mode. Can be set by parent FormField.
     */
    bind: PT.string,

    /** CSS class name. **/
    className: PT.string,

    /** True to disable user interaction. Can be set by parent FormField. */
    disabled: PT.bool,

    /** DOM ID of this input. */
    id: PT.string,

    /** Bound HoistModel instance. Can be set by parent FormField. */
    model: PT.object,

    /** Called when value changes - passed new and prior values. */
    onChange: PT.func,

    /** Called when value is committed to backing model - passed new and prior values. */
    onCommit: PT.func,

    /** Style block. */
    style: PT.object,

    /** Tab order for focus control, or -1 to skip. If unset, browser layout-based order. */
    tabIndex: PT.number,

    /** Value of the control, if provided directly. */
    value: PT.any
};