/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {XH} from '@xh/hoist/core';
import {afterEach, describe, expect, it} from 'vitest';

/**
 * App-wide banners from `XH.showBanner()`. Banners are unique by category, so code that re-shows a
 * banner on every poll - as AlertBannerService does for admin alerts - updates it in place rather
 * than stacking copies down the page.
 */
describe('BannerSourceModel', () => {
    afterEach(() => {
        categories().forEach(it => XH.hideBanner(it));
    });

    describe('show', () => {
        it('replaces the banner of the same category, keeping its place', () => {
            XH.showBanner({category: 'maintenance', message: 'Maintenance at 6pm'});
            const old = XH.showBanner({category: 'markets', message: 'Markets closed'});
            XH.showBanner({category: 'feeds', message: 'Price feed delayed'});

            XH.showBanner({category: 'markets', message: 'Markets open'});

            expect(categories()).toEqual(['maintenance', 'markets', 'feeds']);
            expect(banners()[1].message).toBe('Markets open');
            expect(old.isDestroyed).toBe(true);
        });

        it('adds new banners last, unless placed with a sortOrder', () => {
            XH.showBanner({category: 'maintenance', message: 'Maintenance at 6pm'});
            XH.showBanner({category: 'feeds', message: 'Price feed delayed'});
            XH.showBanner({
                category: 'xhAlertBanner',
                message: 'Trading halted',
                sortOrder: BannerModel.BANNER_SORTS.ADMIN_ALERT
            });

            expect(categories()).toEqual(['xhAlertBanner', 'maintenance', 'feeds']);
        });
    });
});

function banners(): BannerModel[] {
    return XH.appContainerModel.bannerSourceModel.bannerModels;
}

function categories(): string[] {
    return banners().map(it => it.category);
}
