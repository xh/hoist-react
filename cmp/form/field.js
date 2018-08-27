import {settable, observable} from '@xh/hoist/mobx';
import {startCase, partition, isFunction, isEmpty, isString} from 'lodash';

/**
 * Mark a class property as an observable form field.  For use in a HoistModel
 * decorated with @FormSupport.
 *
 * This decorator will mark the property as @settable, @observable and provides a
 * field name to the object for use in labelling.  It also provides support for
 * specifying validation rule.
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

        if (!target.xhFieldNames) {
            Object.defineProperty(target, 'xhFieldNames', {value: {}});
            Object.defineProperty(target, 'xhFieldRules', {value: {}});
        }

        // 1) Parse and install field name.
        const firstParamIsName = !isEmpty(params) && isString(params[0]),
            fieldName = firstParamIsName ? params.shift() : startCase(property);
        target.xhFieldNames[property] = fieldName;

        // 2) Consider additional params as Rules.  Parse and install
        if (!isEmpty(params)) {
            const [constraints, rules] = partition(params, r => isFunction(r));
            if (!isEmpty(constraints)) {
                rules.push({check: constraints});
            }
            target.xhFieldRules[property] = rules;
        }

        return settable(target, property, observable(target, property, descriptor));
    };
}
