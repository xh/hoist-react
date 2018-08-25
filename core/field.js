import {settable, observable} from '@xh/hoist/mobx';
import {startCase} from 'lodash';


/**
 * Mark a class property as an observable form field.
 *
 * This decorator will mark the field as @settable, @observable.  It will also
 * add a property of the form 'xxxFieldName' to the object for use in labelling
 * and validation messages.
 *
 * @param {string} name - name of field.
 */
export function field(name) {
    return (target, property, descriptor) => {

        name = name || startCase(property);
        Object.defineProperty(target, property + 'FieldName', name);

        return settable(target, property, observable(target, property, descriptor));
    };
}
