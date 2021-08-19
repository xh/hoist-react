/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, SizingMode} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {values} from 'lodash';

/**
 * Manage Sizing Mode.
 *
 *  @private
 */
export class SizingModeModel extends HoistModel {

    /** @member {SizingMode} */
    @observable sizingMode = null;

    constructor() {
        super();
        makeObservable(this);
    }

    /** @param {SizingMode} sizingMode */
    @action
    setSizingMode(sizingMode) {
        throwIf(!values(SizingMode).includes(sizingMode), `Sizing mode "${sizingMode}" not recognised.`);

        const classList = document.body.classList;
        values(SizingMode).forEach(it => classList.toggle(`xh-${it}`, it === sizingMode));

        this.sizingMode = sizingMode;
        if (XH.prefService.hasKey('xhSizingMode')) {
            XH.setPref('xhSizingMode', sizingMode);
        } else {
            console.warn(`Missing required string pref 'xhSizingMode' - add via Admin Console.`);
        }
    }

    init() {
        this.setSizingMode(XH.getPref('xhSizingMode', 'standard'));
    }
}
