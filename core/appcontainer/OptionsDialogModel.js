/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, computed, action, extendObservable, settable} from '@xh/hoist/mobx';
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

    //-------------------
    // Setting options
    //-------------------
    @action
    setOptions(options) {
        // Ensure each is valid AppOption
        this.options = options.map(it => it instanceof AppOption ? it : new AppOption(it));

        const obs = {};
        this.options.forEach(it => {
            const {field} = it;

            // Wire up observables & setters
            obs[field] = this.getExternalValue(field);
            settable(this, field);

            // Add change detection reaction
            this.addReaction({
                track: () => this[field],
                run: (v) => this.refreshChangedFields()
            });
        });
        extendObservable(this, obs);
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
        this.options.forEach(it => {
            const {field} = it;
            if (this[field] != this.getExternalValue(field)) changes.push(field);
        });
        this.changes = changes;
    }

    @computed
    get hasChanges() {
        return !!this.changes.length;
    }

    @computed
    get requiresRefresh() {
        return this.hasChanges && this.changes.some(field => {
            const opt = this.getOption(field);
            return opt && opt.refreshRequired;
        });
    }

    //-------------------
    // Value management
    //-------------------
    getOption(field) {
        return this.options.find(it => it.field == field);
    }

    getExternalValue(field) {
        const {valueGetter} = this.getOption(field);
        return isFunction(valueGetter) ? valueGetter() : XH.prefService.get(field);
    }

    setExternalValue(field, value) {
        const {valueSetter} = this.getOption(field);
        if (isFunction(valueSetter)) {
            valueSetter(value);
        } else {
            XH.prefService.set(field, value);
        }
    }

    //-------------------
    // Dialog
    //-------------------
    @action
    show() {
        this.isOpen = true;
        this.reset();
    }

    @action
    hide() {
        this.isOpen = false;
    }

    @action
    reset() {
        // Loop all fields, set to pref value
        this.options.forEach(it => {
            const {field} = it;
            this[field] = this.getExternalValue(field);
        });
        this.refreshChangedFields();
    }

    save() {
        this.refreshChangedFields();
        if (!this.hasChanges) return;

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
        this.changes.forEach(field => {
            this.setExternalValue(field, this[field]);
        });
        return XH.prefService.pushPendingAsync();
    }

}