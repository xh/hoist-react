/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {Field, Store, StoreRecord} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {CubeField} from '../../CubeField';
import {PivotCellField, PivotPath} from '../PivotPath';
import {BaseRow} from '../../row/BaseRow';
import {LeafRow} from '../../row/LeafRow';
import {PivotCellRow} from '../PivotCellRow';
import type {View} from '../../View';
import {ViewRowData} from '../../ViewRowData';
import {
    buildPivotStructure,
    CHILD_KIND_LEAF,
    discoverPivotPaths,
    pivotCellFieldName,
    type PivotStructure,
    type PivotPathDiscoveryResult,
    type PivotPathSpec
} from './PivotStructure';
import {PivotPhases} from '../../impl/ViewDiagnostics';

/**
 * Pivot support for a {@link View} whose query sets {@link QueryConfig.pivot}.
 *
 * Every node of the row hierarchy carries its own subtree of {@link PivotCellRow}s, one per
 * populated pivot path. Cells are real rows in the aggregation network - aggregators work
 * unmodified and ticks propagate incrementally - but never enter the visible tree or reach a
 * Store. Each cell's values are written onto its owning group row as flat synthetic fields, named
 * per {@link ViewResult.cellFields}, so they behave as ordinary Store fields.
 *
 * Created on a View's first pivoted query and retained; holds no cells under an unpivoted query.
 * `PivotStructure` plans the cells, this class materializes them.
 *
 * @internal
 */
export class PivotCells {
    private readonly view: View;

    /** Pivot path tree, top-level paths first - see {@link ViewResult.paths}. */
    paths: PivotPath[] = [];
    /** One entry per (path, value field) - see {@link ViewResult.cellFields}. */
    cellFields: PivotCellField[] = [];
    /** Index of each path within `allPaths` - what an exposed leaf's `_pivotPathIdx` names. */
    pathIdx: Map<PivotPath, number> = new Map();

    // Aggregation field lists for cell rows - the value fields plus their dependencies.
    cellAggFields: CubeField[] = [];
    cellAggFieldNames: Set<string> = new Set();
    cellCanAggregateFnFields: CubeField[] = [];
    cellComplexAggFields: CubeField[] = [];

    private allPaths: PivotPath[] = [];
    private pathKeys: string[] = null;
    private pathLabels: string[] = [];
    private valueFieldNames: string[] = [];
    /** Keyed on path identity. */
    private cellFieldNamesByPath: Map<PivotPath, string[]> = new Map();
    /** This generation's path discovery - see `discoverPaths`. */
    private discovery: PivotPathDiscoveryResult = null;
    private cellRows: PivotCellRow[] = [];
    /** Phase timings for the generation in progress, reported by `generateCells`. */
    private phases: PivotPhases = null;
    /** Cell fields last declared on each store, by identity - the structural-change signal. */
    private syncedCellFields = new WeakMap<Store, PivotCellField[]>();

    constructor(view: View) {
        this.view = view;
    }

    //------------------------
    // View lifecycle
    //------------------------
    /** Derive the cell aggregation field lists. Runs with the View's own `buildIndices`. */
    buildIndices() {
        const {view} = this,
            names = new Set<string>();
        this.valueFields.forEach(f => {
            names.add(f.name);
            f.aggregator?.dependsOn?.forEach(n => names.add(n));
        });

        const fields: CubeField[] = [];
        names.forEach(name => {
            const field = view.getField(name);
            if (field?.aggregator) fields.push(field);
        });
        this.cellAggFields = fields;
        this.cellAggFieldNames = new Set(fields.map(f => f.name));
        this.cellCanAggregateFnFields = fields.filter(f => f.canAggregateFn);
        this.cellComplexAggFields = fields.filter(f => !f.aggregator.dependsOnChildrenOnly);

        view._rowDataGenerator.onCellAggFieldsChange();
    }

    /**
     * Discover the pivot path tree and publish the cell fields it implies. Runs before row
     * generation, as the exposed-leaf class is built from the cell fields and leaves are minted
     * during that pass.
     */
    discoverPaths() {
        const {view} = this,
            {query} = view,
            start = performance.now();

        if (query.isPivoted) {
            const {pivot} = query;
            this.discovery = discoverPivotPaths(view._records.list, pivot.dimensionNames, {
                emptyPathLabel: pivot.emptyPathLabel,
                maxPivotPaths: pivot.maxPivotPaths
            });
            this.syncPaths(this.discovery.paths);
        } else {
            this.discovery = null;
            this.clearCells();
        }

        if (view._rowDataGenerator.onCellFieldsChange()) {
            view._rowCache.invalidateExposedLeaves();
        }

        this.phases = {
            discover: performance.now() - start,
            align: 0,
            plan: 0,
            build: 0,
            project: 0
        };
    }

