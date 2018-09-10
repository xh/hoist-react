/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';

import {OptionsDialogControl} from './OptionsDialogControl';

/**
 * Manages built-in setting of user preferences.
 * @private
 */
@HoistModel
export class OptionsDialogModel {

    @observable isOpen = false;

    get controls() {
        return XH.app.getOptionControls().map(it => it instanceof OptionsDialogControl ? it : new OptionsDialogControl(it));
    }

    get hasOptions() {
        return !!this.controls.length;
    }

    @action
    show() {
        this.isOpen = true;
    }

    @action
    hide() {
        this.isOpen = false;
    }

}