/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed, PlainObject, XH} from '@xh/hoist/core';
import {Cube, CubeFieldSpec, View} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {isEmpty} from 'lodash';
import {DataLayerAdapter} from './DataLayerAdapter';

/**
 * Config for the {@link BaselineAdapter}. All optional - sensible defaults make the adapter usable
 * with any flat dataset whose rows share a common key set.
 */
export interface BaselineAdapterConfig {
    /**
     * Cube grouping dimensions (field names). Drives the aggregate-row cardinality. These fields are
     * declared `isDimension: true` on the cube; every other field is treated as a numeric measure
     * (summed) so the View produces real aggregate rows. Defaults to `[]` (flat, no aggregation).
     */
    dimensions?: string[];
    /**
     * Field names to aggregate (SUM) at each aggregate node. Defaults to every non-dimension,
     * non-id field discovered in the first snapshot row.
     */
    aggregators?: string[];
}

/**
 * The concrete baseline {@link DataLayerAdapter} (HARN-06) - it drives the REAL current-pipeline
 * data path so candidate engines are measured apples-to-apples against the system as it exists today.
 *
 * Wiring (the live Phase-1 pipeline):
 *
 *   Cube.loadDataAsync / updateDataAsync (the invariant two-op ingest contract)
 *        then re-aggregation / async view update, into
 *   View (connected), whose observable-ref View.result (a ViewResult) is
 *        loaded by the View into its configured Store, into
 *   GridModel.store, then AG Grid via agApi.applyTransaction (when the grid is mounted).
 *
 * The adapter builds the Cube LAZILY on the first `loadSnapshotAsync` so it can infer the field set
 * from the supplied rows (dimensions vs numeric measures), then creates a CONNECTED View whose
 * result is loaded into the backing `GridModel`'s store. From then on, each `applyDiffAsync` flows
 * through `Cube.updateDataAsync` and re-materializes the View result into the grid store.
 *
 * TREE SHAPE (HARN-01): the backing `GridModel` is `treeMode: true` with exactly one
 * `isTreeColumn: true` column (the first dimension), and the connected View query sets
 * `includeLeaves: true` UNCONDITIONALLY - so leaf facts sit under the deepest aggregate level. The
 * result is a real large-leaf-plus-aggregate TREE (expandable aggregate group rows drilling down to
 * leaf children), not a flat top-level-only aggregate. With no dimensions configured, the flat
 * leaves still surface so the no-dimension case keeps working. The row-count accessors reflect the
 * FULL hierarchy (aggregate nodes + leaves) - these counts feed 02-08 heap attribution.
 *
 * INVARIANT, CALLER-OWNED DATA: `loadSnapshotAsync(rawRows)` and `applyDiffAsync(diff)` ALWAYS take
 * caller-supplied data (per the 02-01 `DataLayerAdapter` contract). The adapter NEVER fetches or
 * generates rows - the harness caller (Toolbox) owns all transport/endpoint knowledge.
 *
 * GRID-SYNC SEAM (the `genTransaction` / `applyTransaction` callables for `measureGridSyncAsync`):
 * The live `GridLocalModel.genTransaction` (`cmp/grid/Grid.ts`) is an impl-only method that exists
 * only once the grid COMPONENT is mounted and linked - it is not reachable from a `GridModel`
 * instance the harness holds programmatically. So the adapter exposes its OWN `genTransaction` that
 * mirrors that exact diff logic (add/update/remove by record identity against the previous filtered
 * record set) over the live grid store's records - this is the closest faithful reachable seam for
 * the Hoist-side COMPUTE half. The `applyTransaction` callable is bound to the live
 * `gridModel.agApi.applyTransaction` when a grid is actually mounted (the true JS-to-AG-Grid BRIDGE
 * call); when no grid is mounted (`agApi` is null - the common harness case, since mounting a real
 * grid component is a UI concern owned by 02-06), it falls back to a documented no-op so compute and
 * heap are still measured. The bridge half is therefore only non-trivial when 02-06 mounts a live
 * grid and wires its `agApi`; this limitation is documented in the plan SUMMARY.
 */
export class BaselineAdapter extends HoistModel implements DataLayerAdapter {
    readonly id = 'baseline-cube';

    @managed cube: Cube = null;
    @managed view: View = null;
    @managed gridModel: GridModel = null;

    private readonly adapterConfig: Required<BaselineAdapterConfig>;

    /**
     * Snapshot of the grid store's filtered record list as of the last grid sync, used by
     * {@link genTransaction} to diff against the current list - mirrors `GridLocalModel.prevRs`.
     */
    private prevRecords: any[] = [];

