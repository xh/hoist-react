/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {
    composeGroupPath,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewInfo,
    ViewUpdateSpec
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {every, isEmpty, uniq} from 'lodash';
import {ManageDialogModel} from '../ManageDialogModel';
import {confirmVisibilityChangeAsync, MIXED_GROUP_VALUE, Visibility} from '../Utils';

/**
 * Backing model for bulk editing of multiple selected views.
 */
export class ViewMultiPanelModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;

    /** True to show the text input naming a new group to create under the selected group. */
    @bindable isAddingSubgroup: boolean = false;

    get views(): ViewInfo[] {
        return this.parent.selectedViews;
    }

    get allEditable(): boolean {
        return every(this.views, 'isEditable');
    }

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);

        this.parent = parent;
        this.formModel = new FormModel({
            fields: [
                {name: 'group'},
                {
                    name: 'subgroup',
                    displayName: 'Sub Group',
                    rules: [
                        ({value}) =>
                            value?.includes(VIEW_GROUP_DELIMITER)
                                ? `Group name may not contain "${VIEW_GROUP_DELIMITER}".`
                                : null
                    ]
                },
                {name: 'visibility'}
            ]
        });

        this.addReaction({
            track: () => this.views,
            run: views => {
                const {formModel} = this,
                    vals = uniq(
                        views.map(v => (v.isShared ? 'shared' : v.isGlobal ? 'global' : 'private'))
                    );
                this.isAddingSubgroup = false;
                // Group inits to the views' common group when uniform (empty meaning top level,
                // as in the single-view panel), else to the displayed-only mixed sentinel.
                const groups = uniq(views.map(v => v.group ?? null));
                formModel.init({
                    group: groups.length === 1 ? groups[0] : MIXED_GROUP_VALUE,
                    subgroup: null,
                    visibility: vals.length === 1 ? vals[0] : null
                });
                formModel.readonly = !this.allEditable;
            },
            fireImmediately: true
        });
    }

    reset() {
        this.formModel.reset();
        this.isAddingSubgroup = false;
    }

    async saveAsync() {
        const {parent, views, formModel} = this,
            {group: groupField, visibility: visibilityField} = formModel.fields,
            updates: ViewUpdateSpec = {};

        if (!formModel.isDirty || isEmpty(views)) return;

        const subgroup = formModel.values.subgroup?.trim(),
            groupValue = groupField.value;
        if (groupField.isDirty || (subgroup && groupValue !== MIXED_GROUP_VALUE)) {
            const base = normalizeGroupPath(groupValue);
            updates.group = subgroup ? composeGroupPath(base, subgroup) : base;
        }

        if (visibilityField.isDirty) {
            const visibility = visibilityField.value as Visibility;
            updates.isShared = visibility === 'shared';
            updates.isGlobal = visibility === 'global';

            const confirmed = await confirmVisibilityChangeAsync(
                parent.viewManagerModel,
                views,
                visibility,
                groupField.isDirty
            );
            if (!confirmed) return;
        }

        if (isEmpty(updates)) return;

        await parent.updateViewsAsync(views, updates);
    }
}
