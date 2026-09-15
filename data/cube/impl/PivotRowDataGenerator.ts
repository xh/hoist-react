/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import type {PivotView} from '../PivotView';
import {BaseLeafRowData, type LeafDataClass, RowDataGenerator} from './RowDataGenerator';

/**
 * Extends {@link RowDataGenerator} with the two row shapes a {@link PivotView} adds.
 *
 * Both track the pivot structure rather than the query alone, so `PivotView` drives them directly -
 * the base class watches only the query's field set and leaf exposure.
 *
 * @internal
 */
export class PivotRowDataGenerator extends RowDataGenerator {
    declare protected view: PivotView;

    // Declared, never initialized. A subclass field initializer would run *after* super()'s
    // constructor-time `init()` and wipe what it recorded - as on PivotView itself.
    declare private cellFieldNames: string[];
    declare private cellAggNames: string[];
    declare private cellDataTemplate: PlainObject;

    /**
     * Create a cell row's data object as a clone of the shared template.
     *
     * Cells carry no {@link ViewRowData} members - they never enter the visible tree or reach a
     * Store - so their template is the digest slot plus the measures they aggregate, a far narrower
     * shape than a group row's. Cells are the most numerous rows in a pivot, so the fixed-shape
     * argument pays best here and none of the heap cost that ruled it out for group rows applies.
     */
    newCellRowData(): PlainObject {
        return {...this.cellDataTemplate};
    }

    /** Rebuild the cell template if the measures cells aggregate have moved. */
    onCellAggFieldsChange() {
        const names = this.view._cellAggFields.map(it => it.name);
        if (this.cellAggNames && arraysEqual(this.cellAggNames, names)) return;

        this.cellAggNames = names;

        const data: PlainObject = {cubeRowDigest: null};
        names.forEach(name => (data[name] = null));

        // Clone into V8 fast-properties mode, as the parent template does.
        this.cellDataTemplate = {...data};
    }

    /**
     * Rebuild the exposed-leaf class if the cell field set has moved.
     *
     * `PivotView` calls this once a generation's pivot structure is known and *before* any leaf is
     * minted, so the class never lags the cells it has to describe. Cached leaves are dropped at the
     * same moment - their data was built against the outgoing class.
     */
    onCellFieldsChange() {
        if (!this.view.exposesLeaves) return;
        if (this.cellFieldNames && arraysEqual(this.cellFieldNames, this.cellFieldSignature())) {
            return;
        }

        this.init();
        this.view._rowCache.invalidateExposedLeaves();
    }

    //------------------
    // Implementation
    //------------------
    protected override init() {
        this.cellFieldNames = this.cellFieldSignature();
        super.init();
    }

    private cellFieldSignature(): string[] {
        return this.view._cellFields?.map(it => it.name) ?? [];
    }

    /**
     * A leaf carries a value for its own full-depth path alone, so a drilled-down row reads as one
     * populated pivot column rather than a blank one.
     *
     * Expressed as prototype getters over an own `_pivotPathIdx` slot rather than as per-leaf
     * properties. Writing the values instead adds a *different* subset of own properties to each
     * leaf - one hidden class per distinct full-depth path - and `Column.buildFastValueGetter`
     * compiles one closure per column that group rows and leaf rows both flow through. A drill-down
     * would push that call site megamorphic for the whole grid, not only for the leaves.
     *
     * Root-path cell fields are deliberately skipped: their name *is* the value field's, so a getter
     * here would shadow the queried-field getter and blank the leaf's own measure. That getter
     * already returns exactly what the root path means for a leaf.
     */
    protected override buildLeafDataClass(): LeafDataClass {
        if (!this.exposesLeaves) return null;

        class PivotLeafRowData extends BaseLeafRowData {
            // Index into `PivotView._allPaths` of this leaf's own full-depth path; -1 until a
            // generation places it. One own slot on every leaf, so all leaves keep one shape.
            _pivotPathIdx: number = -1;
        }

        this.defineFieldGetters(PivotLeafRowData);

        const {view} = this;
        view._cellFields?.forEach(({name, path, valueField}) => {
            if (path.isRoot) return;

            const pathIdx = view._pathIdx.get(path),
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

function arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}
