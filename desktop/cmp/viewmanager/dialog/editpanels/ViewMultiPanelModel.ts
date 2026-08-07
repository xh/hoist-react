/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {ViewInfo, ViewUpdateSpec} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import {every, isEmpty, uniq} from 'lodash';
import {ManageDialogModel} from '../ManageDialogModel';
import {confirmVisibilityChangeAsync, Visibility} from '../Utils';

/**
 * Backing model for bulk editing of multiple selected views. Group is not editable here - views
 * and whole groups are moved by dragging them within the grids.
 */
export class ViewMultiPanelModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;

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
        this.formModel = new FormModel({fields: [{name: 'visibility'}]});

        this.addReaction({
            track: () => this.views,
            run: views => {
                const {formModel} = this,
                    vals = uniq(
                        views.map(v => (v.isShared ? 'shared' : v.isGlobal ? 'global' : 'private'))
                    );
                formModel.init({visibility: vals.length === 1 ? vals[0] : null});
                formModel.readonly = !this.allEditable;
            },
            fireImmediately: true
        });
    }

    reset() {
        this.formModel.reset();
    }

    async saveAsync() {
        const {parent, views, formModel} = this,
            {visibility: visibilityField} = formModel.fields,
            updates: ViewUpdateSpec = {};

        if (!formModel.isDirty || isEmpty(views)) return;
        if (!(await formModel.validateAsync())) return;

        if (visibilityField.isDirty) {
            const visibility = visibilityField.value as Visibility;
            updates.isShared = visibility === 'shared';
            updates.isGlobal = visibility === 'global';

            const confirmed = await confirmVisibilityChangeAsync(
                parent.viewManagerModel,
                views,
                visibility
            );
            if (!confirmed) return;
        }

        if (isEmpty(updates)) return;

        await parent.updateViewsAsync(views, updates);
    }
}
