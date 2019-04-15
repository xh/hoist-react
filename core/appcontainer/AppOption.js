/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {warnIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';


/**
 * Options specification for global options dialog.
 *
 * Option can automatically be bound to a preference.  Alternatively, you can provide valueGetter and
 * valueSetter functions if you don't want to bind the control directly to a preference, or need to do
 * pre-processing.
 *
 * Applications will typically specify AppOption configurations in HoistAppModel.getAppOptions()
 */
export class AppOption {

    name;
    prefName;
    fieldModel;
    formField;
    valueGetter;
    valueSetter;
    refreshRequired;

    /**
     * @param {Object} c - AppOption configuration.
     * @param {string} c.name - name for the option
     * @param {string} [c.prefName] - prefName to bind to the option to.
     * @param {Object} c.formField - config for FormField for the option.
     * @param {Object} [c.fieldModel] - config for FieldModel for the option.
     * @param {function} [c.valueGetter] - async function which returns the external value.
     * @param {function} [c.valueSetter] - async function which sets the external value. Receives (value).
     * @param {boolean}  [c.refreshRequired] - true to refresh the app after changing this option.
     */
    constructor({
        name,
        prefName,
        formField,
        fieldModel,
        valueGetter,
        valueSetter,
        refreshRequired = false
    }) {
        
        warnIf(
            !(prefName && XH.prefService.hasKey(prefName)) && !(valueGetter && valueSetter),
            'Must specify either a valid prefName or provide a valueGetter and valueSetter.'
        );

        warnIf(
            fieldModel && fieldModel.initialValue,
            `AppOption "${name}" should not set an initialValue - this will be ignored.`
        );

        this.name = name;
        this.prefName = prefName;
        this.fieldModel = fieldModel;
        this.formField = formField;
        this.valueGetter = valueGetter;
        this.valueSetter = valueSetter;
        this.refreshRequired = refreshRequired;
    }

    async getValueAsync(name) {
        const {valueGetter, prefName} = this;
        if (isFunction(valueGetter)) {
            return await valueGetter();
        } else {
            return XH.prefService.get(prefName);
        }
    }

    async setValueAsync(name, value) {
        const {valueSetter, prefName} = this;
        if (isFunction(valueSetter)) {
            await valueSetter(value);
        } else {
            XH.prefService.set(prefName, value);
        }
    }
}