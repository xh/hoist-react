/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {ColumnRenderer, ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {div, hbox, p} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {actionCol} from '@xh/hoist/desktop/cmp/grid';
import {RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {cloneDeep, isEqual, isNil, isString, omit, remove} from 'lodash';
import {hspacer} from '../../cmp/layout';
import {DifferDetailModel} from './DifferDetailModel';
import {DifferHostModel} from './DifferHostModel';
import {DifferHostsModel} from './DifferHostsModel';

/**
 * @internal
 */
export class DifferModel extends HoistModel {
    override telemetryPrefix = 'xh.client.admin.differ';

    parentModel: HoistModel & {gridModel: RestGridModel; closeDiffer: () => void};
    entityName: string;
    displayName: string;
    columnFields: Array<string | Partial<ColumnSpec>>;
    matchFields: string[];
    valueRenderer: ColumnRenderer;
    url: string;

    private clipboardContent: PlainObject;

    @managed
    detailModel = new DifferDetailModel({parent: this});

    @managed
    hostsModel = new DifferHostsModel();

    @managed
    gridModel: GridModel;

    @observable
    hasLoaded = false;

    get readonly() {
        return this.parentModel?.gridModel.readonly;
    }

    applyRemoteAction: RecordActionSpec = {
        text: 'Apply Remote',
        icon: Icon.cloudDownload(),
        // Account for use in both action column (record only) and context menu (selectedRecords).
        actionFn: ({record, selectedRecords}) => {
            const selection = selectedRecords || [record];
            this.confirmApplyRemote(selection);
        },
        displayFn: () => ({hidden: this.readonly}),
        recordsRequired: true
    };

    /** Remote instance currently selected for comparison. */
    get remoteHost(): DifferHostModel {
        return this.hostsModel.selectedHost;
    }

    constructor({
        parentModel,
        entityName,
        displayName,
        columnFields = ['name'],
        matchFields = ['name'],
        valueRenderer
    }: Partial<DifferModel>) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;
        this.entityName = entityName;
        this.displayName = displayName ?? entityName;
        this.columnFields = columnFields;
        this.matchFields = matchFields;
        this.valueRenderer = valueRenderer ?? (v => (isNil(v) ? '' : v.value));

        this.url = entityName + 'DiffAdmin';

        const rendererIsComplex = true;
        this.gridModel = new GridModel({
            store: {
                idSpec: data => {
                    return this.matchFields.map(field => data[field]?.toString()).join('-');
                },
                filter: {field: 'status', op: '!=', value: 'Identical'},
                fields: [...this.columnFields.map(it => (isString(it) ? it : it.field))]
            },
            emptyText: 'No records found.',
            selModel: 'multiple',
            sortBy: 'name',
            groupBy: 'status',
            enableExport: true,
            showHover: true,
            onRowDoubleClicked: e => this.detailModel.open(e.data),
            columns: [
                {
                    ...actionCol,
                    width: 60,
                    actions: [this.applyRemoteAction]
                },
                {
                    field: 'status',
                    hidden: true
                },
                ...this.columnFields.map(it => {
                    const colDef = {renderer: this.fieldRenderer, rendererIsComplex, maxWidth: 200};
                    return isString(it) ? {field: it, ...colDef} : {...colDef, ...it};
                }),
                {
                    field: 'localValue',
                    flex: true,
                    rendererIsComplex,
                    renderer: this.valueRenderer
                },
                {
                    field: 'remoteValue',
                    flex: true,
                    rendererIsComplex,
                    renderer: this.valueRenderer
                }
            ],
            contextMenu: [this.applyRemoteAction, '-', ...GridModel.defaults.contextMenu]
        });

        this.addReaction({
            when: () => this.hasLoaded && this.gridModel.isReady,
            run: () => this.gridModel.autosizeAsync()
        });

        this.hostsModel.checkHostsAsync();
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        if (loadSpec.isAutoRefresh || (!this.remoteHost && !this.clipboardContent)) return;

        await this.runner({loadSpec})
            .span('load')
            .run(async ctx => {
                const remoteBaseUrl = this.remoteHost?.baseUrl,
                    {entityName, url} = this;

                const resp = await Promise.all([
                    XH.fetchJson({url: `${url}/${entityName}s`}, ctx),
                    this.clipboardContent
                        ? Promise.resolve(cloneDeep(this.clipboardContent))
                        : XH.fetchJson({url: `${remoteBaseUrl}${url}/${entityName}s`}, ctx)
                ]);
                this.processResponse(resp);
            })
            .catch(e => {
                this.processFailedLoad();
                if (e.httpStatus === 401 || e.httpStatus === 403) {
                    // Re-check so the instance picker reflects what just went wrong.
                    this.remoteHost?.checkAsync();
                    XH.alert({
                        title: 'Access Denied',
                        icon: Icon.accessDenied(),
                        message:
                            'Access denied when querying records. Check the instance picker - you may need to visit the remote instance in a new tab to log in, or use an account with admin rights there.'
                    });
                } else {
                    XH.handleException(e, {showAsError: false, logOnServer: false});
                }
            });
    }

    diffFromRemote() {
        this.clipboardContent = null;
        this.loadAsync();
    }

    async diffFromClipboardAsync() {
        try {
            await this.readConfigFromClipboardAsync();
            await this.loadAsync();
        } catch (e) {
            XH.handleException(e, {
                message: `Unable to compare clipboard data: ${e.message}`,
                logOnServer: false
            });
        }
    }

    @action
    processResponse(resp) {
        const local = this.cleanRawData(resp[0].data),
            remote = this.cleanRawData(resp[1].data),
            diffedRecords = this.diffRawRecords(local, remote),
            {store} = this.gridModel;

        store.loadData(diffedRecords);
        this.hasLoaded = true;
        if (store.empty) this.showNoDiffToast();
    }

    @action
    processFailedLoad() {
        this.gridModel.clear();
        this.clipboardContent = null;
        this.hasLoaded = false;
    }

    diffRawRecords(localRecords, remoteRecords) {
        const ret = [];

        // 0) Check each local record against (possible) remote counterpart. Cull remote record if found.
        localRecords.forEach(local => {
            const remote = remoteRecords.find(it => {
                return this.matchFields.every(field => it[field] === local[field]);
            });

            const values = {};
            this.matchFields.forEach(field => {
                values[field] = local[field];
            });

            ret.push({
                ...values,
                localValue: local,
                remoteValue: remote,
                status: this.rawRecordsAreEqual(local, remote)
                    ? 'Identical'
                    : remote
                      ? 'Diff'
                      : 'Local Only'
            });

            if (remote) {
                remove(remoteRecords, it => {
                    return this.matchFields.every(field => it[field] === remote[field]);
                });
            }
        });

        // 1) Any remote records left in array are remote only
        remoteRecords.forEach(remote => {
            const values = {};
            this.matchFields.forEach(field => {
                values[field] = remote[field];
            });

            ret.push({
                ...values,
                localValue: null,
                remoteValue: remote,
                status: 'Remote Only'
            });
        });

        return ret;
    }

    rawRecordsAreEqual(local, remote) {
        // cloning to avoid disturbing the source data.
        local = cloneDeep(local);
        remote = cloneDeep(remote);

        // For JSON records, parse JSON to do an accurate value compare,
        if (local?.valueType === 'json' && remote?.valueType === 'json') {
            local.value = JSON.parse(local.value);
            remote.value = JSON.parse(remote.value);
        }

        // exclude last update data from equality check
        delete local?.lastUpdatedBy;
        delete local?.lastUpdated;
        delete remote?.lastUpdatedBy;
        delete remote?.lastUpdated;

        return isEqual(local, remote);
    }

    cleanRawData(data) {
        data.forEach(it => {
            delete it.dateCreated;
            delete it.id;
        });

        return data;
    }

    confirmApplyRemote(records) {
        const filteredRecords = records.filter(it => !this.isPwd(it) && !this.isOverridden(it)),
            hadProtectedRecords = records.length !== filteredRecords.length,
            willDelete = filteredRecords.some(it => !it.data.remoteValue),
            confirmMsg = `Are you sure you want to apply remote values to ${pluralize(
                this.displayName,
                filteredRecords.length,
                true
            )}?`,
            prodWarning = hbox({
                omit: !XH.environmentService.isProduction(),
                alignItems: 'center',
                items: [
                    Icon.warning({intent: 'warning', size: '2x'}),
                    hspacer(8),
                    'NOTE - you are currently in Production - any change will be applied to this environment.'
                ]
            });
        const message = div(
            p(confirmMsg),
            p(prodWarning),
            p({
                omit: !hadProtectedRecords,
                item: 'Warning: No changes will be applied to password and/or overridden records. These must be changed manually.'
            }),
            p({omit: !willDelete, item: 'Warning: Operation includes deletions.'})
        );

        XH.confirm({
            message,
            confirmProps: {
                text: 'Yes, update local config',
                intent: 'primary'
            },
            onConfirm: () => this.doApplyRemote(filteredRecords)
        });
    }

    isPwd(rec) {
        const {localValue, remoteValue} = rec.data;
        return localValue?.valueType === 'pwd' || remoteValue?.valueType === 'pwd';
    }

    isOverridden(rec) {
        const {localValue, remoteValue} = rec.data;
        return !isNil(localValue?.overrideValue) || !isNil(remoteValue?.overrideValue);
    }

    doApplyRemote(records) {
        this.runner()
            .span('applyRemote')
            .run(async ctx => {
                const recsForPost = records.map(rec => {
                    const ret = {
                        remoteValue: omit(rec.data.remoteValue, 'lastUpdated', 'lastUpdatedBy')
                    };
                    this.matchFields.forEach(field => {
                        ret[field] = rec.data[field];
                    });
                    return ret;
                });
                await XH.fetchJson(
                    {
                        url: `${this.url}/applyRemoteValues`,
                        params: {records: JSON.stringify(recsForPost)}
                    },
                    ctx
                );
            })
            .finally(() => {
                this.loadAsync();
                this.parentModel.gridModel.loadAsync();
                this.detailModel.close();
            })
            .linkTo(this.loadObserver)
            .catchDefault();
    }

    showNoDiffToast() {
        XH.successToast('Good news - all records match remote host.');
    }

    fieldRenderer(v, {record, column}) {
        const {field} = column,
            local = record.data.localValue,
            remote = record.data.remoteValue,
            localVal = local?.[field],
            remoteVal = remote?.[field];

        if (local && remote) {
            return localVal === remoteVal ? localVal : '??';
        }

        return local ? localVal : remoteVal;
    }

    async fetchLocalAsync() {
        return this.runner()
            .span('fetchLocal')
            .run(async ctx => {
                const {entityName, url} = this,
                    resp = await XH.fetchJson({url: `${url}/${entityName}s`}, ctx);
                return JSON.stringify(resp);
            });
    }

    private async readConfigFromClipboardAsync() {
        const contentString = await window.navigator.clipboard.readText(),
            content = JSON.parse(contentString);

        if (!content?.data) {
            throw XH.exception(
                'Clipboard did not contain remote data in the expected JSON format.'
            );
        }

        this.clipboardContent = content;
    }
}
