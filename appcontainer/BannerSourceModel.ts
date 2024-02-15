/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, BannerSpec} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {find, reject, sortBy, without, last} from 'lodash';

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
    show(spec: BannerSpec): BannerModel {
        let {bannerModels} = this,
            ret = new BannerModel(spec);

        // Removes banner from new banner's category if it exists.
        const existing = find(bannerModels, {category: ret.category});
        if (existing) {
            bannerModels = without(bannerModels, existing);
            XH.safeDestroy(existing);
        }

        // Place in requested pos, existing pos, or last
        const maxSortOrder = last(bannerModels)?.sortOrder ?? 0;
        ret.sortOrder = spec.sortOrder ?? existing?.sortOrder ?? maxSortOrder + 1;
        bannerModels = sortBy([...bannerModels, ret], 'sortOrder');

        this.bannerModels = bannerModels;
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
