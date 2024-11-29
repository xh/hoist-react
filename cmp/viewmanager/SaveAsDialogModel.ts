/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {ViewInfo} from '@xh/hoist/cmp/viewmanager/ViewInfo';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {makeObservable, action, observable} from '@xh/hoist/mobx';
import {View} from './View';
import {ViewManagerModel} from './ViewManagerModel';

/**
 * Backing model for ViewManagerModel's SaveAs
 */
export class SaveAsDialogModel extends HoistModel {
    readonly parent: ViewManagerModel;

    @managed readonly formModel: FormModel;
    @observable isOpen: boolean = false;

    private resolveOpen: (value: View) => void;

    get type(): string {
        return this.parent.viewType;
    }

    get typeDisplayName(): string {
        return this.parent.typeDisplayName;
    }

    get globalDisplayName(): string {
        return this.parent.globalDisplayName;
    }

    constructor(parent: ViewManagerModel) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.formModel = this.createFormModel();
    }

    @action
    openAsync(): Promise<View> {
        this.formModel.init(this.parent.view.info ?? {});
        this.isOpen = true;

        return new Promise(resolve => (this.resolveOpen = resolve));
    }

    cancel() {
        this.close();
        this.resolveOpen(null);
    }

    async saveAsAsync() {
        return this.doSaveAsAsync().linkTo(this.parent.saveTask);
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
                        required,
                        lengthIs({max: ViewInfo.NAME_MAX_LENGTH}),
                        ({value}) => {
                            if (this.parent.views.some(view => view.name === value?.trim())) {
                                return `An entry with name "${value}" already exists`;
                            }
                        }
                    ]
                },
                {name: 'description'}
            ]
        });
    }

    private async doSaveAsAsync() {
        const {formModel, parent, type} = this,
            {name, description} = formModel.getData(),
            isValid = await formModel.validateAsync();

        if (!isValid) return;

        try {
            const blob = await XH.jsonBlobService.createAsync({
                type,
                name,
                description,
                value: parent.getValue()
            });
            this.close();
            this.resolveOpen(View.fromBlob(blob, this.parent));
        } catch (e) {
            XH.handleException(e);
        }
    }

    @action
    private close() {
        this.isOpen = false;
        this.formModel.init();
    }
}
