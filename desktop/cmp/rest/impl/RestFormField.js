/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import {
    jsonInput,
    select,
    numberInput,
    switchInput,
    textInput,
    dateInput
} from '@xh/hoist/desktop/cmp/input';

import {RestFormModel} from './RestFormModel';

import {assign} from 'lodash';
import {formField} from '@xh/hoist/desktop/cmp/form';

export const restFormField = hoistCmp.factory({
    displayName: 'RestFormField',
    model: uses(RestFormModel),

    render({model, editor, ...props}) {
        const name = editor.field;

        // Skip blank metadata
        if (!model.formModel.values[name] && ['lastUpdatedBy', 'lastUpdated'].includes(name)) {
            return null;
        }

        let config = assign({field: name, flex: 1}, editor.formField);

        if (!config.item && !config.items) {
            config = {item: renderDefaultInput(name, model), ...config};
        }

        return formField(config);
    }
});

function renderDefaultInput(name, model) {
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
        case 'number':
            return numberInput();
        case 'json':
            return jsonInput();
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

function renderBoolean(fieldModel) {
    // Favor switch, when we are not in a tri-state situation w/null
    // Otherwise, use a clearly nullable select.

    const {isRequired, value, initialValue} = fieldModel,
        useSwitch = isRequired && value != null && initialValue != null;

    return useSwitch ?
        switchInput() :
        select({
            options: [true, false],
            enableClear: !isRequired,
            enableCreate: false
        });
}

