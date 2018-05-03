/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Field} from 'hoist/data';

/**
 * Extended field for RestGrid.
 */
export class RestField extends Field {

    editable
    required
    lookup
    lookupName
    lookupStrict
    typeField

    /**
     * @param editable. [true | false | 'addOnly']
     * @param required. Is a non-null value required for additions and edits?
     * @param lookup (optional).  Array of suggested values
     * @param lookupName (optional).  Name of server provided collection to populate lookup.
     * @param lookupStrict.  If lookup provided, must values come from it?
     * @param typeField.  Name of field in this record representing containing the 'type' (See Field.type).
     * @param rest.  All arguments for Field.
     */
    constructor({
        editable = true,
        required = false,
        lookup = null,
        lookupName = null,
        lookupStrict = false,
        typeField = null,
        ...rest
    }) {
        super(rest);
        this.editable = editable;
        this.required = required;
        this.lookup = lookup;
        this.lookupName = lookupName;
        this.lookupStrict = lookupStrict;
        this.typeField = typeField;
    }
}