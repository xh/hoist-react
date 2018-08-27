/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {ValidationModel} from './validation/ValidationModel';
import {defaultMethods, chainMethods} from '@xh/hoist/utils/js';
import {forOwn} from 'lodash';

/**
 * Mixin to add form support to a Hoist Model.
 *
 * Includes support for field display names, and validation.
 * This class should be used in conjunction with the @field decorator.
 */
export function FormSupport(C) {

    C.hasFormSupport = true;

    defaultMethods(C, {

        /**
         * Get the user visible name for a field.  For use in validation messages and form labelling.
         * @param {string} field
         */
        getFieldName(field) {
            const names = this.xhFieldNames;
            return names ? names[field] : null;
        },

        /**
         * Get the Validator (if any) associated with a field in this model.
         *
         * @param {string} field
         */
        getValidator(field) {
            return this.validationModel.getValidator(field);
        },

        /**
         * Create the validation model to be used for this object.
         */
        createValidationModel() {
            const ret = new ValidationModel(this);
            if (this.xhFieldRules) {
                forOwn(this.xhFieldRules, (rules, field) => {
                    ret.addRules(field, ...rules);
                });
            }
            return ret;
        },

        /**
         * ValidationModel associated with this object.
         */
        validationModel: {
            get: function() {
                if (!this._validationModel) {
                    this._validationModel = this.createValidationModel();
                }
                return this._validationModel;
            }
        }
    });

    chainMethods(C, {
        destroy() {
            XH.safeDestroy(this._validationModel);
        }
    });

    return C;
}
