import {settable, observable} from '@xh/hoist/mobx';
import {startCase, partition, isFunction, isEmpty} from 'lodash';


/**
 * Mark a class property as an observable form field.
 *
 * This decorator will mark the field as @settable, @observable and provides a
 * property of the form 'xxxFieldName' to the object for use in labelling.  It
 * also provides support for specifying Validation Rules to a related ValidationModel.
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

        // 1) Parse and install field name
        const firstParamIsName = !isEmpty(params) && params[0] instanceof String,
            fieldName = firstParamIsName ? params.shift() : startCase(property);

        Object.defineProperty(target, property + 'FieldName', {value: fieldName});

        // 2) Pass additional params as rules
        if (target.validationModel && !isEmpty(params)) {
            const [constraints, rules] = partition(params, r => isFunction(r));
            if (!isEmpty(constraints)) {
                rules.push({check: constraints});
            }

            target.validationModel.addRules(property, ...rules);
        }

        return settable(target, property, observable(target, property, descriptor));
    };
}
