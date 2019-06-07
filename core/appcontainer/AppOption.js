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
 * Options specification for the app-wide options dialog.
 *
 * Option can be sourced from / set to a preference via the `prefName` config. Alternatively,
 * the `valueGetter` and `valueSetter` config functions allow for custom handling if required.
 *
 * Apps will typically specify AppOption configurations in HoistAppModel.getAppOptions(). Implement
 * this method and return one or more AppOption configs to enable the Options menu option in the
 * primary AppBar menu.
 */
export class AppOption {

    name;
    prefName;
    fieldModel;
    formField;
    valueGetter;
    valueSetter;
    reloadRequired;

    /**
     * @param {Object} c - AppOption configuration.
     * @param {string} c.name - name for the option
     * @param {string} [c.prefName] - prefName to bind to the option to.
     * @param {Object} c.formField - config for FormField for the option.
     * @param {Object} [c.fieldModel] - config for FieldModel for the option.
     * @param {function} [c.valueGetter] - async function which returns the external value.
     * @param {function} [c.valueSetter] - async function which sets the external value. Receives (value).
     * @param {boolean}  [c.reloadRequired] - true to reload the app after changing this option.
     */
    constructor({
        name,
        prefName,
        formField,
        fieldModel,
        valueGetter,
        valueSetter,
        reloadRequired = false
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
        this.reloadRequired = reloadRequired;
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