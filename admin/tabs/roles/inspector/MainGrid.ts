import {HoistModel, XH, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {makeObservable} from 'mobx';
import {RolesTabModel} from '../RolesTabModel';
import {compactDateRenderer} from '@xh/hoist/format';
import {InspectorTabModel} from './InspectorTab';
import {vframe} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {RecordAction} from '@xh/hoist/data';
import moment from 'moment';
import './InspectorTab.scss';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';

// move from mainGrid to roleList or the like
class MainGridModel extends HoistModel {
    @managed gridModel: GridModel;

    // look through JS annotations to understand why this laziness is necessary
    // what determines parse order
    @lookup(() => InspectorTabModel) parent: InspectorTabModel;
    @lookup(() => RolesTabModel) rolesStore: RolesTabModel;

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();
        this.gridModel = this.createGridModel();

        // could just look this up and store directly
        // this.rolesStore = this.lookupModel(RolesTabModel).store

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: record => {
                this.parent.selectedRole = record?.data;
            }
        });
    }

    private isModifiedRow(record) {
        return !record?.isCommitted && record?.children.length == 0;
    }

    private createGridModel() {
        return new GridModel({
            emptyText: 'No roles found...',
            colChooserModel: true,
            sortBy: 'name|asc',
            groupBy: 'groupName',
            selModel: 'multiple',
            store: this.rolesStore.store,
            columns: [
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actions: [
                        {
                            icon: Icon.circle(),
                            intent: 'warning',
                            displayFn: ({record}) => ({disabled: !this.isModifiedRow(record)})
                        }
                    ]
                },
                {field: 'name'},
                {field: 'groupName', hidden: true},
                {field: 'lastUpdated', renderer: compactDateRenderer()},
                {field: 'lastUpdatedBy'}
            ],
            rowClassFn: record => {
                return this.isModifiedRow(record) ? 'xh-roles-modified-value' : '';
            }
        });
    }

    addRoleAction = new RecordAction({
        icon: Icon.add(),
        text: 'Create Role',
        intent: 'primary',
        actionFn: () => {
            XH.toast({
                intent: 'primary',
                message: 'New role successfully created.'
            });
            this.rolesStore.store.addRecords([
                {
                    id: XH.genId(),
                    // TODO: want to deduplicate additions (ie make it New Role (1))?
                    name: 'New Role',
                    groupName: 'New Group',
                    lastUpdated: moment.now(),
                    lastUpdatedBy: XH.getUsername()
                }
            ]);
        }
    });

    deleteRoleAction = new RecordAction({
        icon: Icon.delete(),
        text: 'Delete',
        intent: 'danger',
        actionFn: ({selectedRecords}) => {
            selectedRecords.forEach(record => {
                XH.toast({
                    intent: 'danger',
                    message: `Role ${record.data.name} deleted!`
                });
                this.rolesStore.store.removeRecords(record);
            });
        },
        recordsRequired: true
    });
}

export const mainGrid = hoistCmp.factory({
    model: creates(MainGridModel),

    render({model}) {
        const {gridModel} = model;

        return vframe(
            toolbar({
                item: recordActionBar({
                    gridModel,
                    selModel: gridModel.selModel,
                    actions: [model.addRoleAction, model.deleteRoleAction]
                }),
                // compact: true,
                // vertical: true
                omit: XH.getConf('xhAdminRoleController') != 'WRITE'
            }),
            grid()
        );
    }
});
