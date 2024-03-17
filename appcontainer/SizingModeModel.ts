/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, SizingMode} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {values, isPlainObject} from 'lodash';

/**
 * @internal
 */
export class SizingModeModel extends HoistModel {
    override xhImpl = true;

    @observable
    sizingMode: SizingMode = null;

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    setSizingMode(sizingMode: SizingMode) {
        throwIf(
            !values(SizingMode).includes(sizingMode),
            `Sizing mode "${sizingMode}" not recognised.`
        );

        const classList = document.body.classList;
        values(SizingMode).forEach(it => classList.toggle(`xh-${it}`, it === sizingMode));

        this.sizingMode = sizingMode;

        if (XH.prefService.hasKey('xhSizingMode')) {
            const pref = this.getPref(),
                platform = this.getPlatform();

            if (!isPlainObject(pref)) {
                this.logWarn(
                    `Required pref 'xhSizingMode' must be type JSON - update via Admin Console.`
                );
                return;
            }

            XH.setPref('xhSizingMode', {...pref, [platform]: sizingMode});
        } else {
            this.logWarn(`Missing required JSON pref 'xhSizingMode' - add via Admin Console.`);
        }
    }

    init() {
        const pref = this.getPref(),
            platform = this.getPlatform(),
            sizingMode = isPlainObject(pref) ? pref[platform] : null;

        this.setSizingMode(sizingMode ?? 'standard');
    }

    //---------------------
    // Implementation
    //---------------------
    private getPref() {
        return XH.getPref('xhSizingMode', {});
    }

    private getPlatform() {
        if (XH.isMobileApp) return 'mobile';
        if (XH.isTablet) return 'tablet';
        return 'desktop';
    }
}
