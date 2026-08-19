/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, PlainObject} from '@xh/hoist/core';
import {BaseDiagnostics} from '@xh/hoist/core/impl/BaseDiagnostics';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {forIn, isFinite} from 'lodash';
import type {InstancesModel} from './InstancesModel';

/**
 * Displays the data-pipeline `diagnostics` published by any currently selected instances that
 * provide them - Stores, Cube Views, and GridModels. Each op-stats slot on a diagnostics object
 * renders as a row reporting the last operation performed (its type, work done, and timing)
 * alongside cumulative count and average timing.
 *
 * Rows are discovered from the shape of each diagnostics object rather than a per-class schema -
 * the diagnostics APIs are internal and deliberately unstable, so this readout adapts to their
 * current form.
 *
 * @internal
 */
export class DiagnosticsModel extends HoistModel {
    override xhImpl = true;

    parent: InstancesModel;
    @managed gridModel: GridModel;

    /**
     * True to stream each op performed by the selected instances to the devtools console at
     * 'info' level, following them without raising the app-wide log level. Reset on selection
     * change.
     */
    @bindable logOps = false;

    /** Diagnostics published by the currently selected instances. */
    get trackedDiagnostics(): BaseDiagnostics<any>[] {
        return this.parent.selectedInstances
            .map(inst => (inst as any).diagnostics)
            .filter(it => it instanceof BaseDiagnostics);
    }

    private escalated: BaseDiagnostics<any>[] = [];

    constructor(parent: InstancesModel) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.gridModel = this.createGridModel();

        this.addAutorun({
            run: () => this.syncGrid(),
            delay: 300
        });

        this.addReaction(
            {
                track: () => this.parent.instancesGridModel.selectedIds,
                run: () => {
                    this.logOps = false;
                    this.syncLogging();
                }
            },
            {
                track: () => this.logOps,
                run: () => this.syncLogging()
            }
        );
    }

    resetAll() {
        this.trackedDiagnostics.forEach(it => it.reset());
    }

    //------------------
    // Implementation
    //------------------
    private syncGrid() {
        const data = [];

        this.parent.selectedInstances.forEach(inst => {
            const diag = (inst as any).diagnostics;
            if (!(diag instanceof BaseDiagnostics)) return;

            const instanceDisplayName = `${inst.constructor.name} [${inst.xhId}]`;
            forIn(diag as PlainObject, (stats, kind) => {
                if (!this.isOpStats(stats)) return;
                const {last, count, elapsed} = stats;
                data.push({
                    id: `${inst.xhId}-${kind}`,
                    instanceDisplayName,
                    kind,
                    type: last?.type ?? null,
                    detail: last ? this.opDetail(last) : null,
                    total: last?.total ?? null,
                    lastElapsedMs: last?.elapsed ?? null,
                    count,
                    avgMs: count ? elapsed / count : null,
                    timestamp: last?.timestamp ?? null
                });
            });
        });

        this.gridModel.loadData(data);
    }

    /** An op-stats slot (last, count, elapsed) vs. other props on the diagnostics object. */
    private isOpStats(v: unknown): v is PlainObject {
        return (
            v != null &&
            typeof v === 'object' &&
            'last' in v &&
            isFinite((v as PlainObject).count) &&
            isFinite((v as PlainObject).elapsed)
        );
    }

    /** Summarize the work an op reported, adapting to the fields present on its shape. */
    private opDetail(op: PlainObject): string {
        return op.reused != null
            ? `reused ${op.reused} · rebuilt ${op.rebuilt} · created ${op.created}`
            : op.columns != null
              ? `cols ${op.columns} · recs ${op.records}`
              : op.update != null
                ? `upd ${op.update} · add ${op.add} · rem ${op.remove}`
                : null;
    }

    private syncLogging() {
        this.escalated.forEach(it => (it.logLevel = 'debug'));
        this.escalated = this.logOps ? this.trackedDiagnostics : [];
        this.escalated.forEach(it => (it.logLevel = 'info'));
    }

    private createGridModel(): GridModel {
        const msRenderer = (v: number) => (v != null ? `${v.toFixed(1)}ms` : null);

        return new GridModel({
            persistWith: {...this.parent.persistWith, path: 'diagnosticsGrid'},
            autosizeOptions: {mode: 'managed'},
            emptyText: 'Select a Store, Cube View, or GridModel to view data-pipeline diagnostics.',
            groupBy: 'instanceDisplayName',
            showGroupRowCounts: false,
            sortBy: 'kind',
            store: {
                fields: [
                    {name: 'instanceDisplayName', type: 'string'},
                    {name: 'kind', displayName: 'Op', type: 'string'},
                    {name: 'type', type: 'string'},
                    {name: 'detail', displayName: 'Last Op Detail', type: 'string'},
                    {name: 'total', type: 'number'},
                    {name: 'lastElapsedMs', displayName: 'ms', type: 'number'},
                    {name: 'count', displayName: 'n', type: 'number'},
                    {name: 'avgMs', displayName: 'avg ms', type: 'number'},
                    {name: 'timestamp', displayName: 'Last Run', type: 'number'}
                ]
            },
            colDefaults: {autosizeIncludeHeaderIcons: false},
            columns: [
                {field: 'instanceDisplayName', hidden: true},
                {field: 'kind', width: 140},
                {
                    field: 'type',
                    width: 110,
                    headerTooltip:
                        'Path the operation took through the data pipeline - e.g. an incremental patch/delta vs. a full rebuild.'
                },
                {field: 'detail', minWidth: 180, flex: 1},
                {
                    field: 'total',
                    headerTooltip: 'Total records/rows held after the last operation.',
                    renderer: numberRenderer({precision: 0}),
                    highlightOnChange: true
                },
                {
                    field: 'lastElapsedMs',
                    headerTooltip: 'Time taken by the last operation.',
                    align: 'right',
                    renderer: msRenderer,
                    highlightOnChange: true
                },
                {
                    field: 'count',
                    headerTooltip: 'Operations performed since activation or last reset.',
                    renderer: numberRenderer({precision: 0})
                },
                {
                    field: 'avgMs',
                    headerTooltip:
                        'Mean time per operation - resolves sub-millisecond ops that report 0ms individually.',
                    align: 'right',
                    renderer: msRenderer
                },
                {
                    field: 'timestamp',
                    align: 'right',
                    renderer: v => fmtDate(v, {fmt: 'HH:mm:ss.SSS'}),
                    highlightOnChange: true
                }
            ],
            xhImpl: true
        });
    }

    override destroy() {
        this.escalated.forEach(it => (it.logLevel = 'debug'));
        super.destroy();
    }
}