    /** Build or reuse the cell rows for the just-generated row tree, and report the timings. */
    generateCells() {
        const {view} = this;
        this.buildCells(view._records.list);

        // Pivot phases only - base row generation is reported by its own op.
        const {phases} = this;
        view.diagnostics.notePivot({
            paths: this.allPaths.length,
            cells: this.cellRows.length,
            phases,
            elapsed: phases.discover + phases.align + phases.plan + phases.build + phases.project
        });
    }

    /**
     * Rewrite the cells touched by a tick onto their owning group rows, returning the group rows to
     * push to connected stores - cell rows are never published.
     */
    projectUpdatedRows(updatedRows: Set<BaseRow>, changedFields: Set<string>): Set<BaseRow> {
        const groupRows = new Set<BaseRow>(),
            {exposesLeaves} = this.view;

        updatedRows.forEach(row => {
            if (row instanceof PivotCellRow) {
                this.projectCell(row, changedFields);
                groupRows.add(row.ownerRow);
            } else {
                if (exposesLeaves && row.isLeaf) {
                    this.noteLeafCellFields(row as LeafRow, changedFields);
                }
                groupRows.add(row);
            }
        });

        return groupRows;
    }

    /**
     * Declare a Field on `store` for every current cell field. Must run before the store loads -
     * under `projectionOnly`, records are built against the declared fields.
     */
    syncStore(store: Store) {
        const {cellFields, syncedCellFields} = this,
            prior = syncedCellFields.get(store);

        // An unpivoted view mints a fresh empty array per build - compare emptiness too.
        if (prior === cellFields || (isEmpty(prior) && isEmpty(cellFields))) return;

        // Replace only the fields declared last time. Root-path entries are the value fields,
        // already present.
        const stale = new Set(prior?.map(it => it.name) ?? []),
            retained = store.fields.filter(f => !stale.has(f.name)),
            retainedNames = new Set(retained.map(f => f.name)),
            added = cellFields
                .filter(it => !retainedNames.has(it.name))
                .map(
                    ({name, valueField}) =>
                        new Field({
                            name,
                            type: valueField.type,
                            displayName: valueField.displayName,
                            defaultValue: valueField.defaultValue
                        })
                );

        store.setFields([...retained, ...added]);
        syncedCellFields.set(store, cellFields);
    }

    /**
     * Create the data object for a cell row.
     * @internal
     */
    newCellRowData(): PlainObject {
        const {view} = this,
            ret = view._rowDataGenerator.newCellRowData();
        BaseRow.assignDigest(ret as ViewRowData);
        return ret;
    }

    //------------------------
    // Implementation
    //------------------------
    private get valueFields(): CubeField[] {
        return this.view.query.pivot?.valueFields ?? [];
    }

    private clearCells() {
        this.clearVacatedCells(this.cellRows, EMPTY_CELLS);
        this.allPaths = [];
        this.pathKeys = [];
        this.pathLabels = [];
        this.valueFieldNames = [];
        this.paths = [];
        this.cellFields = [];
        this.cellFieldNamesByPath = new Map();
        this.pathIdx = new Map();
        this.cellRows = [];
    }

    private buildCells(records: StoreRecord[]) {
        const {view, discovery, phases} = this,
            {_rootRows, exposesLeaves} = view,
            prevCells = this.cellRows;
        if (!discovery || isEmpty(_rootRows)) return this.clearCells();

        let mark = performance.now();
        const lap = () => {
            const now = performance.now(),
                ret = now - mark;
            mark = now;
            return ret;
        };

        const {groups, parentOfGroup, innermost, groupIdxOf} = this.enumerateGroups();
        if (isEmpty(groups)) return this.clearCells();

        // Leaves, aligned to the record order discovery used so path indices carry across.
        const leafRows: LeafRow[] = [],
            leafOwnerGroup: number[] = [],
            leafPathIdx: number[] = [];
        for (let i = 0; i < records.length; i++) {
            const leaf = view._leafMap.get(records[i].id);
            if (!leaf) continue;

            const pathIdx = discovery.pathIdxOfRecord[i];

            // Stamped on every leaf, owned or not - its cell-field getters read this.
            if (exposesLeaves) leaf.data._pivotPathIdx = pathIdx;

            const owner = groupIdxOf.get(leaf.parent);
            if (owner == null) continue;
            leafRows.push(leaf);
            leafOwnerGroup.push(owner);
            leafPathIdx.push(pathIdx);
        }
        if (isEmpty(leafRows)) return this.clearCells();
        phases.align = lap();

        const structure = buildPivotStructure({
            groupCount: groups.length,
            parentOfGroup: Int32Array.from(parentOfGroup),
            innermost: Uint8Array.from(innermost),
            leafOwnerGroup: Int32Array.from(leafOwnerGroup),
            leafPathIdx: Int32Array.from(leafPathIdx),
            pathCount: discovery.paths.length,
            pathParentIdx: discovery.pathParentIdx,
            pathDepth: discovery.pathDepth,
            maxDepth: discovery.maxDepth
        });

        phases.plan = lap();

        this.buildCellRows(structure, groups, leafRows);
        this.clearVacatedCells(prevCells, new Set(this.cellRows));
        phases.build = lap();

        this.cellRows.forEach(cell => this.projectCell(cell));
        phases.project = lap();
    }

