/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p, span, strong} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {ManageDialogModel} from './ManageDialogModel';
import {makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {ViewInfo} from '@xh/hoist/cmp/viewmanager';
import {action, observable} from 'mobx';

/**
 * Backing model for EditForm
 */
export class EditFormModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;
    @observable.ref view: ViewInfo;

    @action
    setView(view: ViewInfo) {
        const {formModel, parent} = this;
        this.view = view;
        if (!view) return null;
        formModel.init(view);
        formModel.readonly = view.isGlobal && !parent.manageGlobal;
    }

    get loadTask(): TaskObserver {
        return this.parent.loadModel;
    }

    get showSaveButton(): boolean {
        const {formModel, parent} = this;
        return formModel.isDirty && !formModel.readonly && !parent.loadModel.isPending;
    }

    constructor(parent: ManageDialogModel) {
        super();
        makeObservable(this);
        this.formModel = this.createFormModel();
        this.parent = parent;
    }

    async saveAsync() {
        const {parent, view, formModel} = this,
            {manageGlobal, typeDisplayName, globalDisplayName} = parent,
            {name, description, isGlobal} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            isDirty = formModel.isDirty;

        if (!isValid || !isDirty) return;

        throwIf(
            (view.isGlobal || isGlobal) && !manageGlobal,
            `Cannot save changes to ${globalDisplayName} ${typeDisplayName} - missing required permission.`
        );

        if (isGlobal != view.isGlobal) {
            const msgs = [];
            if (isGlobal) {
                msgs.push(
                    `This ${typeDisplayName} will become visible to all other ${XH.appName} users.`
                );
            } else {
                msgs.push(
                    span(
                        `The selected ${typeDisplayName} will revert to being private `,
                        strong('It will no longer be available to ALL users.')
                    )
                );
                if (view.owner != XH.getUsername()) {
                    msgs.push(
                        `The selected ${typeDisplayName} will revert to being private to its owner (${view.owner}).`,
                        `Note that you will no longer have access to this ${typeDisplayName} and will not be able to undo this change.`
                    );
                }
            }

            msgs.push('Are you sure you want to proceed?');

            const confirmed = await XH.confirm({
                message: fragment(msgs.map(m => p(m))),
                confirmProps: {
                    text: 'Yes, update visibility',
                    outlined: true,
                    autoFocus: false,
                    intent: 'primary'
                }
            });
            if (!confirmed) return;
        }

        await parent.updateAsync(view, name, description, isGlobal);
    }

    //------------------------
    // Implementation
    //------------------------
    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    rules: [
                        async ({value}) => {
                            return this.parent.viewManagerModel.validateViewNameAsync(
                                value,
                                this.view
                            );
                        }
                    ]
                },
                {name: 'description'},
                {name: 'isGlobal', displayName: 'Global'}
            ]
        });
    }
}
