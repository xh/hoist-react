/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {FieldModel} from '@xh/hoist/cmp/form';
import {HoistInput} from '@xh/hoist/cmp/input';
import {throwIf, warnIf} from '@xh/hoist/utils/js';

/**
 * Extends FieldModel, adding additional properties for display within the XH Options Dialog.
 *
 * Adds `control`, a HoistInput Component to be rendered within the dialog.
 *
 * By default, expects `name` (from FieldModel) to match an existing preference key. The options
 * dialog will automatically bind the control to that preference when opening and saving.
 *
 * Alternatively, you can provide valueGetter and valueSetter functions if you don't want to
 * bind the control directly to a preference, or need to do pre-processing. Note that both
 * valueGetter and valueSetter are required when not bound to a preference.
 *
 * Applications will typically specify AppOption configurations in HoistAppModel.getAppOptions()
 *
 * In addition to the above, supports all configs of FieldModel.
 * @see FieldModel
 */
export class AppOption extends FieldModel {

    control;
    valueGetter;
    valueSetter;
    refreshRequired;

    /**
     * @param {Object} c - AppOption configuration.
     * @param {Object} c.control - HoistInput component used to manage the option.
     * @param {function} [c.valueGetter] - function which returns the external value.
     * @param {function} [c.valueSetter] - function which sets the external value. Receives (value).
     * @param {boolean} [c.refreshRequired] - true to refresh the app after changing this option.
     */
    constructor({
        control,
        valueGetter,
        valueSetter,
        refreshRequired = false,
        ...rest
    }) {
        super({...rest});

        // Ensure control is present and a HoistInput
        const extendsHoistInput = control && control.type.prototype instanceof HoistInput;
        throwIf(!extendsHoistInput, `AppOption "${name}"'s control must be a component that extends HoistInput.`);

        // Ensure is either bound to a preference OR has valueGetter and valueSetter
        if (!XH.prefService.hasKey(rest.name)) {
            throwIf(!valueGetter || !valueSetter, `AppOption "${name}" is not a recognized preference. Please update or provide a valueGetter and valueSetter.`);
        }

        // Initial value will be ignored, instead read from preference or valueGetter
        warnIf(rest.initialValue, `AppOption "${name}" should not set an initialValue - this will be ignored.`);

        this.control = control;
        this.valueGetter = valueGetter;
        this.valueSetter = valueSetter;
        this.refreshRequired = refreshRequired;
    }

}
