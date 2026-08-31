/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {
    installCalculatedFieldGetters,
    installSourceFieldGetters
} from '@xh/hoist/data/impl/CalculatedFieldSupport';
import {shallowEqualArrays} from '@xh/hoist/utils/impl';
import type {CubeField} from '../CubeField';
import type {View} from '../View';
import {ViewRowData} from '../ViewRowData';

/**
 * Generates the `ViewRowData` objects published by a View. Owned by its View, with
 * query-dependent classes rebuilt when the query's field set or leaf exposure changes. The
 * View stamps each minted or mutated row with its monotonic `cubeRowDigest` post-construction -
 * every row is minted with a `cubeRowDigest` slot so the stamp is an overwrite, never a
 * shape-changing property add.
 *
 * Row shapes are fixed per query, keeping them in V8's compact fast-properties mode rather than
 * "dictionary mode":
 *  - Aggregate and bucket row data objects are instances of a generated class whose constructor
 *    assigns a slot for every ViewRowData property and aggregable query field in a fixed order.
 *    Rows are only ever written via overwrites of these slots - never property adds.
 *  - Exposed-leaf row data holds no per-leaf copy of field values - queried fields are read
 *    through prototype getters over an own `_src` reference to the leaf's cube record data. One
 *    generated class per query keeps all leaf datas on a single shape with monomorphic,
 *    inlinable reads.
 *
 * Calculated fields (`CubeFieldSpec.calculatedFn`) hold no slot on either class - their values
 * are read through prototype getters computing against the View's current AggregationContext,
 * so they are always current and never participate in slot writes or digest bumps.
 *
 * @internal
 */
export class RowDataGenerator {
    private view: View;
    private fields: CubeField[];
    private exposesLeaves: boolean;
    private parentDataClass: GeneratedDataClass = null;
    private leafDataClass: GeneratedLeafDataClass = null;

    constructor(view: View) {
        this.view = view;
        this.init();
    }

    /** Create a new aggregate or bucket row data object. */
    newParentRowData(id: string): ViewRowData {
        return new this.parentDataClass(id);
    }

    /** Create an exposed-leaf data object - fields read via prototype getters over `src`. */
    newLeafRowData(id: string, src: PlainObject): ViewRowData {
        return new this.leafDataClass(id, src);
    }

    //------------------
    // Implementation
    //------------------
    onQueryChange() {
        const {view} = this;
        if (
            !shallowEqualArrays(view.fields, this.fields) ||
            view.exposesLeaves !== this.exposesLeaves
        ) {
            this.init();
        }
    }

    private init() {
        this.fields = this.view.fields;
        this.exposesLeaves = this.view.exposesLeaves;
        this.parentDataClass = this.buildParentDataClass();
        this.leafDataClass = this.buildLeafDataClass();
    }

    private buildParentDataClass(): GeneratedDataClass {
        const {view} = this,
            slotNames = this.fields.filter(it => !it.isCalculated).map(it => it.name);

        class ParentRowData extends BaseParentRowData {
            constructor(id: string) {
                super(id);
                // Constructor assignments in fixed order - all instances share one shape.
                for (let i = 0; i < slotNames.length; i++) this[slotNames[i]] = null;
            }
        }
        this.installCalculatedGetters(ParentRowData.prototype, view);
        return ParentRowData;
    }

    private buildLeafDataClass(): GeneratedLeafDataClass {
        if (!this.exposesLeaves) return null;

        const {view} = this;
        class LeafRowData extends BaseLeafRowData {}
        installSourceFieldGetters(
            LeafRowData.prototype,
            this.fields.filter(it => !it.isCalculated).map(it => it.name)
        );
        this.installCalculatedGetters(LeafRowData.prototype, view);
        return LeafRowData;
    }

    // Read the aggregation context live off the View - it is replaced per generation/update, and
    // a getter must always compute against the current one.
    private installCalculatedGetters(proto: object, view: View) {
        installCalculatedFieldGetters(
            proto,
            this.fields.filter(it => it.isCalculated),
            () => view._aggContext
        );
    }
}

/**
 * Fixed portion of a View's aggregate/bucket data class - `buildParentDataClass` extends this
 * with a slot per aggregable query field.
 */
class BaseParentRowData implements ViewRowData {
    id: string;
    cubeRowType: 'leaf' | 'aggregate' | 'bucket' = null;
    cubeLabel: string = null;
    cubeDimension: string = null;
    cubeBuckets: PlainObject = null;
    children: ViewRowData[] = null;
    isCubeLeaf: boolean = false;
    cubeRowDigest: number = null;
    _cubeLeafChildren: ViewRowData[] = null;

    // Type-only, erased: the interface's index signature.
    [key: string]: any;

    constructor(id: string) {
        this.id = id;
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

type GeneratedDataClass = new (id: string) => ViewRowData;
type GeneratedLeafDataClass = new (id: string, src: PlainObject) => ViewRowData;
