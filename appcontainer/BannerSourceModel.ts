/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, BannerSpec} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {find, reject, sortBy, maxBy, without} from 'lodash';

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
        let {bannerModels} = this,
            {category = 'default'} = config,
            existing = bannerModels.find(it => it.category == category),
            sortOrder;

        // Removes banner from new banner's category if one exists.
        // Otherwise, creates the banner and adds it as the bottom banner.
        if (existing) {
            bannerModels = without(bannerModels, existing);
            XH.safeDestroy(existing);
            sortOrder = config.sortOrder ?? existing.sortOrder;
        } else {
            const maxSortOrder = maxBy(bannerModels, 'sortOrder')?.sortOrder ?? 0;
            sortOrder = config.sortOrder ?? maxSortOrder + 1;
        }
        const ret = new BannerModel({...config, sortOrder});
        this.bannerModels = sortBy([...bannerModels, ret], 'sortOrder');

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
