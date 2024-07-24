/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {RoleModel} from '@xh/hoist/admin/tabs/userData/roles/RoleModel';
import {HoistModel, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {compact, every, filter, map, uniq} from 'lodash';

export class RecategorizeDialogModel extends HoistModel {
    _parent: RoleModel;

    @bindable groupName = null;
    @observable isOpen = false;

    reCategorizeAction() {
        return {
            text: 'Change Category',
            icon: Icon.folder(),
            recordsRequired: true,
            actionFn: () => this.open(),
            displayFn: ({selectedRecords}) => {
                return {
                    hidden: this._parent.readonly,
                    disabled: every(selectedRecords, it => it.data?.isGroupRow)
                };
            }
        };
    }

    get options() {
        return compact(uniq(this._parent.allRoles.map(it => it.category))).sort();
    }

    constructor(parent) {
        super();
        makeObservable(this);
        this._parent = parent;
    }

    async saveAsync(clear: boolean = false) {
        if (this._parent.readonly) return;
        const roleSpec = filter(
            this._parent.gridModel.selectedRecords.map(it => it.data),
            it => !it.isGroupRow
        );
        const roles: string[] = map(roleSpec, it => it.name);
        await XH.fetchService.postJson({
            url: 'roleAdmin/bulkCategoryUpdate',
            body: {
                roles,
                category: clear ? null : this.groupName
            }
        });
        await this._parent.refreshAsync();
        this.close();
    }

    //-----------------
    // Actions
    //-----------------
    @action
    close() {
        this.groupName = null;
        this.isOpen = false;
    }

    @action
    open() {
        this.isOpen = true;
    }
}
