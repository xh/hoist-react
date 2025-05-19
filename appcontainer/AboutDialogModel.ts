/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {AboutDialogItem, HoistModel, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isOmitted} from '@xh/hoist/utils/impl';
import {warnIf} from '@xh/hoist/utils/js';
import copy from 'clipboard-copy';
import {isNull} from 'lodash';
import {Icon} from '../icon';

/**
 * @internal
 */
export class AboutDialogModel extends HoistModel {
    override xhImpl = true;

    @observable
    isOpen: boolean = false;

    constructor() {
        super();
        makeObservable(this);
    }

    init() {
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.hide()
        });

        const legacyConf = XH.getConf('xhAboutMenuConfigs', null);
        warnIf(
            !isNull(legacyConf),
            'Config xhAboutMenuConfigs is no longer supported. To customize your `AboutDialog`, see HoistAppModel.getAboutDialogItems()'
        );
    }

    @action
    show() {
        XH.track({category: 'Navigation', message: 'Opened About Dialog'});
        this.isOpen = true;
    }

    @action
    hide() {
        this.isOpen = false;
    }

    getTable() {
        const rows = this.getItems().map(it =>
            tr(
                th(it.label),
                td({
                    item: it.value,
                    onClick: () => {
                        const val = it.value?.toString();
                        if (val === 'null' || val === '[object Object]') return;

                        copy(val);
                        XH.toast({
                            icon: Icon.clipboard(),
                            message: `Copied ${val} to clipboard`
                        });
                    }
                })
            )
        );
        return table(tbody(rows));
    }

    getItems(): AboutDialogItem[] {
        return XH.appModel.getAboutDialogItems().filter(it => !isOmitted(it));
    }
}
