import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {span, vbox} from '@xh/hoist/cmp/layout';
import {isEmpty, castArray, flatten} from 'lodash';
import './ValidationErrors.scss';

/**
 * Displays validation errors from a {@link ValidationModel} for all or a subset of fields.
 */
@HoistComponent()
export class ValidationErrors extends Component {
    static propTypes = {
        /** The model to show validation errors for. */
        model: PT.object,
        /** The field or fields to show the errors for. Omitting this prop will show errors for all fields. */
        fields: PT.oneOfType([PT.arrayOf(PT.string), PT.string])
    };

    baseClassName = 'xh-validation-errors';

    render() {
        const errors = this.getErrors();

        if (isEmpty(errors)) return null;

        return vbox({
            className: this.getClassName(),
            items: errors.map(msg => span({
                className: 'xh-validation-error-msg',
                item: msg
            }))
        });
    }

    //------------------------------
    // Implementation
    //------------------------------
    getErrors() {
        let {validationModel} = this.model,
            validators = validationModel && validationModel.validators;

        if (!validators) return null;

        let fields = this.props;
        if (fields && validationModel) {
            fields = castArray(fields);
            validators = validators.filter(v => fields.includes(v.field));
        }

        return flatten(validators.map(v => v.errors || []));
    }
}
export const validationErrors = elemFactory(ValidationErrors);