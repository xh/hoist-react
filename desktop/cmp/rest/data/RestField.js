/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Field} from '@xh/hoist/data';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Extended field for RestGrid.
 */
export class RestField extends Field {

    editable;
    required;
    lookup;
    lookupName;
    enableCreate;
    typeField;

    /**
     * @param {(boolean|'addOnly')} [editable]
     * @param {boolean} [required] - True to require a non-null value for additions and edits.
     * @param {(Object[]|string[])} [lookup] - Array of available option values.
     * @param {string} [lookupName] - Name of server-provided options to populate lookup.
     * @param {boolean} [enableCreate] - For lookups, true to accept custom values not found within
     *      provided lookup options.
     * @param {string} [typeField] - Name of another field within this this record that specifies
     *      the value type for this field. (See `Field.type`.)
     * @param {...*} [fieldArgs] - All arguments for Field.
     */
    constructor({
        editable,
        required,
        lookup,
        lookupName,
        enableCreate,
        typeField,
        ...fieldArgs
    }) {
        super(fieldArgs);
        this.editable = withDefault(editable, true);
        this.required = withDefault(required, false);
        this.lookup = lookup;
        this.lookupName = lookupName;
        this.enableCreate = withDefault(enableCreate, false);
        this.typeField = typeField;
    }

}