/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, BannerSpec} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {find, reject, sortBy, maxBy} from 'lodash';

import {BannerModel} from './BannerModel';

/**
 * Supporting model for managing the display of one or more app-wide banners.
 * @see XH.showBanner()
 * @internal
 */
export class BannerSourceModel extends HoistModel {
    override xhImpl = true;

    @managed
    @observable.ref
    bannerModels: BannerModel[] = [];

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    show(config: BannerSpec): BannerModel {
        const maxSortOrder = maxBy(this.bannerModels, 'sortOrder')?.sortOrder ?? 0;

        const ret = new BannerModel({
            ...config,
            sortOrder: config.sortOrder ?? maxSortOrder + 1
        });

        // Remove existing banner for category
        this.hide(ret.category);

        this.bannerModels = sortBy([...this.bannerModels, ret], 'sortOrder');

        return ret;
    }

    @action
    hide(category: string) {
        const bannerModel = this.getBanner(category);
        XH.safeDestroy(bannerModel);
        this.bannerModels = reject(this.bannerModels, {category});
    }

    private getBanner(category: string): BannerModel {
        return find(this.bannerModels, {category});
    }
}
