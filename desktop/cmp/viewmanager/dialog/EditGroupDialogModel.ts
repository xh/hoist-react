/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {
    composeGroupPath,
    getAllGroupPaths,
    getGroupLeaf,
    getGroupParent,
    isGroupSameOrDescendant,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {partition} from 'lodash';
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
            if (!(await this.confirmMergeIfExistsAsync(to))) return;
            await parent.renameGroupAsync(group, to, isGlobal);
        }
        this.close();
    }

    //------------------------
    // Implementation
    //------------------------
    /**
     * If the target path already exists as a group in its own right, the rename will merge this
     * group's views into it - confirm with the user before proceeding.
     */
    private async confirmMergeIfExistsAsync(to: string): Promise<boolean> {
        const {parent, group, isGlobal} = this,
            {viewManagerModel} = parent,
            views = isGlobal ? viewManagerModel.globalViews : viewManagerModel.ownedViews,
            [movingViews, otherViews] = partition(views, v =>
                isGroupSameOrDescendant(v.group, group)
            );

        if (!getAllGroupPaths(otherViews).includes(to)) return true;

        return XH.confirm({
            message: fragment(
                p(`Group "${to}" already exists.`),
                p(
                    `You will be adding ${pluralize(viewManagerModel.typeDisplayName, movingViews.length, true)} to this group.`
                )
            ),
            confirmProps: {
                text: 'Yes, merge groups',
                outlined: true,
                autoFocus: false,
                intent: 'primary'
            }
        });
    }

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
