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
import {action, makeObservable} from '@xh/hoist/mobx';
import {Cube} from '@xh/hoist/data';
import {forIn, isEmpty, isFinite} from 'lodash';
import {instanceLabel} from '../impl/InspectorUtils';
import type {InstancesModel} from './InstancesModel';

/**
 * Displays the data-pipeline `diagnostics` published by any currently selected instances that
 * provide them - Stores, Cube Views, and GridModels. Each op-stats slot on a diagnostics object
 * renders as a row reporting the last operation performed (its type, work done, and timing)
 * alongside cumulative count and average timing. A selected Cube reports via its internal Store,
 * where its data ops actually land.
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
     * True if every currently selected diagnostics source is streaming its ops to the devtools
     * console at 'info' level. Derived from (and toggled onto) the per-instance
     * `diagnostics.logLevel`, so it is sticky per instance - logging continues as the selection
     * moves elsewhere, and any number of instances can be logging at once.
     */
    get logOps(): boolean {
        const tracked = this.trackedDiagnostics;
        return !isEmpty(tracked) && tracked.every(it => it.logLevel === 'info');
    }

    /** Diagnostics published by the currently selected instances. */
    get trackedDiagnostics(): BaseDiagnostics<any>[] {
        return this.diagnosticSources.map(it => it.diag);
    }

    /**
     * Selected instances resolved to the diagnostics they publish, with a display label for
     * each. A Cube resolves to its internal Store's diagnostics, labeled to show the indirection.
     */
    private get diagnosticSources(): DiagnosticSource[] {
        const ret: DiagnosticSource[] = [];
        this.parent.selectedInstances.forEach(inst => {
            const label = instanceLabel(inst),
                diag = (inst as any).diagnostics;
            if (diag instanceof BaseDiagnostics) {
                ret.push({xhId: inst.xhId, diag, label});
            } else if (Cube.isCube(inst) && inst.store?.diagnostics instanceof BaseDiagnostics) {
                ret.push({
                    xhId: inst.xhId,
                    diag: inst.store.diagnostics,
                    label: `${label} › ${instanceLabel(inst.store)}`
                });
            }
        });
        return ret;
    }

    constructor(parent: InstancesModel) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.gridModel = this.createGridModel();

        this.addAutorun({
            run: () => this.syncGrid(),
            delay: 300
        });
    }

    resetAll() {
        this.trackedDiagnostics.forEach(it => it.reset());
    }

    /** Enable/disable op logging for all currently selected diagnostics sources. */
    @action
    setLogOps(logOps: boolean) {
        this.trackedDiagnostics.forEach(it => (it.logLevel = logOps ? 'info' : 'debug'));
    }

    //------------------
    // Implementation
    //------------------
    private syncGrid() {
        const data = [];

        this.diagnosticSources.forEach(({xhId, diag, label}) => {
            forIn(diag as PlainObject, (stats, kind) => {
                if (!this.isOpStats(stats)) return;
                const {last, count, elapsed} = stats;
                data.push({
                    id: `${xhId}-${kind}`,
                    instanceDisplayName: label,
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
              : op.pending != null
                ? `pending ${op.pending}`
                : op.update != null
                  ? `upd ${op.update} · add ${op.add} · rem ${op.remove}`
                  : null;
    }

    private createGridModel(): GridModel {
        const msRenderer = numberRenderer({precision: 1, zeroPad: true, label: 'ms'});

        return new GridModel({
            persistWith: {...this.parent.persistWith, path: 'diagnosticsGrid'},
            autosizeOptions: {mode: 'managed'},
            filterModel: true,
            headerMenuDisplay: 'hover',
            groupBy: 'instanceDisplayName',
            showGroupRowCounts: false,
            sortBy: 'kind',
            store: {
                fields: [
                    {name: 'instanceDisplayName', type: 'string'},
                    {name: 'kind', displayName: 'Op', type: 'string'},
                    {name: 'type', type: 'string'},
                    {name: 'detail', displayName: 'Last Op Detail', type: 'string'},
                    {name: 'total', displayName: 'Row #', type: 'number'},
                    {name: 'lastElapsedMs', displayName: 'ms', type: 'number'},
                    {name: 'count', displayName: 'n', type: 'number'},
                    {name: 'avgMs', displayName: 'Avg ms', type: 'number'},
                    {name: 'timestamp', displayName: 'Last Run', type: 'number'}
                ]
            },
            colDefaults: {autosizeIncludeHeaderIcons: false, filterable: true},
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
                    headerTooltip: 'Mean time per operation.',
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
}

interface DiagnosticSource {
    xhId: string;
    diag: BaseDiagnostics<any>;
    label: string;
}