    /**
     * Null the slots of cells in `prev` but not `live`, cut any update route still pointing at one,
     * and mark their aggregates stale for a later reuse. Cells are sparse, so a vacated cell would
     * otherwise leave its last value on a reused owner row.
     */
    private clearVacatedCells(prev: PivotCellRow[], live: Set<PivotCellRow>) {
        prev?.forEach(cell => {
            if (live.has(cell)) return;

            cell.children?.forEach(child => {
                if (child.pivotParent === cell) child.pivotParent = null;
            });
            cell.staleAggs = true;

            const {data} = cell.ownerRow;
            if (clearCellSlots(cell, data, EMPTY_NAMES)) BaseRow.assignDigest(data as ViewRowData);
        });
    }

    /**
     * Rebuild the published path tree and cell fields only when the structure changed - their
     * identity is the structural-change signal consumers key off.
     */
    private syncPaths(specs: PivotPathSpec[]) {
        // Keys alone miss a `valueFields` or `emptyPathLabel` change. Compared as separate arrays
        // so no value can forge a boundary.
        const keys = specs.map(s => s.key),
            labels = specs.map(s => s.label),
            valueFieldNames = this.valueFields.map(f => f.name);
        if (
            this.pathKeys &&
            arraysEqual(this.pathKeys, keys) &&
            arraysEqual(this.pathLabels, labels) &&
            arraysEqual(this.valueFieldNames, valueFieldNames)
        ) {
            return;
        }

        const {dimensions, valueFields} = this.view.query.pivot,
            all: PivotPath[] = specs.map(
                s =>
                    new PivotPath({
                        dimension: s.dimIdx >= 0 ? dimensions[s.dimIdx] : null,
                        value: s.value,
                        label: s.label,
                        key: s.key,
                        depth: s.depth,
                        isEmpty: s.isEmpty
                    })
            );

        specs.forEach(s => {
            if (s.parentIdx >= 0) all[s.parentIdx].children.push(all[s.idx]);
        });

        const cellFields: PivotCellField[] = [],
            cellFieldNamesByPath = new Map<PivotPath, string[]>(),
            pathIdx = new Map<PivotPath, number>();
        all.forEach((path, idx) => {
            const names = valueFields.map(vf => pivotCellFieldName(path.key, vf.name));
            cellFieldNamesByPath.set(path, names);
            pathIdx.set(path, idx);
            valueFields.forEach((valueField, i) => {
                cellFields.push({name: names[i], path, valueField});
            });
        });

        this.validateCellFieldNames(cellFields);

        this.pathKeys = keys;
        this.pathLabels = labels;
        this.valueFieldNames = valueFieldNames;
        this.allPaths = all;
        this.paths = all[0].children;
        this.cellFields = cellFields;
        this.cellFieldNamesByPath = cellFieldNamesByPath;
        this.pathIdx = pathIdx;
    }

    /** A cell field colliding with a Cube field would overwrite it on row data. Root-path entries are the value field itself. */
    private validateCellFieldNames(cellFields: PivotCellField[]) {
        const cubeNames = new Set(this.view.cube.fields.map(f => f.name));
        cellFields.forEach(({name, path}) => {
            if (!path.isRoot && cubeNames.has(name)) {
                throw new Error(
                    `Generated pivot cell field '${name}' collides with a Cube field of the same ` +
                        `name. Rename the Cube field, or change PATH_DELIMITER.`
                );
            }
        });
    }

