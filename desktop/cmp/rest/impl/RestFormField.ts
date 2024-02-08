/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {BaseFieldModel} from '@xh/hoist/cmp/form';
import {hoistCmp, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {
    dateInput,
    jsonInput,
    numberInput,
    select,
    switchInput,
    textInput
} from '@xh/hoist/desktop/cmp/input';
import {assign, isFunction, isNil} from 'lodash';
import {RestFormModel} from './RestFormModel';

/**
 * @internal
 */
export const restFormField = hoistCmp.factory({
    displayName: 'RestFormField',
    model: uses(RestFormModel),

    render({model, editor, ...props}) {
        const {field, omit} = editor,
            fieldModel = model.getFormFieldModel(field),
            fieldVal = fieldModel.value;

        // Skip fields if explicitly requested via `omit`, or if they are a) empty and b) readonly
        // when c) adding a record. No point in showing as they are not populated (nor are they
        // expected to be), and they can't be edited - e.g. `dateCreated` and `lastUpdated`.
        if (
            omit === true ||
            (isFunction(omit) && omit(fieldVal, model)) ||
            (isNil(fieldVal) && fieldModel.readonly && model.isAdd)
        ) {
            return null;
        }

        let config = assign({field, flex: 1}, editor.formField);

        if (!config.item && !config.items) {
            config = {item: renderDefaultInput(field, model), ...config};
        }

        return formField(config);
    }
});

function renderDefaultInput(name: string, model: RestFormModel) {
    const type = model.types[name],
        storeField = model.store.getField(name),
        fieldModel = model.formModel.fields[name];

    if (storeField.lookup) {
        return select({
            options: [...storeField.lookup],
            enableClear: !fieldModel.isRequired,
            enableCreate: storeField.enableCreate
        });
    }

    switch (type) {
        case 'bool':
            return renderBoolean(fieldModel);
        case 'int':
            return numberInput({precision: 0});
        case 'number':
            return numberInput();
        case 'json':
            return jsonInput({enableSearch: true, height: 250});
        case 'date':
            return dateInput();
        case 'localDate':
            return dateInput({valueType: 'localDate'});
        case 'pwd':
            // Key to force re-creation of DOM elements so Chrome stops suggesting passwords
            return textInput({type: 'password', key: '_' + type});
        default:
            return textInput();
    }
}

// Favor switch, when we are not in a tri-state situation w/null.
// Otherwise, use a clearly nullable select.
function renderBoolean(fieldModel: BaseFieldModel) {
    const {isRequired, value, initialValue} = fieldModel,
        useSwitch = isRequired && value != null && initialValue != null;

    return useSwitch
        ? switchInput()
        : select({
              options: [true, false],
              enableClear: !isRequired,
              enableCreate: false
          });
}
