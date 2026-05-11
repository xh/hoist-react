/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/instances/BaseInstanceModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {compactDateRenderer, fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {downloadBlob, pluralize} from '@xh/hoist/utils/js';
import {LogDisplayModel} from './LogDisplayModel';

/**
 * @internal
 */
export class LogViewerModel extends BaseInstanceModel {
    override telemetryPrefix = 'xh.client.admin.log';

    @observable file: string = null;

    @managed
    logDisplayModel = new LogDisplayModel(this);

    @managed
    filesGridModel: GridModel;

    @bindable
    instanceOnly: boolean = true;

    @bindable
    showLogLevelDialog: boolean = false;

    get enabled(): boolean {
        return XH.getConf('xhEnableLogViewer', true);
    }

    get selectedRecord() {
        return this.filesGridModel.selectedRecord;
    }

    deleteFileAction: RecordActionSpec = {
        text: 'Delete',
        icon: Icon.delete(),
        intent: 'danger',
        recordsRequired: true,
        actionFn: () => this.deleteSelectedAsync(),
        displayFn: () => ({hidden: AppModel.readonly})
    };

    downloadFileAction: RecordActionSpec = {
        text: 'Download',
        icon: Icon.download(),
        recordsRequired: 1,
        actionFn: () => this.downloadSelectedAsync()
    };

    constructor() {
        super();
        makeObservable(this);

        this.filesGridModel = this.createGridModel();

        this.addReaction(
            {
                track: () => this.selectedRecord,
                run: rec => {
                    this.file = rec?.data?.filename;
                }
            },
            {
                track: () => this.instanceOnly,
                run: () => this.loadAsync()
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {enabled, filesGridModel, instanceOnly, instanceName} = this;
        if (!enabled) return;

        const store = filesGridModel.store,
            selModel = filesGridModel.selModel;

        return this.runOn(loadSpec)
            .newSpan('listFiles')
            .run(async ctx => {
                const data = await ctx.fetchJson({
                    url: 'logViewerAdmin/listFiles',
                    params: {instance: instanceName}
                });

                const files = instanceOnly
                    ? data.files.filter(f => f.filename.includes(instanceName))
                    : data.files;

                this.logDisplayModel.logRootPath = data.logRootPath;

                store.loadData(files);
                if (selModel.isEmpty) {
                    const latestAppLog = store.records.find(
                        rec => rec.data.filename === `${XH.appCode}-${instanceName}-app.log`
                    );
                    if (latestAppLog) {
                        selModel.select(latestAppLog);
                    }
                }
            })
            .catch(e => this.handleLoadException(e, loadSpec));
    }

    async deleteSelectedAsync() {
        const recs = this.filesGridModel.selectedRecords,
            count = recs.length;
        if (!count) return;

        const confirmed = await XH.confirm({
            message: `Are you sure you want to delete ${pluralize('log file', count, true)}? This cannot be undone.`,
            confirmProps: {
                text: `Yes, delete the ${pluralize('file', count)}`,
                intent: 'danger',
                outlined: true,
                autoFocus: false
            }
        });
        if (!confirmed) return;

        await this.rootSpan('deleteFiles')
            .run(async ctx => {
                const filenames = recs.map(r => r.data.filename);
                await ctx
                    .postJson({
                        url: 'logViewerAdmin/deleteFiles',
                        body: filenames,
                        params: {filenames, instance: this.instanceName}
                    })
                    .linkTo({observer: this.loadObserver, message: 'Deleting files'});
            })
            .then(() => this.refreshAsync())
            .catchDefault();
    }

    async downloadSelectedAsync() {
        const {selectedRecord} = this;
        if (!selectedRecord) return;

        const {filename} = selectedRecord.data;
        return this.rootSpan('download')
            .run(async ctx => {
                const response = await ctx.fetch({
                    url: 'logViewerAdmin/download',
                    params: {
                        filename,
                        instance: this.instanceName
                    }
                });

                const blob = await response.blob();
                downloadBlob(blob, filename);

                XH.toast({
                    icon: Icon.download(),
                    message: 'Download complete.'
                });
            })
            .catchDefault();
    }

    //---------------------------------
    // Implementation
    //---------------------------------
    private createGridModel() {
        return new GridModel({
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('logs')},
            selModel: 'multiple',
            store: {
                idSpec: 'filename',
                fields: [
                    {name: 'filename', type: 'string', displayName: 'Name'},
                    {name: 'size', type: 'number', displayName: 'Size'},
                    {name: 'lastModified', type: 'number', displayName: 'Modified'}
                ]
            },
            sortBy: 'lastModified|desc',
            columns: [
                {field: 'filename', flex: 1, minWidth: 160},
                {
                    field: 'size',
                    width: 80,
                    renderer: fileSizeRenderer
                },
                {
                    field: 'lastModified',
                    width: 110,
                    renderer: compactDateRenderer({sameDayFmt: 'HH:mm:ss'})
                }
            ],
            autosizeOptions: {mode: 'managed'},
            contextMenu: [
                this.downloadFileAction,
                this.deleteFileAction,
                '-',
                ...GridModel.defaults.contextMenu
            ]
        });
    }
}

function fileSizeRenderer(v) {
    if (v == null) return '';

    const inMb = v > 1000000,
        scale = inMb ? 1 / 1000000 : 1 / 1000;

    return fmtNumber(v * scale, {
        precision: 1,
        originalValue: v,
        tooltip: true,
        label: inMb ? 'mb' : 'kb'
    });
}
