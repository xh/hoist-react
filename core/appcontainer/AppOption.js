/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {HoistInput} from '@xh/hoist/cmp/form/HoistInput';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * An app option displayed within the XH options dialog.
 *
 * Typically used bound to a preference by setting `field` to a matching preference key.
 * Alternatively, can be used to manage non-preference values via valueGetter and valueSetter.
 */
export class AppOption {

    label;
    field;
    control;
    valueGetter;
    valueSetter;
    refreshRequired;

    /**
     * @param {Object} c - AppOption configuration.
     * @param {string} c.label - label to display in the options dialog.
     * @param {string} c.field - field name for option managed by the control.
     * @param {Object} c.control - HoistInput component used to manage the option.
     * @param {function} [c.valueGetter] - function which returns the external value.
     * @param {function} [c.valueSetter] - function which sets the external value. Receives (value).
     * @param {boolean} [c.refreshRequired] - true to refresh the app after changing this option.
     */
    constructor({
        label,
        field,
        control,
        valueGetter,
        valueSetter,
        refreshRequired = false
    }) {
        const extendsHoistInput = control && control.type.prototype instanceof HoistInput;
        throwIf(!extendsHoistInput, 'AppOption control must be a component that extends HoistInput.');
        throwIf(!label, 'AppOption requires label.');
        throwIf(!field, 'AppOption requires field.');

        if (!XH.prefService.hasKey(field)) {
            throwIf(!valueGetter || !valueSetter, 'AppOption requires valueGetter and valueSetter when not bound to a preference.');
        }

        this.label = label;
        this.field = field;
        this.control = control;
        this.valueGetter = valueGetter;
        this.valueSetter = valueSetter;
        this.refreshRequired = refreshRequired;
    }

}
