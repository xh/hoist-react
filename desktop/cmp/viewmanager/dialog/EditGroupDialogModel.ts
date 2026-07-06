/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {
    composeGroupPath,
    getGroupLeaf,
    getGroupParent,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {ManageDialogModel} from './ManageDialogModel';

/**
 * Backing model for the dialog used to rename or re-parent a view group, launched from the
 * "Edit Group" context menu on group rows within the manage dialog grids.
 */
export class EditGroupDialogModel extends HoistModel {
    parent: ManageDialogModel;

    @observable isOpen: boolean = false;

    /** Group path under edit. */
    @observable.ref group: string = null;

    /** True if editing a group of global views, false for owned. */
    @observable isGlobal: boolean = false;

    @managed formModel: FormModel;

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);

        this.parent = parent;
        this.formModel = this.createFormModel();
    }

    @action
    open(group: string, isGlobal: boolean) {
        this.group = group;
        this.isGlobal = isGlobal;
        this.formModel.init({
            name: getGroupLeaf(group),
            nestUnder: getGroupParent(group)
        });
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    async saveAsync() {
        const {parent, group, isGlobal, formModel} = this;
        if (!(await formModel.validateAsync())) return;

        const {name, nestUnder} = formModel.getData(),
            to = normalizeGroupPath(composeGroupPath(nestUnder, name));
        if (to !== group) {
            await parent.renameGroupAsync(group, to, isGlobal);
        }
        this.close();
    }

    //------------------------
    // Implementation
    //------------------------
    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    displayName: 'Group Name',
                    rules: [
                        required,
                        ({value}) =>
                            value?.includes(VIEW_GROUP_DELIMITER)
                                ? `Group name may not contain "${VIEW_GROUP_DELIMITER}" - re-parent via "Nest Under" instead.`
                                : null
                    ]
                },
                {name: 'nestUnder', displayName: 'Nest Under'}
            ]
        });
    }
}
