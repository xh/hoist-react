/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {FormModel} from '@xh/hoist/cmp/form';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {observable, computed, action} from '@xh/hoist/mobx';
import {allSettled} from '@xh/hoist/promise';
import {isFunction, values} from 'lodash';

import {AppOption} from './AppOption';

/**
 * Manages built-in setting of user preferences.
 * @private
 */
@HoistModel
export class OptionsDialogModel {

    @observable isOpen = false;
    @observable.ref options = [];

    loadModel = new PendingTaskModel();
    formModel = null;

    //-------------------
    // Setting options
    //-------------------
    @action
    setOptions(options) {
        // Ensure each is valid AppOption
        this.options = options.map(it => it instanceof AppOption ? it : new AppOption(it));

        // Create FormModel with FieldModels from AppOptions
        this.formModel = new FormModel({fields: this.options.map(it => it.fieldModel)});
    }

    @computed
    get hasOptions() {
        return !!this.options.length;
    }

    @computed
    get requiresRefresh() {
        return this.options.some(it => it.fieldModel.isDirty && it.refreshRequired);
    }

    //-------------------
    // Value management
    //-------------------
    getOption(name) {
        return this.options.find(it => it.fieldModel.name === name);
    }

    async getExternalValueAsync(name) {
        const {valueGetter} = this.getOption(name);
        return await (isFunction(valueGetter) ? valueGetter() : XH.prefService.get(name));
    }

    async setExternalValueAsync(name, value) {
        const {valueSetter} = this.getOption(name);
        if (isFunction(valueSetter)) {
            await valueSetter(value);
        } else {
            XH.prefService.set(name, value);
        }
    }

    //-------------------
    // Dialog
    //-------------------
    @action
    show() {
        this.isOpen = true;
        this.initAsync();
    }

    @action
    hide() {
        this.isOpen = false;
    }

    async initAsync() {
        const promises = values(this.formModel.fields).map(it => {
            return this.getExternalValueAsync(it.name).then(v => it.init(v));
        });
        await allSettled(promises).linkTo(this.loadModel);
    }

    async saveAsync() {
        await this.formModel.validateAsync();
        if (!this.formModel.isValid) return;

        if (this.requiresRefresh) {
            XH.confirm({
                title: 'Reload Required',
                message: 'App requires reload for your changes to take effect',
                confirmText: 'Reload now',
                onConfirm: () => {
                    this.doSaveAsync().then(() => {
                        this.hide();
                        XH.reloadApp();
                    }).linkTo(this.loadModel);
                }
            });
        } else {
            this.doSaveAsync().then(() => {
                this.hide();
            }).linkTo(this.loadModel);
        }
    }

    async doSaveAsync() {
        const promises = values(this.formModel.fields).map(it => {
            const {name, value} = it;
            return this.setExternalValueAsync(name, value);
        });
        await allSettled(promises);
        return XH.prefService.pushPendingAsync();
    }

}