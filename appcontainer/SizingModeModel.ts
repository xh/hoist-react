/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, SizingMode} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {values, isPlainObject} from 'lodash';

/**
 * @internal
 */
export class SizingModeModel extends HoistModel {
    override xhImpl = true;
    override xhName = 'sizingModeModel';

    @observable accessor sizingMode: SizingMode = null;

    @action
    setSizingMode(sizingMode: SizingMode) {
        this.applySizingMode(sizingMode);

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
        this.setSizingMode(this.prefSizingMode);

        // Apply changes made to the pref elsewhere - e.g. via `XH.prefService.unset()`.
        this.addReaction({
            track: () => this.prefSizingMode,
            run: sizingMode => {
                if (sizingMode !== this.sizingMode) this.applySizingMode(sizingMode);
            }
        });
    }

    //---------------------
    // Implementation
    //---------------------
    @action
    private applySizingMode(sizingMode: SizingMode) {
        throwIf(
            !values(SizingMode).includes(sizingMode),
            `Sizing mode "${sizingMode}" not recognised.`
        );

        const classList = document.body.classList;
        values(SizingMode).forEach(it => classList.toggle(`xh-${it}`, it === sizingMode));

        this.sizingMode = sizingMode;
    }

    /** Mode stored in the pref for this platform, or the default if none. */
    private get prefSizingMode(): SizingMode {
        const pref = this.getPref();
        return (isPlainObject(pref) ? pref[this.getPlatform()] : null) ?? 'standard';
    }

    private getPref() {
        return XH.getPref('xhSizingMode', {});
    }

    private getPlatform() {
        if (XH.isMobileApp) return 'mobile';
        if (XH.isTablet) return 'tablet';
        return 'desktop';
    }
}
