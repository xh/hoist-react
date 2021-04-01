/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';

/**
 * Model for the shared AppBanner.
 * @private
 */
export class AppBannerModel extends HoistModel {

    @observable.ref config;
    @observable isShowing = false;

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    show(config) {
        this.config = config;
        this.isShowing = true;
    }

    @action
    hide() {
        this.config = null;
        this.isShowing = false;
    }
}