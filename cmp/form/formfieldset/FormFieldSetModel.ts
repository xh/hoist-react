/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {CardModel} from '@xh/hoist/cmp/card/CardModel';
import {FieldModel} from '@xh/hoist/cmp/form';
import {type PersistOptions} from '@xh/hoist/core';
import {maxSeverity, ValidationSeverity} from '@xh/hoist/data';
import {makeObservable} from '@xh/hoist/mobx';
import {uniq, without} from 'lodash';
import {action, computed, observable} from 'mobx';

export interface FormFieldSetConfig {
    /** Can form field set be collapsed? */
    collapsible?: boolean;

    /** Default collapsed state. */
    defaultCollapsed?: boolean;

    /** True to disable all descendant fields. */
    disabled?: boolean;

    /** True to make all descendant fields readonly. */
    readonly?: boolean;

    /** Options governing persistence. */
    persistWith?: PersistOptions;
}

export class FormFieldSetModel extends CardModel {
    declare config: FormFieldSetConfig;

    @observable.ref parent: FormFieldSetModel;

    //-----------------
    // Implementation
    //-----------------
    @observable.ref private childFormFieldSetModels: FormFieldSetModel[] = [];
    @observable.ref private childFieldModels: FieldModel[] = [];
    @observable private isDisabled: boolean;
    @observable private isReadonly: boolean;

    @computed
    get disabled(): boolean {
        return this.isDisabled || this.parent?.disabled;
    }

    @computed
    get readonly(): boolean {
        return this.isReadonly || this.parent?.readonly;
    }

    @computed
    get displayedSeverity(): ValidationSeverity {
        return maxSeverity(
            this.fieldModels
                .filter(it => it.validationDisplayed)
                .flatMap(it => it.validationResults)
        );
    }

    @computed
    get displayedValidationMessages(): string[] {
        const ret: string[] = [],
            {displayedSeverity} = this;

        if (!displayedSeverity) return ret;

        return this.fieldModels
            .filter(it => it.validationDisplayed)
            .flatMap(it => it.validationResults)
            .filter(it => it.severity === displayedSeverity)
            .map(it => it.message);
    }

    constructor({disabled = false, readonly = false, ...rest}: FormFieldSetConfig = {}) {
        super({...rest, renderMode: 'always'});
        makeObservable(this);
        this.isDisabled = disabled;
        this.isReadonly = readonly;
    }

    @action
    setDisabled(disabled: boolean) {
        this.isDisabled = disabled;
    }

    @action
    setReadonly(readonly: boolean) {
        this.isReadonly = readonly;
    }

    //------------------------
    // Implementation
    //------------------------
    @computed
    private get fieldModels(): FieldModel[] {
        return [
            ...this.childFieldModels,
            ...this.childFormFieldSetModels.flatMap(it => it.fieldModels)
        ];
    }

    /** @internal */
    @action
    registerChildFieldModel(fieldModel: FieldModel) {
        this.childFieldModels = uniq([...this.childFieldModels, fieldModel]);
    }

    /** @internal */
    @action
    unregisterChildFieldModel(fieldModel: FieldModel) {
        this.childFieldModels = without(this.childFieldModels, fieldModel);
    }

    /** @internal */
    @action
    registerChildFormFieldSetModel(formFieldSetModel: FormFieldSetModel) {
        this.childFormFieldSetModels = uniq([...this.childFormFieldSetModels, formFieldSetModel]);
    }

    /** @internal */
    @action
    unregisterChildFormFieldSetModel(formFieldSetModel: FormFieldSetModel) {
        this.childFormFieldSetModels = without(this.childFormFieldSetModels, formFieldSetModel);
    }
}
