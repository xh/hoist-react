/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {managed, PlainObject, XH} from '@xh/hoist/core';
import {ValidationState} from '@xh/hoist/data';
import {action, computed, makeObservable, override} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {clone, defaults, isEqual, flatMap, isArray, partition, without} from 'lodash';
import {executeIfFunction, withDefault} from '../../../utils/js';
import {FormModel} from '../FormModel';
import {BaseFieldModel, BaseFieldConfig} from './BaseFieldModel';
import {FormConfig} from '../FormModel';

export interface SubformsFieldConfig extends BaseFieldConfig {
    /**
     * Config for a {@link FormModel} to be auto-created to manage and validate the data for each
     *
     */
    subforms: FormConfig;

    /**
     * Initial value of this field. If a function, will be executed dynamically when form is
     * initialized to provide value.
     */
    initialValue?: any[];
}

export interface SubformAddOptions {
    /** Initial values for the new object/subform. */
    initialValues?: PlainObject;
    /** Index within the collection where the new subform should be inserted. */
    index?: number;
}

/**
 * A data field in a form whose value is a collection of nested objects - all of the same shape, but
 * with arbitrary internal complexity. A dedicated {@link FormModel} is auto-created to manage and
 * validate each object independently.
 *
 * Applications should initialize this field with an array of objects. These values will be loaded
 * into an array of managed FormModels which will form the value of this field.
 *
 * Applications should *not* modify the value property directly, unless they wish to reinitialize
 * all existing form contents to new values. Call {@link add} or {@link remove} on one of these
 * fields to adjust the contents of its collection while preserving existing state.
 *
 * Validation rules for the entire collection may be specified as for any field, but validations on
 * the subforms will also bubble up to this field, affecting its overall validation state.
 */
export class SubformsFieldModel extends BaseFieldModel {
    /** (Sub)FormModels created by this model, tracked to support cleanup. */
    @managed private createdModels: FormModel[] = [];

    private formConfig: FormConfig = null;
    private readonly origInitialValues: any[];

    constructor({subforms, initialValue = [], ...rest}: SubformsFieldConfig) {
        super(rest);
        makeObservable(this);
        this.formConfig = subforms;
        this.origInitialValues = initialValue;
        this.init(initialValue);
    }

    //-----------------------------
    // Overrides
    //-----------------------------
    override get hasFocus(): boolean {
        return false;
    }
    override focus() {}
    override blur() {}

    override getDataOrProxy() {
        return this.value.map(s => s.values);
    }

    override getData(): any[] {
        return this.value.map(s => s.getData());
    }

    @override
    override init(value: any) {
        value = executeIfFunction(withDefault(value, this.origInitialValues));
        this.initialValue = this.parseValue(value);
        this.reset();
        this.cleanupModels();
    }

    @override
    override setValue(v: any) {
        super.setValue(this.parseValue(v));
        this.cleanupModels();
    }

    override get formModel(): FormModel {
        return super.formModel; // Need to define setter/getter pair together - see below.
    }

    override set formModel(formModel: FormModel) {
        super.formModel = formModel;
        this.value.forEach(s => (s.parent = formModel));

        this.addAutorun(() => {
            const {disabled, readonly, value} = this;
            value.forEach(sub => {
                sub.setDisabled(disabled);
                sub.setReadonly(readonly);
            });
        });
    }

    @computed
    override get allErrors(): string[] {
        const subErrs = flatMap(this.value, s => s.allErrors);
        return [...this.errors, ...subErrs];
    }

    @override
    override reset() {
        super.reset();
        this.value.forEach(s => s.reset());
    }

    @override
    override displayValidation(includeSubforms: boolean = true) {
        super.displayValidation(includeSubforms);
        if (includeSubforms) {
            this.value.forEach(s => s.displayValidation());
        }
    }

    @computed
    override get isValidationPending(): boolean {
        return this.value.some(m => m.isValidationPending) || super.isValidationPending;
    }

    @computed
    override get isDirty(): boolean {
        // Catch changed values within subforms, as well as adds/deletes/sorts
        const {value, initialValue} = this;
        return (
            value.some(s => s.isDirty) ||
            !isEqual(
                initialValue.map(s => s.getData()),
                value.map(s => s.getData())
            )
        );
    }

    @override
    override async validateAsync(opts: {display?: boolean} = {}): Promise<boolean> {
        const {display = true} = opts,
            promises = this.value.map(m => m.validateAsync({display}));
        promises.push(super.validateAsync({display}));
        await Promise.all(promises);
        return this.isValid;
    }

    protected override deriveValidationState(): ValidationState {
        const states = this.value.map(s => s.validationState);
        states.push(super.deriveValidationState());

        if (states.includes('NotValid')) return 'NotValid';
        if (states.includes('Unknown')) return 'Unknown';
        return 'Valid';
    }

    //-----------------------------
    // Collection management
    //-----------------------------
    /** Add a new object (subform) to this field's collection. */
    @action
    add(opts: SubformAddOptions = {}) {
        const {initialValues = {}, index = this.value.length} = opts,
            newSubforms = this.parseValue([initialValues]),
            newValue = clone(this.value);

        newValue.splice(index, 0, ...newSubforms);

        this.value = newValue;
    }

    @action
    remove(formModel: FormModel) {
        this.value = without(this.value, formModel);
        this.cleanupModels();
    }

    //-----------------------
    // Implementation
    //----------------------
    private parseValue(externalVal: any[]): FormModel[] {
        throwIf(!isArray(externalVal), 'Value of a SubformsField must be an array.');

        const {formConfig, createdModels} = this;
        return externalVal.map(v => {
            const initialValues = defaults({}, v, formConfig.initialValues),
                ret = new FormModel({...formConfig, initialValues});

            ret.parent = this.formModel;
            createdModels.push(ret);
            return ret;
        });
    }

    private cleanupModels() {
        // destroy any models we know we are finished with early..
        const {createdModels, initialValue, value} = this,
            [keep, destroy] = partition(
                createdModels,
                m => initialValue.includes(m) || value.includes(m)
            );
        this.createdModels = keep;
        XH.safeDestroy(destroy);
    }
}
