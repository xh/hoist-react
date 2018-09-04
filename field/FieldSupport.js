/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {defaultMethods, chainMethods} from '@xh/hoist/utils/js';
import {startCase, partition, isFunction, isEmpty, isString, forOwn} from 'lodash';

import {Field} from './Field';
import {FieldsModel} from './impl/FieldsModel';
import {bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {ValidationState} from './validation/ValidationState';


/**
 * Mixin to add field support to a Hoist Model.
 *
 * Includes support for field display names, validation, and dirty state when used
 * in conjunction with the property-level `@field` decorator (below). Note that the use
 * of this mixin requires a call to `initFields()` within the Model's constructor.
 *
 * @mixin
 */
export function FieldSupport(C) {

    C.hasFieldSupport = true;

    defaultMethods(C, {

        //-----------------------------
        // Lifecycle + Accessors
        //-----------------------------
        /**
         * Initialize this mixin.  Will set all fields to their initial values to be used as the
         * baseline for dirty state and to support `resetFields()`.
         *
         * This method must be called once, before accessing the public APIs in this mixin.
         *
         * @param {Object} values - map of values by field name.
         *      For any field not present in map, initialValue will be set to null.
         */
        initFields(values = {}) {
            this.ensureFieldsModelCreated();
            this.fieldsModel.initFields(values);
        },

        /** @member {Field[]} -  all fields in this model. */
        fields: {
            get() {return this.fieldsModel.fields}
        },

        /**
         * Lookup a field in this model by name.
         * @param {string} name
         * @returns {Field}
         */
        getField(name) {
            return this.fieldsModel.getField(name);
        },

        /**
         * Reset fields to initial values and reset validation.
         */
        resetFields() {
            this.fieldsModel.resetFields();
        },

        //--------------------------
        // Validation
        //---------------------------
        /** @member {ValidationState} - the current validation state. */
        validationState: {
            get() {return this.fieldsModel.validationState}
        },

        /**
         * True if any of the fields contained in this model are in the process
         * of recomputing their validation state.
         */
        isValidationPending: {
            get() {return this.fieldsModel.isValidationPending}
        },

        /** True if all fields are valid. */
        isValid: {
            get() {return this.validationState == ValidationState.Valid}
        },

        /** True if any fields are not valid. */
        isNotValid: {
            get() {return this.validationState == ValidationState.NotValid}
        },

        /**
         * Trigger an immediate validation of all fields.
         * @returns {Promise<ValidationState>}
         */
        async validateAsync() {
            return this.fieldsModel.validateAsync();
        },

        //----------------------------
        // Dirty State
        //----------------------------
        /**
         * True if any fields have been changed since last reset/initialization.
         */
        isDirty: {
            get() {return this.fieldsModel.isDirty}
        },
        
        //------------------------
        // Implementation
        //------------------------
        fieldsModel: {
            get() {
                throwIf(!this._fieldsModel,
                    `Attempted to access fields before calling initFields().  Call initFields() in the
                    constructor of your model class. `
                );
                return this._fieldsModel;
            }
        },

        ensureFieldsModelCreated() {
            if (this._fieldsModel) return;

            const fields = {};
            if (this._xhFieldConfigs) {
                forOwn(this._xhFieldConfigs, ({displayName, rules}, name) => {
                    fields[name] = new Field({
                        name,
                        displayName,
                        rules,
                        model: this
                    });
                });
            }
            this._fieldsModel = new FieldsModel(fields);
        }
    });

    chainMethods(C, {
        destroy() {
            XH.safeDestroy(this._fieldsModel);
        }
    });

    return C;
}


/**
 * Decorator to mark a class property as an observable form field.
 * For use on a HoistModel decorated with `@FieldSupport`.
 *
 * This decorator will mark the property as `@bindable` and add support for validation, labelling,
 * and dirty state management.
 *
 * If the first arg to this function is a String, it will be interpreted as the field displayName.
 * If not specified, the start case of the property itself will be used for a display name.
 *
 * All other arguments will be considered to be specifications for validation for this field.
 * Arguments may be specified as configurations for a {@link Rule} or as individual functions
 * (constraints). In the latter case the constraints will be gathered into a single rule to be
 * added to this field.
 */
export function field(...params) {
    return (target, property, descriptor) => {

        // 0) Prepare static property on class itself to host field configs.
        if (!target._xhFieldConfigs) {
            Object.defineProperty(target, '_xhFieldConfigs', {value: {}});
        }

        const config = target._xhFieldConfigs[property] = {};

        // 1) Parse and install field name.
        const firstParamIsName = !isEmpty(params) && isString(params[0]);
        config.displayName = firstParamIsName ? params.shift() : startCase(property);

        // 2) Parse and install additional params as Rules.
        if (!isEmpty(params)) {
            const [constraints, rules] = partition(params, r => isFunction(r));
            if (!isEmpty(constraints)) {
                rules.push({check: constraints});
            }
            config.rules = rules;
        } else {
            config.rules = [];
        }

        return bindable(target, property, descriptor);
    };
}
