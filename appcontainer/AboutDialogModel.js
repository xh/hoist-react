/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {warnIf} from '@xh/hoist/utils/js';
import {isNull, reject} from 'lodash';

/**
 * Support for About Dialog.
 *  @private
 */
export class AboutDialogModel extends HoistModel {

    @observable isOpen = false;

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
        warnIf(!isNull(legacyConf), 'Config xhAboutMenuConfigs is no longer supported. To customize your `AboutDialog`, see HoistAppModel.getAboutDialogItems()');
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
        const rows = this.getItems().map(it => tr(th(it.label), td(it.value)));
        return table(tbody(rows));
    }

    getItems() {
        return reject(XH.appModel.getAboutDialogItems(), 'omit');
    }
}
