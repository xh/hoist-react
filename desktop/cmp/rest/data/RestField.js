/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {Field} from '@xh/hoist/data';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Extended field for RestGrid.
 */
export class RestField extends Field {

    /** @member {(boolean|string)} */
    editable;
    /** @member {boolean} */
    required;
    /** @member {(Object[]|string[])} */
    lookup;
    /** @member {string} */
    lookupName;
    /** @member {boolean} */
    enableCreate;
    /** @member {string} */
    typeField;

    /**
     * @param {(boolean|string)} [editable] - false to disable editing and present field as
     *      readonly data. True (default) to enable editing, or special string token 'addOnly'
     *      to enable editing only when first creating a new record.
     * @param {boolean} [required] - true to require a non-null value for additions and edits.
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
