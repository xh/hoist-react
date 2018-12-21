/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {FormModel} from '@xh/hoist/cmp/form';
import {observable, computed, action} from '@xh/hoist/mobx';
import {isFunction} from 'lodash';

import {AppOption} from './AppOption';

/**
 * Manages built-in setting of user preferences.
 * @private
 */
@HoistModel
export class OptionsDialogModel {

    @observable isOpen = false;
    @observable.ref options = [];
    @observable.ref changes = [];

    formModel = new FormModel();

    //-------------------
    // Setting options
    //-------------------
    @action
    setOptions(options) {
        // Ensure each is valid AppOption
        this.options = options.map(it => it instanceof AppOption ? it : new AppOption(it));

        // Add each AppOption to the FormModel
        this.options.forEach(it => this.formModel.addField(it));

        // Add change detection reaction
        this.addReaction({
            track: () => this.formModel.getData(),
            run: () => this.refreshChangedFields()
        });
    }

    @computed
    get hasOptions() {
        return !!this.options.length;
    }

    //-------------------
    // Change management
    //-------------------
    @action
    refreshChangedFields() {
        const changes = [];
        this.formModel.fields.forEach(it => {
            const {name} = it;
            if (it.isDirty) changes.push(name);
        });
        this.changes = changes;
    }

    @computed
    get hasChanges() {
        return !!this.changes.length;
    }

    @computed
    get requiresRefresh() {
        return this.hasChanges && this.changes.some(name => {
            const opt = this.getOption(name);
            return opt && opt.refreshRequired;
        });
    }

    //-------------------
    // Value management
    //-------------------
    getOption(name) {
        return this.options.find(it => it.name == name);
    }

    getExternalValue(name) {
        const {valueGetter} = this.getOption(name);
        return isFunction(valueGetter) ? valueGetter() : XH.prefService.get(name);
    }

    setExternalValue(name, value) {
        const {valueSetter} = this.getOption(name);
        if (isFunction(valueSetter)) {
            valueSetter(value);
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
        this.init();
    }

    @action
    hide() {
        this.isOpen = false;
    }

    init() {
        this.options.forEach(it => {
            it.init(this.getExternalValue(it.name));
        });
    }

    async saveAsync() {
        this.refreshChangedFields();
        if (!this.hasChanges) return;

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
                    }).linkTo(XH.appLoadModel);
                }
            });
        } else {
            this.doSaveAsync().then(() => {
                this.hide();
            }).linkTo(XH.appLoadModel);
        }
    }

    async doSaveAsync() {
        const data = this.formModel.getData();
        this.changes.forEach(name => {
            const value = data[name];
            this.setExternalValue(name, value);
        });
        return XH.prefService.pushPendingAsync();
    }

}