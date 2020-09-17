/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {uniq} from 'lodash';
import {HoistModel, XH} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {Icon} from '@xh/hoist/icon/Icon';

@HoistModel
export class RegroupDialogModel {

    _parent

    @bindable.ref groupName = null;
    @observable.ref isOpen = false

    regroupAction = {
        text: 'Change Group',
        icon: Icon.grip(),
        recordsRequired: true,
        actionFn: () => this.open()
    };

    get options() {
        return uniq(this._parent.gridModel.store.allRecords.map(it => it.data.groupName));
    }

    constructor(parent) {
        this._parent = parent;
    }

    async saveAsync() {
        const {_parent, groupName} = this,
            {selection, store} = _parent.gridModel,
            ids = selection.map(it => it.id),
            resp = await store.bulkUpdateRecordsAsync(ids, {groupName}),
            intent = resp.fail > 0 ? 'warning' : 'success',
            message = `Change group complete with ${resp.fail} failures.`;

        XH.toast({intent, message});
        this.close();
    }

    //-----------------
    // Actions
    //-----------------
    @action
    close() {
        this.setGroupName(null);
        this.isOpen = false;
    }

    @action
    open() {
        this.isOpen = true;
    }

}