    constructor(config: BaselineAdapterConfig = {}) {
        super();
        this.adapterConfig = {
            dimensions: config.dimensions ?? [],
            aggregators: config.aggregators ?? null
        };
    }

    //--------------------------------------------------------------------------------------------
    // DataLayerAdapter contract - the invariant two-op ingest + read-back accessors
    //--------------------------------------------------------------------------------------------

    /** Full snapshot ingest via `Cube.loadDataAsync`. Lazily builds the pipeline on first call. */
    async loadSnapshotAsync(rawRows: PlainObject[]): Promise<void> {
        if (!this.cube) this.buildPipeline(rawRows);
        await this.cube.loadDataAsync(rawRows, {});
        this.captureGridSnapshot();
    }

    /** Incremental diff ingest via `Cube.updateDataAsync`. Caller-supplied diff; never fetched. */
    async applyDiffAsync(diff: PlainObject[]): Promise<void> {
        if (!this.cube) {
            throw XH.exception(
                'BaselineAdapter.applyDiffAsync called before loadSnapshotAsync - the snapshot ' +
                    'must be loaded first so the pipeline is built.'
            );
        }
        await this.cube.updateDataAsync(diff, {});
        this.captureGridSnapshot();
    }

    /**
     * Current materialized result row count over the FULL hierarchy (aggregate nodes + leaves).
     * `View.result.rows` is only the TOP-level array, so we use the connected grid store's
     * `allCount` - the View loads the entire hierarchical tree (every aggregate node and every
     * leaf, via `includeLeaves: true`) into that store as unfiltered records, so `allCount` is the
     * full-tree count. (`store.allCount` is unfiltered; `store.count` would be the filtered subset.)
     */
    getResultRowCount(): number {
        return this.gridModel?.store?.allCount ?? 0;
    }

    /** Current materialized result rows (engine-specific `ViewRowData` - harness only counts/sizes). */
    getResultRows(): unknown[] {
        return this.view?.result?.rows ?? [];
    }

    /** Tear down the live pipeline between scenarios so iterations start from a clean heap. */
    async disposeAsync(): Promise<void> {
        XH.safeDestroy(this.gridModel, this.view, this.cube);
        this.gridModel = null;
        this.view = null;
        this.cube = null;
        this.prevRecords = [];
    }

    /**
     * Empty the LIVE pipeline to a true-empty state WITHOUT nulling it - the one true-empty path the
     * harness uses to capture a clean post-GC empty-pipeline heap baseline (02-08) and to leave no
     * residual heap after each per-record sizing cycle.
     *
     * Unlike {@link disposeAsync} (which destroys + nulls cube/view/gridModel, losing the mounted
     * grid the bridge measurement needs), this keeps every pipeline instance ALIVE and only clears
     * the DATA: `Cube.clearAsync()` clears all data/info from the cube and re-aggregates its connected
     * Views asynchronously, so the connected View re-materializes to empty and the grid store clears.
     * `prevRecords` is reset so the next `genTransaction` diff baseline is clean.
     *
     * This is the ONLY true-empty path: the injected `clearAsync`/`loadNRowsAsync` callbacks both call
     * `loadSnapshotAsync` (a reload/replace) and never reach empty, so they cannot serve as the empty
     * baseline source.
     */
    async clearPipelineAsync(): Promise<void> {
        if (this.cube) await this.cube.clearAsync();
        this.prevRecords = [];
    }

    //--------------------------------------------------------------------------------------------
    // Grid-sync seam the harness needs for measureGridSyncAsync (Boundary 5)
    //--------------------------------------------------------------------------------------------

    /**
     * The Hoist-side COMPUTE half of Boundary 5: builds an AG Grid add/update/remove transaction by
     * diffing the grid store's CURRENT filtered records against the snapshot captured at the last
     * sync ({@link prevRecords}). Mirrors `GridLocalModel.genTransaction` (`cmp/grid/Grid.ts`)
     * faithfully (add = new id, update = same id different ref, remove = dropped id), since that
     * impl-only method is not reachable from a programmatic GridModel. Returns the transaction object
     * `measureGridSyncAsync` then hands to {@link applyTransaction}.
     */
    genTransaction = (): unknown => {
        const newList = this.gridModel?.store?.records ?? [],
            prevList = this.prevRecords,
            prevById = new Map(prevList.map(rec => [rec.id, rec]));

        const add: any[] = [],
            update: any[] = [];
        let remove: any[] = [];

        newList.forEach(rec => {
            const existing = prevById.get(rec.id);
            if (!existing) {
                add.push(rec);
            } else if (existing !== rec) {
                update.push(rec);
            }
        });

        if (newList.length !== prevList.length + add.length) {
            const newById = new Map(newList.map(rec => [rec.id, rec]));
            remove = prevList.filter(rec => !newById.has(rec.id));
        }

        const txn: PlainObject = {};
        if (!isEmpty(add)) txn.add = add;
        if (!isEmpty(update)) txn.update = update;
        if (!isEmpty(remove)) txn.remove = remove;
        return txn;
    };

