/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {div, hbox, hspacer, label, pre} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    addAction,
    cloneAction,
    deleteAction,
    editAction,
    RestGridModel,
    RestStore
} from '@xh/hoist/desktop/cmp/rest';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isNil, truncate} from 'lodash';
import {DifferModel} from '../../../differ/DifferModel';
import {RegroupDialogModel} from '../../../regroup/RegroupDialogModel';
import {Icon} from '@xh/hoist/icon';

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

        const required = true,
            enableCreate = true,
            hidden = true;

        this.gridModel = new RestGridModel({
            readonly: AppModel.readonly,
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('configs')},
            selModel: 'multiple',
            store: new RestStore({
                url: 'rest/configAdmin',
                reloadLookupsOnLoad: true,
                fieldDefaults: {disableXssProtection: true},
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
                        displayName: 'Override',
                        typeField: 'valueType',
                        editable: false
                    },
                    {name: 'isOverridden', type: 'bool', editable: false}
                ],
                processRawData: data => ({...data, isOverridden: !isNil(data.overrideValue)})
            }),
            actionWarning: {
                del: records =>
                    `Are you sure you want to delete ${records.length} config(s)? Deleting configs can break running apps.`
            },
            toolbarActions: [addAction, editAction, cloneAction, deleteAction],
            menuActions: [
                addAction,
                editAction,
                cloneAction,
                deleteAction,
                this.regroupDialogModel.regroupAction
            ],
            prepareCloneFn: ({clone}) => (clone.name = `${clone.name}_CLONE`),
            unit: 'config',
            filterFields: ['name', 'value', 'groupName', 'note'],
            sortBy: 'name',
            groupBy: 'groupName',
            columns: [
                {...Col.groupName, hidden},
                {...Col.name},
                {...Col.valueType},
                {
                    ...Col.value,
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
                {
                    field: 'isOverridden',
                    formField: {
                        className: 'xh-config-panel-overridden-field',
                        label: false,
                        flex: 1,
                        inline: false,
                        minimal: false,
                        readonlyRenderer: v =>
                            v
                                ? toolbar({
                                      className: 'xh-config-panel-overridden-field__toolbar',
                                      items: [
                                          Icon.warning(),
                                          hspacer(),
                                          'Overridden by Instance Config'
                                      ]
                                  })
                                : null
                    }
                },
                {field: 'name'},
                {field: 'groupName'},
                {field: 'valueType'},
                {field: 'value'},
                {
                    field: 'overrideValue',
                    formField: {
                        className: 'xh-config-panel-override-value-field',
                        label: false,
                        flex: 1,
                        inline: false,
                        minimal: false,
                        readonlyRenderer: v =>
                            !isNil(v)
                                ? hbox({
                                      className: 'xh-config-panel-override-value-field__contents',
                                      items: [
                                          label({
                                              className: 'xh-form-field-label',
                                              item: 'Override Value'
                                          }),
                                          div({
                                              className: 'xh-form-field-inner',
                                              item: pre(v)
                                          })
                                      ]
                                  })
                                : null
                    }
                },
                {field: 'note', formField: {item: textArea({height: 100})}},
                {field: 'clientVisible'},
                {field: 'lastUpdated'},
                {field: 'lastUpdatedBy'}
            ]
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
                return v.valueType === 'pwd' ? '*****' : v.value;
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
        if (!record.get('isOverridden')) return value;
        return hbox({
            alignItems: 'center',
            className: 'xh-config-panel__overridden',
            items: [Icon.warning({intent: 'warning'}), hspacer(), value]
        });
    };

    private valueTooltip = (value, {record}) =>
        record.get('isOverridden') ? 'Overridden by Instance Config' : this.fmtValue(value, record);

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
}
