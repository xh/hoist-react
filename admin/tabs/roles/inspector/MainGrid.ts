import {GridModel, grid} from '@xh/hoist/cmp/grid';
import {div, span, vframe} from '@xh/hoist/cmp/layout';
import {HoistModel, XH, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {RecordAction, Store} from '@xh/hoist/data';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {compactDateRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from 'mobx';
import moment from 'moment';
import {InspectorTabModel} from './InspectorTab';
import './InspectorTab.scss';

// move from mainGrid to roleList or the like
class MainGridModel extends HoistModel {
    @managed gridModel: GridModel;

    @managed store = this.createStore();

    // look through JS annotations to understand why this laziness is necessary
    // what determines parse order
    @lookup(() => InspectorTabModel) parent: InspectorTabModel;

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
                this.parent.selectedRoleId = record?.data.roleId;
            },
            fireImmediately: true
        });
    }

    override async doLoadAsync() {
        const resp = await XH.fetchJson({url: 'rolesAdmin'});
        this.store.loadData(resp);
    }

    private createStore() {
        return new Store({
            idSpec: 'roleId',
            fields: [
                {name: 'roleId', type: 'number'},
                {name: 'name', type: 'string'},
                {name: 'groupName', type: 'string'},
                {name: 'lastUpdated', type: 'date'},
                {name: 'lastUpdatedBy', type: 'string'},
                {name: 'assignedUserCount', type: 'number'},
                {name: 'allUserCount', type: 'number'}
            ]
        });
    }

    private createGridModel() {
        return new GridModel({
            emptyText: 'No roles found...',
            colChooserModel: true,
            sortBy: 'name|asc',
            groupBy: 'groupName',
            selModel: 'multiple',
            store: this.store,
            columns: [
                {field: 'name'},
                {field: 'groupName', hidden: true},
                {field: 'lastUpdated', renderer: compactDateRenderer()},
                {field: 'lastUpdatedBy'},
                {
                    colId: 'numUsers',
                    displayName: '# Users (assigned | all)',
                    rendererIsComplex: true,
                    align: 'center',
                    renderer: (_, {record}) => {
                        const {assignedUserCount, allUserCount} = record.data;
                        return div({
                            items: [
                                span({
                                    item: assignedUserCount,
                                    style: {flex: 1, textAlign: 'right'}
                                }),
                                span({
                                    item: '|',
                                    style: {margin: '0 0.2em', color: 'var(--xh-text-color-muted)'}
                                }),
                                span({item: allUserCount, style: {flex: 1, textAlign: 'left'}})
                            ],
                            style: {
                                fontFamily: 'monospace',
                                display: 'flex',
                                justifyContent: 'center'
                            }
                        });
                    }
                }
            ]
        });
    }

    addRoleAction = new RecordAction({
        icon: Icon.add(),
        text: 'Create Role',
        intent: 'success',
        actionFn: () => {
            XH.toast({
                intent: 'primary',
                message: 'New role successfully created.'
            });
            this.gridModel.store.addRecords([
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
                this.store.removeRecords(record);
            });
        },
        recordsRequired: true
    });
}

export const mainGrid = hoistCmp.factory({
    model: creates(MainGridModel),

    render({model}) {
        const {gridModel} = model;

        return panel({
            item: vframe(
                toolbar({
                    item: recordActionBar({
                        gridModel,
                        selModel: gridModel.selModel,
                        actions: [model.addRoleAction, model.deleteRoleAction]
                    }),
                    omit: !XH.getConf('xhRoleManagerConfig').canWrite
                }),
                grid()
            )
        });
    }
});