    /**
     * The JS-to-AG-Grid BRIDGE half of Boundary 5: applies the transaction via the live
     * `agApi.applyTransaction` when a grid is mounted (so the real synchronous crossing cost is
     * measured). When no grid is mounted (`agApi` null - the common programmatic-harness case), this
     * is a documented no-op: the compute and heap halves are still measured, but the bridge sample
     * reflects only the call overhead. 02-06 mounting a live grid is what makes this non-trivial.
     */
    applyTransaction = (txn: unknown): void => {
        const {agApi} = this.gridModel ?? ({} as GridModel);
        if (agApi && !isEmpty(txn)) {
            agApi.applyTransaction(txn as any);
        }
        // After applying, the current list becomes the baseline for the next genTransaction diff.
        this.captureGridSnapshot();
    };

    /**
     * Current grid record count over the FULL loaded tree - for heap attribution `gridRecordCount`.
     * Uses `store.allCount` (all loaded records, every aggregate node + leaf) rather than
     * `store.records.length` (the filtered/visible subset), so heap attribution sees every record
     * the grid store actually holds.
     */
    getGridRecordCount(): number {
        return this.gridModel?.store?.allCount ?? 0;
    }

    /** Current cube (leaf) record count - for heap attribution `cubeRecordCount`. */
    getCubeRecordCount(): number {
        return this.cube?.store?.records?.length ?? 0;
    }

    //--------------------------------------------------------------------------------------------
    // Implementation
    //--------------------------------------------------------------------------------------------

    /**
     * Build the live Cube + connected View + backing GridModel, inferring the field set from the
     * first snapshot row: declared `dimensions` become cube dimension fields; every other
     * non-`id` field becomes a numeric measure with a SUM aggregator so the View yields real
     * aggregate rows. The View is connected for live updates and loads its result into the grid store.
     */
    private buildPipeline(sampleRows: PlainObject[]): void {
        const sample = sampleRows?.[0] ?? {},
            {dimensions} = this.adapterConfig,
            allKeys = Object.keys(sample).filter(k => k !== 'id'),
            measureKeys = (this.adapterConfig.aggregators ?? allKeys).filter(
                k => !dimensions.includes(k)
            );

        const fields: CubeFieldSpec[] = [
            ...dimensions.map(name => ({name, isDimension: true})),
            ...measureKeys.map(name => ({name, aggregator: 'SUM' as const}))
        ];

        const cube = new Cube({fields});

        // treeMode grid with exactly one tree column (the first dimension is the natural tree
        // column) so the hierarchical ViewRowData the connected View loads renders as expandable
        // group rows drilling down to leaf children. With no dimensions, no tree column is set and
        // the grid is a flat list of the surfaced leaves.
        const gridModel = new GridModel({
            store: {idSpec: 'id'},
            treeMode: !isEmpty(dimensions),
            columns: [
                ...dimensions.map((field, i) => ({field, isTreeColumn: i === 0})),
                ...measureKeys.map(field => ({field}))
            ]
        });

        // Connected View loads its hierarchical result rows directly into the grid store, so the
        // full Cube -> View.result -> Store pipeline runs on every ingest op. `includeLeaves: true`
        // UNCONDITIONALLY surfaces leaf facts as children of the deepest aggregate level (a real
        // large-leaf-plus-aggregate tree, HARN-01); with no dimensions it surfaces the flat leaves
        // so the no-dimension case keeps working.
        const view = cube.createView({
            query: {
                dimensions,
                includeLeaves: true
            },
            stores: gridModel.store,
            connect: true
        });

        this.cube = cube;
        this.view = view;
        this.gridModel = gridModel;
    }

    /** Snapshot the grid store's current records as the baseline for the next genTransaction diff. */
    private captureGridSnapshot(): void {
        this.prevRecords = [...(this.gridModel?.store?.records ?? [])];
    }
}
