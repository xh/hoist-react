import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory, ValidationModel} from '@xh/hoist/core';
import {span, vbox} from '@xh/hoist/cmp/layout';

import './ValidationErrors.scss';

/**
 * Displays validation errors from a {@link ValidationModel} for all or a subset of fields.
 */
@HoistComponent()
export class ValidationErrors extends Component {
    static propTypes = {
        /** The validation model containing the validation errors. */
        model: PT.instanceOf(ValidationModel).isRequired,
        /** The field or fields to show the errors for. Omitting this prop will show errors for all fields. */
        fields: PT.oneOfType([PT.arrayOf(PT.string), PT.string])
    };

    baseClassName = 'xh-validation-errors';

    render() {
        const {model, fields} = this.props,
            {isValid} = model;

        // Nothing to show if the model is valid
        if (isValid) {
            return null;
        }

        let errors;
        if (!fields) {
            errors = model.allErrorMessages;
        } else {
            errors = model.getFieldErrors(fields);
        }

        return vbox({
            className: this.getClassName(),
            items: errors.map(msg => span({
                className: 'xh-validation-error-msg',
                item: msg
            }))
        });
    }
}

export const validationErrors = elemFactory(ValidationErrors);