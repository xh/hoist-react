/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    PlainObject
} from '@xh/hoist/core';
import {ValidationState} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {flatMap, forEach, forOwn, isString, map, mapValues, pickBy, some, values} from 'lodash';
import {BaseFieldConfig, BaseFieldModel} from './field/BaseFieldModel';
import {FieldModel} from './field/FieldModel';
import {SubformsFieldConfig, SubformsFieldModel} from './field/SubformsFieldModel';
import {LocalDate} from '@xh/hoist/utils/datetime';

export interface FormConfig {
    /**
     * FieldModels, or configurations to create them, for all data fields managed by this FormModel.
     */
    fields?: Array<BaseFieldModel | BaseFieldConfig | SubformsFieldConfig | SubformsFieldModel>;

    /** Map of initial values for fields in this model. */
    initialValues?: PlainObject;

    /** Options governing persistence of the form state. */
    persistWith?: FormPersistOptions;

    disabled?: boolean;
    readonly?: boolean;

    /** @internal */
    xhImpl?: boolean;
}

export interface FormPersistOptions extends PersistOptions {
    /** If persisting only a subset of all fields, provide an array of field names. */
    fieldsToPersist?: string[];
}

/**
 * FormModel is the main entry point for Form specification. This Model's `fields` collection holds
 * multiple FieldModel instances, which in turn hold the state of user edited data and the
 * validation rules around editing that data.
 *
 * A complete representation of all fields and data within a Form can be produced via this model's
 * `getData()` method, making it easy to harvest all values for e.g. submission to a server.
 *
 * Individual field values are also available as observables via this model's `values` proxy. An
 * application model can setup a reaction to track changes to any value and execute app-specific
 * logic such as disabling one field based on the state of another, or setting up cascading options.
 *
 * This Model provides an overall validation state, determined by the current validation state of
 * its fields as per their configured rules and constraints.
 *
 * FormModels can be nested via SubformsFieldModels, a specialized type of FieldModel that itself
 * manages a collection of child FormModels. This allows use cases where Forms support editing of
 * dynamic collections of complex objects with their own internal validation rules (e.g. a FormModel
 * representing a market order might have multiple nested FormModels to represent execution splits,
 * where each split has its own internal fields for broker, quantity, and time).
 *
 * @see FieldModel for details on state and validation maintained at the individual field level.
 */
export class FormModel extends HoistModel {
    /** Container object for FieldModel instances, keyed by field name.*/
    @observable.ref
    fields: Record<string, BaseFieldModel> = {};

    /** All FieldModel instances. */
    @managed
    get fieldList(): BaseFieldModel[] {
        return values(this.fields);
    }

    parent: FormModel = null;
    @bindable disabled: boolean;
    @bindable readonly: boolean;

    private valuesProxy = this.createValuesProxy();

    /**
     * @returns proxy for access to observable field values, keyed by field name.
     *
     * Read field value(s) off of this object within a reaction's track or component render function
     * to react to changes to those specific values - e.g. to disable one field based on the value
     * of another. This proxy is also passed to validation rules to facilitate reactive cross-field
     * validation - e.g. marking a field as invalid due to a change in another.
     *
     * See {@link getData} instead if you need to get or react to the values of *any/all* fields.
     */
    get values(): PlainObject {
        return this.valuesProxy;
    }

    constructor({
        fields = [],
        initialValues = {},
        disabled = false,
        persistWith = null,
        readonly = false,
        xhImpl = false
    }: FormConfig = {}) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        this.disabled = disabled;
        this.readonly = readonly;
        const models = {};

        fields.forEach((f: any) => {
            const model =
                    f instanceof BaseFieldModel
                        ? f
                        : f.subforms
                          ? new SubformsFieldModel(f)
                          : new FieldModel(f),
                {name} = model;
            throwIf(models[name], 'Form cannot contain multiple fields with same name: ' + name);
            models[name] = model;
        });
        this.fields = models;

        this.init(initialValues);
        if (persistWith) this.initPersist(persistWith);

