/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Manage Sizing Mode.
 *
 *  @private
 */
export class SizingModeModel extends HoistModel {

    @observable sizingMode = null;

    modes = [
        'large',
        'standard',
        'compact',
        'tiny'
    ];

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    setSizingMode(sizingMode) {
        throwIf(!this.modes.includes(sizingMode), `Sizing mode "${sizingMode}" not recognised.`);
        this.sizingMode = sizingMode;
        XH.setPref('xhSizingMode', sizingMode);
    }

    init() {
        this.setSizingMode(XH.getPref('xhSizingMode'));
    }
}
