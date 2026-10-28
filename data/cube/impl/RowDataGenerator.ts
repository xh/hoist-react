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
 *    ViewRowData property and query field. Rows are only ever written via overwrites of these
 *    slots - never property adds.
 *  - Exposed-leaf row data holds no per-leaf copy of field values - queried fields are read
 *    through prototype getters over an own `_src` reference to the leaf's cube record data. One
 *    generated class per query keeps all leaf datas on a single shape with monomorphic,
 *    inlinable reads.
 *
 * Pivoted views add two more shapes, driven by `PivotCells` since they track the pivot structure
 * rather than the query alone - see the Pivot section below.
 *
 * @internal
 */
export class RowDataGenerator {
    private view: View;
    private fieldNames: string[];
    private exposesLeaves: boolean;
    private parentDataTemplate: ViewRowData = null;
    private leafDataClass: LeafDataClass = null;

    constructor(view: View) {
        this.view = view;
        this.init();
    }

    /** Create a new aggregate or bucket row data object as a clone of the shared template. */
    newParentRowData(id: string): ViewRowData {
        return {...this.parentDataTemplate, id};
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
            !isEqual(view.fieldNames, this.fieldNames) ||
            view.exposesLeaves !== this.exposesLeaves
        ) {
            this.init();
        }
    }

    private init() {
        this.fieldNames = this.view.fieldNames;
        this.exposesLeaves = this.view.exposesLeaves;
        this.cellFieldNames = this.cellFieldSignature();
        this.parentDataTemplate = this.buildParentDataTemplate();
        this.leafDataClass = this.buildLeafDataClass();
    }

    private buildParentDataTemplate(): ViewRowData {
        const rowData: PlainObject = {
            id: null,
            cubeRowType: null,
            cubeLabel: null,
            cubeLabelValue: null,
            cubeDimension: null,
            cubeBuckets: null,
            children: null,
            isCubeLeaf: false,
            cubeRowDigest: null,
            _cubeLeafChildren: null
        };
        this.view.fields.forEach(({name}) => (rowData[name] = null));

        // Convert into V8 fast-properties mode that we'll need to mint additional fast objects
        return {...rowData} as ViewRowData;
    }

    private buildLeafDataClass(): LeafDataClass {
        if (!this.exposesLeaves) return null;

        const cls = isEmpty(this.cellFieldNames)
            ? class LeafRowData extends BaseLeafRowData {}
            : this.buildPivotLeafDataClass();

        // A prototype getter per queried field, reading through the own `_src` reference.
        this.view.fields.forEach(({name}) => {
            Object.defineProperty(cls.prototype, name, {
                get(this: PlainObject) {
                    return this._src[name];
                },
                enumerable: true
            });
        });
        return cls;
    }

    //------------------
    // Pivot
    //------------------
    private cellFieldNames: string[] = null;
    private cellAggNames: string[] = null;
    private cellDataTemplate: PlainObject = null;

    /**
     * Create a cell row's data object from the shared template - the digest slot plus the measures
     * cells aggregate, far narrower than a group row's shape.
     */
    newCellRowData(): PlainObject {
        return {...this.cellDataTemplate};
    }

    /** Rebuild the cell template if the measures cells aggregate have moved. */
    onCellAggFieldsChange() {
        const names = this.view._pivot.cellAggFields.map(it => it.name);
        if (this.cellAggNames && isEqual(this.cellAggNames, names)) return;

        this.cellAggNames = names;

        const data: PlainObject = {cubeRowDigest: null};
        names.forEach(name => (data[name] = null));

        // Clone into V8 fast-properties mode, as the parent template does.
        this.cellDataTemplate = {...data};
    }

    /**
     * Rebuild the exposed-leaf class if the cell field set has moved, returning true if it did.
     * Called before any leaf is minted in a generation; the caller drops cached leaves on a true.
     */
    onCellFieldsChange(): boolean {
        if (!this.exposesLeaves || isEqual(this.cellFieldNames, this.cellFieldSignature())) {
            return false;
        }

        this.init();
        return true;
    }

    private cellFieldSignature(): string[] {
        return this.view._pivot?.cellFields.map(it => it.name) ?? [];
    }

    /**
     * A leaf carries a value for its own full-depth path alone, read through prototype getters over
     * one `_pivotPathIdx` slot so every leaf keeps a single hidden class. Root-path cell fields are
     * skipped - their name is the value field's, whose getter already answers.
     */
    private buildPivotLeafDataClass(): LeafDataClass {
        class PivotLeafRowData extends BaseLeafRowData {
            // Index into `PivotCells.allPaths` of this leaf's full-depth path; -1 until placed.
            _pivotPathIdx: number = -1;
        }

        const {_pivot} = this.view;
        _pivot.cellFields.forEach(({name, path, valueField}) => {
            if (path.isRoot) return;

            const pathIdx = _pivot.pathIdx.get(path),
                valueName = valueField.name;
            Object.defineProperty(PivotLeafRowData.prototype, name, {
                get(this: PlainObject) {
                    return this._pivotPathIdx === pathIdx ? this._src[valueName] : null;
                },
                enumerable: true
            });
        });

        return PivotLeafRowData;
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
    // A getter, not an own slot, so every leaf keeps the same shape.
    get cubeLabelValue(): any {
        return this.id;
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
