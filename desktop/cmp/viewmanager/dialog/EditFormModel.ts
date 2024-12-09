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
import {ReactNode} from 'react';

/**
 * Backing model for EditForm
 */
export class EditFormModel extends HoistModel {
    parent: ManageDialogModel;

    @managed formModel: FormModel;
    @observable.ref view: ViewInfo;

    @action
    setView(view: ViewInfo) {
        const {formModel} = this;
        this.view = view;
        if (view) {
            formModel.init(view);
            formModel.readonly = !view.isEditable;
        }
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
            {name, group, description, isGlobal, isDefaultPinned, isShared} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            isDirty = formModel.isDirty;

        if (!isValid || !isDirty) return;

        throwIf(
            (view.isGlobal || isGlobal) && !manageGlobal,
            `Cannot save changes to ${globalDisplayName} ${typeDisplayName} - missing required permission.`
        );
        const oldIsPublic = view.isShared || view.isGlobal,
            newIsPublic = isShared || isGlobal;

        if (oldIsPublic != newIsPublic) {
            const msg: ReactNode = !newIsPublic
                ? span(
                      `The selected ${typeDisplayName} will revert to being private to you `,
                      strong('It will no longer be available to other users.')
                  )
                : `This ${typeDisplayName} will become visible to all other ${XH.appName} users.`;
            const msgs = [msg, 'Are you sure you want to proceed?'];

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

        await parent.updateAsync(view, {
            name,
            group,
            description,
            isGlobal,
            isShared,
            isDefaultPinned
        });
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
                {name: 'group'},
                {name: 'description'},
                {name: 'isShared'},
                {name: 'isGlobal'},
                {name: 'isDefaultPinned'}
            ]
        });
    }
}
