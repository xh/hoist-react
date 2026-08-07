/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {ViewInfo, ViewUpdateSpec} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed} from '@xh/hoist/core';
import {computed, makeObservable} from '@xh/hoist/mobx';
import {every, isEmpty, uniq} from 'lodash';
import {ManageDialogModel} from '../ManageDialogModel';
import {confirmVisibilityChangeAsync, normalizeGroupValue, Visibility} from '../Utils';
import {GroupFieldModel, newGroupNameField} from './GroupFieldModel';

/**
 * Backing model for bulk editing of multiple selected views.
 */
export class ViewMultiPanelModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;
    @managed groupFieldModel: GroupFieldModel;

    get views(): ViewInfo[] {
        return this.parent.selectedViews;
    }

    get allEditable(): boolean {
        return every(this.views, 'isEditable');
    }

    /** True when the selected views span multiple groups - there is no single value to show. */
    @computed
    get isMixedGroup(): boolean {
        return uniq(this.views.map(v => v.group ?? null)).length > 1;
    }

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);

        this.parent = parent;
        this.formModel = new FormModel({
            fields: [{name: 'group'}, newGroupNameField(), {name: 'visibility'}]
        });
        this.groupFieldModel = new GroupFieldModel({
            formModel: this.formModel,
            viewManagerModel: parent.viewManagerModel,
            context: 'bulk'
        });

        this.addReaction({
            track: () => this.views,
            run: views => {
                const {formModel} = this,
                    vals = uniq(
                        views.map(v => (v.isShared ? 'shared' : v.isGlobal ? 'global' : 'private'))
                    );
                formModel.init({
                    newGroupName: null,
                    visibility: vals.length === 1 ? vals[0] : null
                });
                // Empty on a mixed selection, where it reads as "no change" - never as a move to
                // the top level, which the user must choose explicitly.
                this.groupFieldModel.init(views[0]?.group, this.isMixedGroup);
                formModel.readonly = !this.allEditable;
            },
            fireImmediately: true
        });
    }

    reset() {
        this.formModel.reset();
        this.groupFieldModel.reset();
    }

    async saveAsync() {
        const {parent, views, formModel} = this,
            {group: groupField, visibility: visibilityField} = formModel.fields,
            updates: ViewUpdateSpec = {};

        if (!formModel.isDirty || isEmpty(views)) return;
        if (!(await formModel.validateAsync())) return;

        // An empty group leaves every view where it is - only a real selection moves anything.
        if (groupField.isDirty && groupField.value) {
            updates.group = normalizeGroupValue(groupField.value);
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
