/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {br, fragment, hbox, hspacer, span} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    addAction,
    cloneAction,
    deleteAction,
    editAction,
    RestGridModel
} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {isNil, truncate} from 'lodash';
import {DifferModel} from '../../../differ/DifferModel';
import {RegroupDialogModel} from '../../../regroup/RegroupDialogModel';
import {configValue} from './ConfigValue';

export class ConfigPanelModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminConfigState'};

    @managed
    regroupDialogModel = new RegroupDialogModel(this);

    @managed
    gridModel: RestGridModel;

    @managed
    @observable.ref
    differModel: DifferModel;

    constructor() {
        super();
        makeObservable(this);

        const {regroupAction} = this.regroupDialogModel,
            required = true,
            enableCreate = true,
            hidden = true;

        this.gridModel = new RestGridModel({
            // Core config
            autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
            colChooserModel: true,
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('configs')},
            filterFields: ['name', 'value', 'effectiveValue', 'groupName', 'note'],
            groupBy: 'groupName',
            persistWith: this.persistWith,
            prepareCloneFn: ({clone}) => (clone.name = `${clone.name}_CLONE`),
            readonly: AppModel.readonly,
            selModel: 'multiple',
            sortBy: 'name',
            unit: 'config',
            // Re-open the editor after saving a typed config, landing on its Resolved tab.
            postSaveFn: ({record}) => {
                if (record?.data.resolvedValue != null) {
                    this.gridModel.formModel.openEdit(record);
                }
            },
            // Store + fields
            store: {
                url: 'rest/configAdmin',
                reloadLookupsOnLoad: true,
                fieldDefaults: {enableXssProtection: false},
                // Grid-facing value - resolved for typed configs, otherwise the raw stored value.
                // A real store field so filtering/sorting/export all match the rendered cell.
                processRawData: raw => ({
                    ...raw,
                    effectiveValue:
                        raw.resolvedValue != null ? JSON.stringify(raw.resolvedValue) : raw.value
                }),
                fields: [
                    {...(Col.name.field as FieldSpec), required},
                    {
                        ...(Col.groupName.field as FieldSpec),
                        lookupName: 'groupNames',
                        required,
                        enableCreate
                    },
                    {
                        ...(Col.valueType.field as FieldSpec),
                        lookupName: 'valueTypes',
                        editable: 'onAdd',
                        required
                    },
                    {...(Col.value.field as FieldSpec), typeField: 'valueType', required},
                    {...(Col.clientVisible.field as FieldSpec), defaultValue: false, required},
                    {...(Col.note.field as FieldSpec)},
                    {...(Col.lastUpdated.field as FieldSpec), editable: false},
                    {...(Col.lastUpdatedBy.field as FieldSpec), editable: false},
                    {
                        name: 'overrideValue',
                        typeField: 'valueType',
                        editable: false
                    },
                    {name: 'resolvedValue', type: 'auto', editable: false},
                    {name: 'defaultValue', type: 'auto', editable: false},
                    {name: 'effectiveValue', type: 'auto', displayName: 'Value', editable: false},

                    // Read-only presentation slot for the value editor - edits flow through `value`.
                    {name: 'valueDisplay', type: 'auto', editable: false}
                ]
            },
            // Cols + editors
            columns: [
                {...Col.groupName, hidden},
                {...Col.name},
                {...Col.valueType},
                {
                    ...Col.value,
                    field: 'effectiveValue',
                    renderer: this.valueRenderer,
                    tooltip: this.valueTooltip,
                    rendererIsComplex: true
                },
                {...Col.clientVisible},
                {...Col.note},
                {...Col.lastUpdatedBy, hidden},
                {...Col.lastUpdated, hidden}
            ],
            editors: [
                {field: 'name'},
                {field: 'groupName'},
                {field: 'valueType'},
                // The readonlyRenderer effectively provides a custom editor for `value`.
                // `omit: false` defeats the default omission of empty read-only fields on add.
                {
                    field: 'valueDisplay',
                    omit: false,
                    formField: {
                        label: 'Value',
                        // Keyed by FormModel so each (re)opening mounts fresh tab state.
                        readonlyRenderer: (_v, model) =>
                            configValue({
                                key: model.formModel.xhId,
                                formModel: model.formModel,
                                height: 250
                            })
                    }
                },
                // Data/bind fields for the presentation above; never rendered directly.
                {field: 'value', omit: true},
                {field: 'resolvedValue', omit: true},
                {field: 'defaultValue', omit: true},
                {field: 'overrideValue', omit: true},
                {field: 'note', formField: {item: textArea({height: 100})}},
                {field: 'clientVisible'},
                {field: 'lastUpdated'},
                {field: 'lastUpdatedBy'}
            ],
            // Actions
            actionWarning: {
                del: records =>
                    fragment(
                        `Are you sure you want to delete ${pluralize('selected config', records.length, true)}?`,
                        br(),
                        br(),
                        `Deleting configs can break running apps.`
                    )
            },
            menuActions: [addAction, editAction, cloneAction, deleteAction, '-', regroupAction],
            toolbarActions: [addAction, editAction, cloneAction, deleteAction]
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }

    @action
    openDiffer() {
        this.differModel = new DifferModel({
            parentModel: this,
            entityName: 'config',
            columnFields: ['name', {field: 'valueType', headerName: 'Type'}],
            matchFields: ['name'],
            valueRenderer: v => {
                if (isNil(v)) return '';
                return v.valueType === 'pwd'
                    ? '*****'
                    : !isNil(v.overrideValue)
                      ? this.withOverrideWarning(v.value)
                      : v.value;
            }
        });
    }

    @action
    closeDiffer() {
        const {differModel} = this;
        this.differModel = null;
        XH.safeDestroy(differModel);
    }

    private valueRenderer = (value, {record}) => {
        value = this.fmtValue(value, record);
        if (isNil(record.get('overrideValue'))) return value;
        // Typed rows show their resolved value, which already reflects the override - flag it,
        // but don't strike through the (effective) value shown.
        return this.withOverrideWarning(value, {strike: isNil(record.get('resolvedValue'))});
    };

    private valueTooltip = (value, {record}) =>
        !isNil(record.get('overrideValue')) && isNil(record.get('resolvedValue'))
            ? 'Overridden by instance config / env variable. Open to view effective value.'
            : this.fmtValue(value, record);

    private fmtValue(value, record) {
        switch (record.data.valueType) {
            case 'pwd':
                return '*****';
            case 'json':
                return truncate(value, {length: 500});
            default:
                return value?.toString();
        }
    }

    private withOverrideWarning(value, {strike = true}: {strike?: boolean} = {}) {
        return hbox({
            alignItems: 'center',
            items: [
                Icon.warning({intent: 'warning', prefix: 'fas'}),
                hspacer(),
                // Clip long values cleanly - the flex row defeats the grid cell's own ellipsis.
                span({
                    item: value,
                    style: {overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}
                })
            ],
            // {} rather than null - a null style clobbers Box's own inline layout styles.
            style: strike
                ? {color: 'var(--xh-text-color-muted)', textDecoration: 'line-through'}
                : {}
        });
    }
}
