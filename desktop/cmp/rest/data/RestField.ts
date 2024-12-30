/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {Field, FieldSpec} from '@xh/hoist/data';
import '@xh/hoist/desktop/register';
import {withDefault} from '@xh/hoist/utils/js';
import {PlainObject} from '@xh/hoist/core';

export interface RestFieldSpec extends FieldSpec {
    /**
     *  False to disable editing and present field as readonly data. True (default) to enable
     *  editing, or token 'onAdd' to enable editing only when first creating a record.
     */
    editable?: boolean | 'onAdd';

    /** True to require a non-null value for additions and edits.*/
    required?: boolean;

    /** Array of available option values. */
    lookup?: PlainObject[] | string[];

    /** Name of server-provided options to populate lookup.*/
    lookupName?: string;

    /** For lookups, true to accept custom values not found within provided lookup options. */
    enableCreate?: boolean;

    /**
     * Name of another field within this this record that specifies the value type for this field.
     * (See `Field.type`.)
     */
    typeField?: string;

    /** All Arguments for the field*/
    fieldArgs?: PlainObject;
}

/**
 * Extended field for RestGrid.
 */
export class RestField extends Field {
    editable: boolean | string;
    required: boolean;
    lookup: PlainObject[] | string[];
    lookupName: string;
    enableCreate: boolean;
    typeField: string;

    constructor({
        editable,
        required,
        lookup,
        lookupName,
        enableCreate,
        typeField,
        ...rest
    }: RestFieldSpec) {
        super(rest);
        this.editable = withDefault(editable, true);
        this.required = withDefault(required, false);
        this.lookup = lookup;
        this.lookupName = lookupName;
        this.enableCreate = withDefault(enableCreate, false);
        this.typeField = typeField;
    }
}
