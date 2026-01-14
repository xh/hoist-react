/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FieldModel} from '@xh/hoist/cmp/form';
import {HoistModel} from '@xh/hoist/core';
import {maxSeverity, ValidationSeverity} from '@xh/hoist/data';
import {makeObservable} from '@xh/hoist/mobx';
import {uniq} from 'lodash';
import {action, computed, observable} from 'mobx';

export class FieldSetModel extends HoistModel {
    @observable.ref private fieldModelRegistry: FieldModel[] = [];
    @observable.ref private fieldSetModelRegistry: FieldSetModel[] = [];

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

    @computed
    private get fieldModels(): FieldModel[] {
        return [
            ...this.fieldModelRegistry,
            ...this.fieldSetModelRegistry.flatMap(it => it.fieldModels)
        ];
    }

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    addFieldModel(fieldModel: FieldModel) {
        this.fieldModelRegistry = uniq([...this.fieldModelRegistry, fieldModel]);
    }

    @action
    removeFieldModel(fieldModel: FieldModel) {
        this.fieldModelRegistry = this.fieldModelRegistry.filter(it => it !== fieldModel);
    }

    @action
    addFieldSetModel(fieldSetModel: FieldSetModel) {
        this.fieldSetModelRegistry = uniq([...this.fieldSetModelRegistry, fieldSetModel]);
    }

    @action
    removeFieldSetModel(fieldSetModel: FieldSetModel) {
        this.fieldSetModelRegistry = this.fieldSetModelRegistry.filter(it => it !== fieldSetModel);
    }
}
