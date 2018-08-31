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
import {ValidationState} from './validation/ValidationState';


/**
 * Mixin to add field support to a Hoist Model.
 *
 * Includes support for field display names, validation, and dirty state.
 * This class should be used in conjunction with the @field decorator.
 */
export function FieldSupport(C) {

    C.hasFieldSupport = true;

    defaultMethods(C, {

        //-----------------------------
        // Accessors and lifecycle
        //-----------------------------
        /** @member {Field[]} -  all fields in this model. */
        fields:  {
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
         * Initialize fields to initial values.
         *
         * These values will be used as the baseline
         * for dirty state, and the baseline to which form
         * is restored to on reset()
         *
         * @param {Object} values - map of values by field name.
         *      For any field not present in map, initialValue will be set to null.
         */
        initFields(values = {}) {
            this.fieldsModel.initFields(values);
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
        /**
         * @member {ValidationState} - the current validation state.
         */
        validationState: {
            get() {return this.fieldsModel.validationState}
        },

        /**
         * True if any of the fields contained in this model are in the process
         * of recomputing their validation state?
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


        //--------------------------------------------
        // Implementation
        //--------------------------------------------
        fieldsModel: {
            get() {
                if (!this._fieldsModel) {
                    this._fieldsModel = this.createFieldsModel();
                }
                return this._fieldsModel;
            }
        },

        createFieldsModel() {
            const fields = {};
            if (this.xhFieldConfigs) {
                forOwn(this.xhFieldConfigs, ({displayName, rules}, name) => {
                    fields[name] = new Field({
                        name,
                        displayName,
                        rules,
                        model: this
                    });
                });
            }
            return new FieldsModel(fields);
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
 * Mark a class property as an observable form field.  For use in a HoistModel
 * decorated with @FieldSupport.
 *
 * This decorator will mark the property as @bindable and provides support for
 * validation, labelling, and dirty state management.
 *
 * If the first argument to this function is a String, it will be interpreted as the field name.
 * (If not specified, the field name will default to the start case of the property itself.)
 *
 * All other arguments will be considered to be specifications for validation for this field.
 * Arguments may be specified as configurations for a {@link Rule}, or as individual functions
 * (constraints).  In the latter case the constraints will be gathered into a single rule to be
 * added to this field.
 */
export function field(...params) {
    return (target, property, descriptor) => {

        // 0) Prepare static property on class itself to host field configs.
        if (!target.xhFieldConfigs) {
            Object.defineProperty(target, 'xhFieldConfigs', {value: {}});
        }

        const config = target.xhFieldConfigs[property] = {};

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