    /**
     * Instantiate cell rows bottom-up, then wire both aggregation routes. Cells are ordered by
     * (group, path) with both parents at lower indices, so reverse order is bottom-up on both axes.
     */
    private buildCellRows(structure: PivotStructure, groups: BaseRow[], leafRows: LeafRow[]) {
        const {cellCount, cellGroup, cellPath, childStart, childIdx, cellChildKind} = structure,
            {view, allPaths} = this,
            cellRows: PivotCellRow[] = new Array(cellCount);

        for (let c = cellCount - 1; c >= 0; c--) {
            const ownerRow = groups[cellGroup[c]],
                pathIdx = cellPath[c],
                path = allPaths[pathIdx],
                isLeafKind = cellChildKind[c] === CHILD_KIND_LEAF,
                children: BaseRow[] = [];

            for (let i = childStart[c]; i < childStart[c + 1]; i++) {
                children.push(isLeafKind ? leafRows[childIdx[i]] : cellRows[childIdx[i]]);
            }

            const id = `${ownerRow.id}#${path.key}`,
                row = (cellRows[c] = view._rowCache.getOrCreate(
                    id,
                    children,
                    () => new PivotCellRow(view, id, children, ownerRow, path)
                ));

            // A cache hit matches id and children only - rebind to this generation's instances.
            row.ownerRow = ownerRow;
            row.path = path;
        }

        for (let c = 0; c < cellCount; c++) {
            const row = cellRows[c],
                parent = structure.cellParent[c],
                pivotParent = structure.cellPivotParent[c];
            row.parent = parent >= 0 ? cellRows[parent] : null;
            row.pivotParent = pivotParent >= 0 ? cellRows[pivotParent] : null;
        }

        for (let l = 0; l < leafRows.length; l++) {
            const cell = structure.leafPivotParentCell[l];
            leafRows[l].pivotParent = cell >= 0 ? cellRows[cell] : null;
        }

        this.cellRows = cellRows;
    }

    /**
     * Name an updated leaf's cell fields into `changedFields`. They are prototype getters, so they
     * move without being written, and `GridTransactionManager` reads the set as complete.
     */
    private noteLeafCellFields(leaf: LeafRow, changedFields: Set<string>) {
        const cell = leaf.pivotParent as PivotCellRow;
        if (cell) this.cellFieldNames(cell).forEach(name => changedFields.add(name));
    }

    /** Write a cell's values onto its owning group row, moving the owner's digest if any changed. */
    private projectCell(cell: PivotCellRow, changedFields?: Set<string>) {
        const names = this.cellFieldNames(cell),
            {data, ownerRow} = cell,
            ownerData = ownerRow.data,
            {valueFields} = this;

        let changed = clearCellSlots(cell, ownerData, names, changedFields);
        for (let i = 0; i < valueFields.length; i++) {
            const name = names[i],
                val = data[valueFields[i].name];
            if (ownerData[name] !== val) {
                ownerData[name] = val;
                changedFields?.add(name);
                changed = true;
            }
        }

        if (changed) BaseRow.assignDigest(ownerData as ViewRowData);
    }

    /** A miss means a cached cell outlived its path - `buildCellRows` should have rebound it. */
    private cellFieldNames(cell: PivotCellRow): string[] {
        const ret = this.cellFieldNamesByPath.get(cell.path);
        throwIf(!ret, 'No pivot cell fields for this cell path - stale cached cell row.');
        return ret;
    }

    /** Flatten the group nodes of the final (post-bucketing) network in DFS preorder. */
    private enumerateGroups() {
        const groups: BaseRow[] = [],
            parentOfGroup: number[] = [],
            innermost: number[] = [],
            groupIdxOf = new Map<BaseRow, number>();

        const visit = (row: BaseRow, parentIdx: number) => {
            if (row.isLeaf) return;

            const idx = groups.length;
            groups.push(row);
            parentOfGroup.push(parentIdx);
            innermost.push(row.children?.some(it => it.isLeaf) ? 1 : 0);
            groupIdxOf.set(row, idx);

            row.children?.forEach(child => visit(child, idx));
        };
        this.view._rootRows.forEach(row => visit(row, -1));

        return {groups, parentOfGroup, innermost, groupIdxOf};
    }
}

function arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Point `cell` at the cell fields it is about to write onto its owner, nulling any it wrote last
 * generation and no longer covers. Returns true if a value moved.
 */
function clearCellSlots(
    row: PivotCellRow,
    data: PlainObject,
    names: string[],
    changedFields?: Set<string>
): boolean {
    const prior = row.projectedCellNames;
    row.projectedCellNames = names;
    if (!prior || prior === names) return false;

    let changed = false;
    prior.forEach(name => {
        if (!names.includes(name) && data[name] != null) {
            data[name] = null;
            changedFields?.add(name);
            changed = true;
        }
    });
    return changed;
}

const EMPTY_NAMES: string[] = [],
    EMPTY_CELLS = new Set<PivotCellRow>();
