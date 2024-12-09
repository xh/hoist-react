/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {makeObservable, action, observable} from '@xh/hoist/mobx';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';

/**
 * Backing model for ViewManagerModel's SaveAs
 */
export class SaveAsDialogModel extends HoistModel {
    readonly parent: ViewManagerModel;

    @managed readonly formModel: FormModel;
    @observable isOpen: boolean = false;

    get type(): string {
        return this.parent.type;
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
    open() {
        const src = this.parent.view,
            name = !src.name.startsWith('Copy of') ? `Copy of ${src.name}` : src.name;
        this.formModel.init({
            name,
            group: src.group,
            description: null,
            isShared: false
        });
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    async saveAsAsync() {
        try {
            await this.doSaveAsAsync().linkTo(this.parent.saveTask);
            this.close();
        } catch (e) {
            XH.handleException(e);
        }
    }

    //------------------------
    // Implementation
    //------------------------
    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    rules: [({value}) => this.parent.validateViewNameAsync(value)]
                },
                {name: 'group'},
                {name: 'description'},
                {name: 'isShared'}
            ]
        });
    }

    private async doSaveAsAsync() {
        let {formModel, parent} = this,
            {name, group, description, isShared} = formModel.getData(),
            isValid = await formModel.validateAsync();

        if (!isValid) return;

        return parent.saveAsAsync({
            name: name.trim(),
            group: group?.trim(),
            description: description?.trim(),
            isShared
        });
    }
}
