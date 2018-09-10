/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistField} from '@xh/hoist/cmp/form/HoistField';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Basic Model for a field control displayed within the XH options dialog.
 */
export class OptionsDialogControl {

    prefName;
    control;
    refreshRequired;
    disabled;
    hidden;

    /**
     * @param {Object} c - OptionsDialogControl configuration.
     * @param {string} c.prefName - preference name for option managed by the control.
     * @param {Object} c.control - HoistField component used to manage the option.
     * @param {boolean} [c.refreshRequired] - true to refresh the app after changing this option.
     * @param {boolean} [c.disabled] - true to disable this item.
     * @param {boolean} [c.hidden] - true to hide this item.
     */
    constructor({
        prefName,
        control,
        refreshRequired = false,
        disabled = false,
        hidden = false
    }) {
        const extendsHoistField = control.prototype instanceof HoistField;
        throwIf(!extendsHoistField, 'Option control must be a component that extends HoistField.');
        throwIf(!prefName, 'Must specify prefName for an options dialog control.');

        this.prefName = prefName;
        this.control = control;
        this.refreshRequired = refreshRequired;
        this.disabled = disabled;
        this.hidden = hidden;
    }

}
