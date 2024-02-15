/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {AppOptionSpec, HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {assign, mapValues, pickBy} from 'lodash';
import {isOmitted} from '@xh/hoist/utils/impl';
import {resolve} from '../promise/Promise';
import {AppOption} from './AppOption';

/**
 * Manages built-in setting of options.
 * @internal
 */
export class OptionsDialogModel extends HoistModel {
    override xhImpl = true;

    @observable isOpen = false;
    @observable.ref options = [];

    @managed
    loadTask = TaskObserver.trackLast();

    @managed
    formModel = null;

    constructor() {
        super();
        makeObservable(this);
    }

    init() {
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.hide()
        });
    }

    //-------------------
    // Setting options
    //-------------------
    setOptions(options: AppOptionSpec[]) {
        this.options = options.filter(o => !isOmitted(o)).map(o => new AppOption(o));
        const fields = this.options.map(o => assign({name: o.name}, o.fieldModel));
        this.formModel = new FormModel({fields, xhImpl: true});
    }

    get hasOptions(): boolean {
        return !!this.options.length;
    }

    @computed
    get reloadRequired(): boolean {
        const {formModel} = this;
        return (
            formModel &&
            this.options.some(o => formModel.fields[o.name].isDirty && o.reloadRequired)
        );
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

    @action
    toggleVisibility() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    async initAsync() {
        const {formModel} = this;
        const promises = this.options.map(option => {
            return option.getValueAsync().then(v => formModel.fields[option.name].init(v));
        });
        await Promise.allSettled(promises).linkTo(this.loadTask);
    }

    async saveAsync(): Promise<void> {
        await this.formModel.validateAsync();
        if (!this.formModel.isValid) return;

        const reloadApp = this.reloadRequired;

        if (reloadApp) {
            this.loadTask.setMessage('Reloading app to apply changes...');
        }

        resolve()
            .then(() => this.doSaveAsync())
            .wait(1000)
            .then(() => {
                this.hide();
                if (reloadApp) {
                    XH.reloadApp();
                } else {
                    XH.refreshAppAsync();
                }
            })
            .linkTo(this.loadTask)
            .catchDefault();
    }

    async doSaveAsync(): Promise<void> {
        const {formModel} = this,
            dirtyFields = pickBy(formModel.fields, {isDirty: true}),
            promises = this.options
                .filter(o => dirtyFields[o.name])
                .map(o => o.setValueAsync(o.name, dirtyFields[o.name].value));
        await Promise.allSettled(promises);
        await XH.prefService.pushPendingAsync();

        XH.track({
            message: 'Changed options',
            category: 'App',
            data: mapValues(dirtyFields, f => ({value: f.value, oldValue: f.initialValue}))
        });
    }
}
