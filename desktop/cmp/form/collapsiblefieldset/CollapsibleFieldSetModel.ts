/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {CollapsibleSetModel} from '@xh/hoist/cmp/collapsibleset/CollapsibleSetModel';
import {FieldModel} from '@xh/hoist/cmp/form';
import {type PersistOptions} from '@xh/hoist/core';
import {maxSeverity, ValidationSeverity} from '@xh/hoist/data';
import {makeObservable} from '@xh/hoist/mobx';
import {uniq} from 'lodash';
import {action, computed, observable} from 'mobx';

export interface CollapsibleFieldSetConfig {
    /** Default collapsed state. */
    defaultCollapsed?: boolean;

    /** True to disable all descendant fields. */
    disabled?: boolean;

    /** Options governing persistence. */
    persistWith?: PersistOptions;
}

export class CollapsibleFieldSetModel extends CollapsibleSetModel {
    declare config: CollapsibleFieldSetConfig;

    @observable.ref parent: CollapsibleFieldSetModel | null;

    //-----------------
    // Implementation
    //-----------------
    @observable.ref private collapsibleFieldSetModelRegistry: CollapsibleFieldSetModel[] = [];
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

    constructor({disabled = false, ...rest}: CollapsibleFieldSetConfig = {}) {
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
    private get ancestors(): CollapsibleFieldSetModel[] {
        return this.parent ? [this.parent, ...this.parent.ancestors] : [];
    }

    @computed
    private get fieldModels(): FieldModel[] {
        return [
            ...this.fieldModelRegistry,
            ...this.collapsibleFieldSetModelRegistry.flatMap(it => it.fieldModels)
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
    registerChildCollapsibleFieldSetModel(collapsibleFieldSetModel: CollapsibleFieldSetModel) {
        this.collapsibleFieldSetModelRegistry = uniq([
            ...this.collapsibleFieldSetModelRegistry,
            collapsibleFieldSetModel
        ]);
    }

    /** @internal */
    @action
    unregisterChildCollapsibleFieldSetModel(collapsibleFieldSetModel: CollapsibleFieldSetModel) {
        this.collapsibleFieldSetModelRegistry = this.collapsibleFieldSetModelRegistry.filter(
            it => it !== collapsibleFieldSetModel
        );
    }
}
