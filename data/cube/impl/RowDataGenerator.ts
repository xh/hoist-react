/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {isEmpty, isEqual} from 'lodash';
import type {View} from '../View';
import {ViewRowData} from '../ViewRowData';

/**
 * Generates the `ViewRowData` objects published by a View. Owned by its View, with
 * query-dependent templates rebuilt when the query's field set or leaf exposure changes. The
 * View stamps each minted or mutated row with its monotonic `cubeRowDigest` post-construction -
 * every row is minted with a `cubeRowDigest` slot so the stamp is an overwrite, never a
 * shape-changing property add.
 *
 * Row shapes are fixed per query, keeping them in V8's compact fast-properties mode rather than
 * "dictionary mode":
 *  - Aggregate and bucket row data is cloned from a shared template carrying a slot for every
 *    ViewRowData property and aggregated query field. Rows are only ever written via overwrites
 *    of these slots - never property adds. Derived fields with no aggregator hold no slot - when
 *    present, the clone takes a shared prototype whose getters compute them from the row.
 *  - Exposed-leaf row data holds no per-leaf copy of field values - queried fields are read
 *    through prototype getters over an own `_src` reference to the leaf's cube record data. One
 *    generated class per query keeps all leaf datas on a single shape with monomorphic,
 *    inlinable reads.
 *
 * @internal
 */
export class RowDataGenerator {
    private view: View;
    private fieldNames: string[];
    private exposesLeaves: boolean;
    private parentTemplate: ViewRowData = null;
    private parentProto: PlainObject = null;
    private leafClass: LeafDataClass = null;

    constructor(view: View) {
        this.view = view;
        this.init();
    }

    /** Create a new aggregate or bucket row data object as a clone of the shared template. */
    newParentRowData(id: string): ViewRowData {
        const {parentTemplate, parentProto} = this;
        return parentProto
            ? {__proto__: parentProto, ...parentTemplate, id}
            : {...parentTemplate, id};
    }

    /** Create an exposed-leaf data object - fields read via prototype getters over `src`. */
    newLeafRowData(id: string, src: PlainObject): ViewRowData {
        return new this.leafClass(id, src);
    }

    //------------------
    // Implementation
    //------------------
    onQueryChange() {
        const {view} = this;
        if (
            !isEqual(view.fieldNames, this.fieldNames) ||
            view.exposesLeaves !== this.exposesLeaves
        ) {
            this.init();
        }
    }

    private init() {
        this.fieldNames = this.view.fieldNames;
        this.exposesLeaves = this.view.exposesLeaves;
        this.parentTemplate = this.buildParentTemplate();
        this.parentProto = this.buildParentProto();
        this.leafClass = this.buildLeafClass();
    }

    private buildParentTemplate(): ViewRowData {
        const rowData: PlainObject = {
            id: null,
            cubeRowType: null,
            cubeLabel: null,
            cubeDimension: null,
            cubeBuckets: null,
            children: null,
            isCubeLeaf: false,
            cubeRowDigest: null,
            _cubeLeafChildren: null
        };
        this.view.fields.forEach(({name, isDerived, aggregator}) => {
            if (!isDerived || aggregator) rowData[name] = null;
        });

        // Convert into V8 fast-properties mode that we'll need to mint additional fast objects
        return {...rowData} as ViewRowData;
    }

    // Getters for derived fields with no aggregato
    private buildParentProto(): PlainObject {
        const derived = this.view.fields.filter(it => it.isDerived && !it.aggregator);
        if (isEmpty(derived)) return null;
        const ret = {};
        derived.forEach(({name, derivedFn}) => {
            Object.defineProperty(ret, name, {
                get(this: ViewRowData) {
                    return derivedFn(this);
                },
                enumerable: true
            });
        });
        return ret;
    }

    private buildLeafClass(): LeafDataClass {
        if (!this.exposesLeaves) return null;

        class LeafRowData extends BaseLeafRowData {}
        this.view.fields.forEach(({name}) => {
            Object.defineProperty(LeafRowData.prototype, name, {
                get(this: PlainObject) {
                    return this._src[name];
                },
                enumerable: true
            });
        });
        return LeafRowData;
    }
}

/**
 * Fixed portion of a View's exposed-leaf data class - `buildLeafDataClass` extends this with
 * per-query field getters reading through the own `_src` reference to the leaf's cube record
 * data.
 */
class BaseLeafRowData implements ViewRowData {
    id: string;
    cubeLabel: string = null;
    cubeBuckets: PlainObject = null;
    cubeRowDigest: number = null;
    _src: PlainObject;

    // Type-only, erased: the interface's index signature.
    [key: string]: any;

    // Constants for all leaves - no own slots, and non-enumerable like all class accessors:
    // enumerating consumers care only about queried fields.
    get cubeRowType(): 'leaf' {
        return 'leaf';
    }
    get isCubeLeaf(): boolean {
        return true;
    }
    get cubeDimension(): string {
        return null;
    }
    get children(): ViewRowData[] {
        return null;
    }

    constructor(id: string, src: PlainObject) {
        this.id = id;
        this._src = src;
    }
}

type LeafDataClass = new (id: string, src: PlainObject) => ViewRowData;
