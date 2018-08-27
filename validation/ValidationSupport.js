/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {ValidationModel} from './ValidationModel';
import {defaultMethods} from '@xh/hoist/utils/js';

/**
 * Mixin to add Validation Support to a Hoist Model.
 */
export function ValidationSupport(C) {

    C.hasValidationSupport = true;

    defaultMethods(C, {

        /**
         * Create the validation model to be used for this object.
         * Override to provide a custom model.
         */
        createValidationModel() {
            return new ValidationModel(this);
        },

        /**
         * ValidationModel to be used for this object.
         */
        get validationModel() {
            if (!this._validationModel) {
                this._validationModel = this.createValidationModel();
            }
            return this._validationModel;
        }
    });

    return C;
}
