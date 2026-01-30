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
import {uniq} from 'lodash';
import {action, computed, observable} from 'mobx';

export interface FormFieldSetConfig {
    /** Can form field set be collapsed? */
    collapsible?: boolean;

    /** Default collapsed state. */
    defaultCollapsed?: boolean;

    /** True to disable all descendant fields. */
    disabled?: boolean;

    /** Options governing persistence. */
    persistWith?: PersistOptions;
}

export class FormFieldSetModel extends CardModel {
    declare config: FormFieldSetConfig;

    @observable.ref parent: FormFieldSetModel | null;

    //-----------------
    // Implementation
    //-----------------
    @observable.ref private formFieldSetModelRegistry: FormFieldSetModel[] = [];
    @observable.ref private fieldModelRegistry: FieldModel[] = [];
    @observable private isDisabled: boolean;

    @computed
    get disabled(): boolean {
        return this.isDisabled || this.ancestors.some(it => it.isDisabled);
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
        this.fieldModels.forEach(fieldModel => {
            if (!fieldModel.validationDisplayed) return;
            fieldModel.validationResults.forEach(validationResult => {
                if (validationResult.severity === displayedSeverity) {
                    ret.push(validationResult.message);
                }
            });
        });
        return ret;
    }

    constructor({disabled = false, ...rest}: FormFieldSetConfig = {}) {
        super({...rest, renderMode: 'always'});
        makeObservable(this);
        this.isDisabled = disabled;
    }

    @action
    setDisabled(disabled: boolean) {
        this.isDisabled = disabled;
    }

    //------------------------
    // Implementation
    //------------------------
    @computed
    private get ancestors(): FormFieldSetModel[] {
        return this.parent ? [this.parent, ...this.parent.ancestors] : [];
    }

    @computed
    private get fieldModels(): FieldModel[] {
        return [
            ...this.fieldModelRegistry,
            ...this.formFieldSetModelRegistry.flatMap(it => it.fieldModels)
        ];
    }

    /** @internal */
    @action
    registerChildFieldModel(fieldModel: FieldModel) {
        this.fieldModelRegistry = uniq([...this.fieldModelRegistry, fieldModel]);
    }

    /** @internal */
    @action
    unregisterChildFieldModel(fieldModel: FieldModel) {
        this.fieldModelRegistry = this.fieldModelRegistry.filter(it => it !== fieldModel);
    }

    /** @internal */
    @action
    registerChildFormFieldSetModel(formFieldSetModel: FormFieldSetModel) {
        this.formFieldSetModelRegistry = uniq([
            ...this.formFieldSetModelRegistry,
            formFieldSetModel
        ]);
    }

    /** @internal */
    @action
    unregisterChildFormFieldSetModel(formFieldSetModel: FormFieldSetModel) {
        this.formFieldSetModelRegistry = this.formFieldSetModelRegistry.filter(
            it => it !== formFieldSetModel
        );
    }
}
