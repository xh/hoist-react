/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, BannerSpec} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {find, reject} from 'lodash';

import {BannerModel} from './BannerModel';

/**
 * Supporting model for managing the display of one or more app-wide banners.
 * @see {XH.showBanner()}
 * @private
 */
export class BannerSourceModel extends HoistModel {
    xhImpl = true;

    @managed
    @observable.ref
    bannerModels: BannerModel[] = [];

    MAX_BANNERS = 4;

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    show(config: BannerSpec): BannerModel {
        const ret = new BannerModel(config);
        this.addModel(ret);
        return ret;
    }

    @action
    hide(category: string) {
        const bannerModel = this.getBanner(category);
        XH.safeDestroy(bannerModel);
        this.bannerModels = reject(this.bannerModels, {category});
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    addModel(model: BannerModel) {
        // Remove existing banner for category
        this.hide(model.category);

        // Add new banner, removing old banners if limit exceeded
        const models = [...this.bannerModels, model];
        while (models.length > this.MAX_BANNERS) {
            const bannerModel = models.shift();
            XH.safeDestroy(bannerModel);
        }
        this.bannerModels = models;
    }

    getBanner(category: string): BannerModel {
        return find(this.bannerModels, {category});
    }
}
