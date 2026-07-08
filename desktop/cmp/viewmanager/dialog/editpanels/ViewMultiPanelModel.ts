/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p, strong} from '@xh/hoist/cmp/layout';
import {ViewInfo, ViewUpdateSpec} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {pluralize} from '@xh/hoist/utils/js';
import {every, isEmpty, uniq} from 'lodash';
import {ReactNode} from 'react';
import {ManageDialogModel} from '../ManageDialogModel';
import {parseGroupSelectValue, Visibility} from '../Utils';

/**
 * Backing model for bulk editing of multiple selected views.
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

        this.parent = parent;
        this.formModel = new FormModel({fields: [{name: 'group'}, {name: 'visibility'}]});

        this.addReaction({
            track: () => this.views,
            run: views => {
                const {formModel} = this,
                    vals = uniq(
                        views.map(v => (v.isShared ? 'shared' : v.isGlobal ? 'global' : 'private'))
                    );
                // Group inits empty - a non-null value always indicates a pending move.
                formModel.init({
                    group: null,
                    visibility: vals.length === 1 ? vals[0] : null
                });
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
            {group: groupField, visibility: visibilityField} = formModel.fields,
            updates: ViewUpdateSpec = {};

        if (!formModel.isDirty || isEmpty(views)) return;

        if (groupField.isDirty) {
            updates.group = parseGroupSelectValue(groupField.value);
        }

        if (visibilityField.isDirty) {
            const visibility = visibilityField.value as Visibility;
            updates.isShared = visibility === 'shared';
            updates.isGlobal = visibility === 'global';

            const countStr = pluralize(parent.viewManagerModel.typeDisplayName, views.length, true),
                msgs: ReactNode[] = [strong('Are you sure you want to proceed?')];
            switch (visibility) {
                case 'private':
                    msgs.unshift(
                        `${countStr} will no longer be available to all other ${XH.appName} users.`
                    );
                    break;
                case 'global':
                    msgs.unshift(
                        `${countStr} will become globally visible to all other ${XH.appName} users.`
                    );
                    break;
                case 'shared':
                    every(views, 'isGlobal')
                        ? msgs.unshift(
                              `${countStr} will no longer be globally visible to all other ${XH.appName} users.`
                          )
                        : msgs.unshift(
                              `${countStr} will become available to all other ${XH.appName} users.`
                          );
            }

            const confirmed = await XH.confirm({
                message: fragment(msgs.map(m => p(m))),
                confirmProps: {
                    text: groupField.isDirty ? 'Yes, save changes' : 'Yes, update visibility',
                    outlined: true,
                    autoFocus: false,
                    intent: 'primary'
                }
            });
            if (!confirmed) return;
        }

        if (isEmpty(updates)) return;

        await parent.updateViewsAsync(views, updates);
    }
}