        // Set the owning formModel *last* after all fields in place with data.
        // This (currently) kicks off the validation and other reactivity.
        forOwn(this.fields, f => {
            f.formModel = this;
            f.xhImpl = xhImpl;
        });
    }

    getField(fieldName: string): BaseFieldModel {
        return this.fields[fieldName];
    }

    /**
     * Snapshot of current field values, keyed by field name.
     *
     * Call within a reaction's track or component render function to react to *any* field change.
     * See {@link values} instead if you need to get or react to the value of a *single* field.
     *
     * @param dirtyOnly - true to include only dirty field values in the return
     */
    getData(dirtyOnly: boolean = false): PlainObject {
        const fields = dirtyOnly ? pickBy(this.fields, f => f.isDirty) : this.fields;
        return mapValues(fields, v => v.getData());
    }

    /**
     * Reset fields to initial values and reset validation.
     *
     * This is typically used by interfaces to restore a 'dirty' user-modified form to a state
     * where all field values are at their initial values.
     */
    @action
    reset() {
        forOwn(this.fields, m => m.reset());
    }

    /**
     * Set the initial value of all fields and reset the form.
     *
     * This is the main programmatic entry point for loading new data (or an empty new record)
     * into the form for editing. If initial values are undefined for any field, the original
     * initial values specified during model construction will be used.
     *
     * @param initialValues - map of field name to value.
     */
    @action
    init(initialValues: PlainObject = {}) {
        forOwn(this.fields, m => m.init(initialValues[m.name]));
    }

    /**
     * Set the value of one or more fields on this form.
     *
     * @param values - map of field name to value.
     */
    @action
    setValues(values: PlainObject) {
        const {fields} = this;
        forEach(values, (v, k) => fields[k]?.setValue(v));
    }

    /** True if any fields have been changed since last reset/init. */
    @computed
    get isDirty(): boolean {
        return some(this.fields, m => m.isDirty);
    }

    //-----------------------------------
    // Focus Management
    //-----------------------------------
    /**
     * The Field that is currently focused on this form.
     *
     * @see FieldModel.focus() for important information on this method
     * and its limitations.
     */
    @computed
    get focusedField(): BaseFieldModel {
        return this.fieldList.find(f => f.hasFocus);
    }

    /**
     * Focus a field on this form.
     *
     * @see FieldModel.focus() for important information on this method
     * and its limitations.
     */
    focusField(name: string) {
        this.getField(name)?.focus();
    }

    //------------------------
    // Validation
    //------------------------
    @computed
    get validationState(): ValidationState {
        const states = map(this.fields, m => m.validationState);
        if (states.includes('NotValid')) return 'NotValid';
        if (states.includes('Unknown')) return 'Unknown';
        return 'Valid';
    }

    /** True if any fields are currently recomputing their validation state. */
    @computed
    get isValidationPending(): boolean {
        return some(this.fields, m => m.isValidationPending);
    }

    /** True if all fields are valid. */
    get isValid(): boolean {
        return this.validationState == 'Valid';
    }

    /** List of all validation errors for this form. */
    get allErrors(): string[] {
        return flatMap(this.fields, s => s.allErrors);
    }

    /**
     * Recompute all validations and return true if the form is valid.
     *
     * @param opts - set 'display' to true to trigger the display of
     *  validation errors (if any) by bound FormField components after validation
     *  is complete.
     */
    async validateAsync(opts?: {display?: boolean}): Promise<boolean> {
        const {display = true} = opts ?? {},
            promises = map(this.fields, m => m.validateAsync({display}));
        await Promise.all(promises);
        return this.isValid;
    }

    /** Trigger the display of validation errors (if any) by bound FormField components. */
    displayValidation() {
        forOwn(this.fields, m => m.displayValidation());
    }

    //------------------------
    // Implementation
    //------------------------
    private createValuesProxy() {
        const me = this;
        return new Proxy(
            {},
            {
                get(target, name, receiver) {
                    // Allows Inspector to detect this as a proxy.
                    if (name === '_xhIsProxy') return true;

                    const field = me.fields[name as string];
                    if (field?.isFieldModel) {
                        return field.getDataOrProxy();
                    }

                    const parent = name === 'parent' ? me.parent : null;
                    if (parent) return parent.values;

                    return undefined;
                }
            }
        );
    }

    private initPersist({
        fieldsToPersist = null,
        path = 'form',
        ...rootPersistWith
    }: FormPersistOptions) {
        const fieldNameMap = fieldsToPersist || Object.keys(this.fields);

        fieldNameMap.forEach(name => {
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.${name}.value`,
                    ...rootPersistWith
                },
                target: {
                    getPersistableState: () => {
                        return new PersistableState(this.fields[name].value);
                    },
                    setPersistableState: ({value}) => {
                        // There is no metadata on a field to denote it is a date.
                        // Use a regex matcher to tests for dates and format matches accurately.
                        if (isString(value) && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            this.setValues({[name]: LocalDate.from(value)});
                            return;
                        }

                        this.setValues({[name]: value});
                    }
                },
                owner: this
            });
        });
    }
}
