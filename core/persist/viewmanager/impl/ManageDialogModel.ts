import {FormModel} from '@xh/hoist/cmp/form';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed, TaskObserver, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {pluralize, throwIf} from '@xh/hoist/utils/js';
import {ViewManagerModel} from '../ViewManagerModel';
import {startCase} from 'lodash';

export class ManageDialogModel extends HoistModel {
    @lookup(() => ViewManagerModel)
    private viewManagerModel: ViewManagerModel;

    @managed gridModel: GridModel;
    @managed formModel: FormModel;

    readonly saveTask = TaskObserver.trackLast();
    readonly deleteTask = TaskObserver.trackLast();

    get selectedId(): string {
        return this.gridModel.selectedId as string;
    }

    get selectedIds(): string[] {
        return this.gridModel.selectedIds as string[];
    }

    get hasMultiSelection(): boolean {
        return this.selectedIds.length > 1;
    }

    get selIsGlobal(): boolean {
        return this.gridModel.selectedRecords.some(rec => rec.data.isGlobal);
    }

    get canDelete(): boolean {
        const {viewManagerModel, selIsGlobal, manageGlobal, selectedIds} = this,
            {views, enableDefault} = viewManagerModel;

        // Can't delete  global views without role.
        if (selIsGlobal && !manageGlobal) return false;

        // Can't delete all the views, unless default mode is enabled.
        return enableDefault || views.length - selectedIds.length > 0;
    }

    get canEdit(): boolean {
        return this.manageGlobal || !this.selIsGlobal;
    }

    get manageGlobal(): boolean {
        return this.viewManagerModel.manageGlobal;
    }

    get showSaveButton(): boolean {
        const {formModel, viewManagerModel} = this;
        return formModel.isDirty && !formModel.readonly && !viewManagerModel.loadModel.isPending;
    }

    get typeDisplayName(): string {
        return this.viewManagerModel.typeDisplayName;
    }

    get globalDisplayName(): string {
        return this.viewManagerModel.globalDisplayName;
    }

    get enableFavorites(): boolean {
        return this.viewManagerModel.enableFavorites;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        super.onLinked();

        this.gridModel = this.createGridModel();
        this.formModel = this.createFormModel();

        this.addReaction(
            {
                track: () => this.viewManagerModel.views,
                run: () => this.refreshAsync()
            },
            {
                track: () => this.gridModel.selectedRecord,
                run: record => {
                    if (record) {
                        this.formModel.readonly = !this.canEdit;
                        this.formModel.init(record.data);
                    }
                }
            }
        );
    }

    override async doLoadAsync() {
        const {viewManagerModel, typeDisplayName, globalDisplayName} = this,
            pluralType = startCase(pluralize(typeDisplayName)),
            global = startCase(globalDisplayName),
            data = viewManagerModel.views.map(v => ({
                ...v,
                group: v.isGlobal ? `${global} ${pluralType}` : `My ${pluralType}`
            }));
        this.gridModel.loadData(data);
        await this.ensureGridHasSelection();
    }

    async saveAsync() {
        return this.doSaveAsync().linkTo(this.saveTask).catchDefault();
    }

    async deleteAsync() {
        return this.doDeleteAsync().linkTo(this.deleteTask).catchDefault();
    }

    //------------------------
    // Implementation
    //------------------------
    private async doSaveAsync() {
        const {
                formModel,
                viewManagerModel,
                manageGlobal,
                selectedId,
                gridModel,
                typeDisplayName,
                globalDisplayName
            } = this,
            {isDirty} = formModel,
            {name, description, isGlobal} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            {token, owner} = gridModel.selectedRecord.data,
            isOwnView = owner === XH.getUsername();

        if (!isValid || !selectedId || !isDirty) return;

        // Additional sanity-check before POSTing an update - non-admins should never be modifying global views.
        throwIf(
            isGlobal && !manageGlobal,
            `Cannot save changes to ${globalDisplayName} ${typeDisplayName} - missing required permission.`
        );

        if (formModel.getField('isGlobal').isDirty) {
            const confirmMsgs = [];
            if (isGlobal) {
                confirmMsgs.push(
                    `This ${typeDisplayName} will become visible to all other ${XH.appName} users.`
                );
            } else if (isOwnView) {
                confirmMsgs.push(
                    `The selected ${typeDisplayName} will revert to being private to you. It will no longer be available to other users.`
                );
            } else {
                confirmMsgs.push(
                    `The selected ${typeDisplayName} will revert to being private to its owner (${owner}).`,
                    `Note that you will no longer have access to this view, meaning you will not be able to undo this change.`
                );
            }

            confirmMsgs.push('Are you sure you want to proceed?');

            const confirmed = await XH.confirm({
                message: fragment(confirmMsgs.map(msg => p(msg))),
                confirmProps: {
                    text: 'Yes, update visibility',
                    outlined: true,
                    autoFocus: false,
                    intent: 'primary'
                }
            });

            if (!confirmed) return;
        }

        await XH.jsonBlobService.updateAsync(token, {
            name,
            description,
            acl: isGlobal ? '*' : null
        });

        await viewManagerModel.refreshAsync();
    }

    private async doDeleteAsync() {
        const {viewManagerModel, gridModel, typeDisplayName, selectedIds, hasMultiSelection} = this,
            count = selectedIds.length;

        // TODO - should be validating this on server in case another user deleted remaining views
        if (viewManagerModel.views.length === count && !viewManagerModel.enableDefault) {
            XH.alert({
                title: 'Cannot delete all views',
                message: `You cannot delete all ${pluralize(typeDisplayName)}.`
            });
            return;
        }

        if (!count) return;

        const confirmStr = hasMultiSelection
                ? pluralize(typeDisplayName, count, true)
                : `"${gridModel.selectedRecord.data.name}"`,
            confirmed = await XH.confirm({
                message: `Are you sure you want to delete ${confirmStr}?`,
                confirmProps: {
                    text: `Yes, delete ${pluralize(typeDisplayName, count)}`,
                    outlined: true,
                    autoFocus: false,
                    intent: 'danger'
                }
            });
        if (!confirmed) return;

        for (const token of selectedIds) {
            viewManagerModel.removeFavorite(token);
            await XH.jsonBlobService.archiveAsync(token);
        }

        await viewManagerModel.refreshAsync();
    }

    private async ensureGridHasSelection() {
        const {gridModel, viewManagerModel} = this,
            {token} = viewManagerModel.view;

        if (!gridModel.hasSelection) {
            await (token ? gridModel.selectAsync(token) : gridModel.preSelectFirstAsync());
        }
    }

    private createGridModel(): GridModel {
        return new GridModel({
            emptyText: `No saved ${pluralize(this.typeDisplayName)} found...`,
            sortBy: 'name',
            groupBy: 'group',
            hideHeaders: true,
            showGroupRowCounts: false,
            selModel: 'multiple',
            contextMenu: null,
            sizingMode: 'standard',
            store: {
                idSpec: 'token',
                fields: [
                    {name: 'token', type: 'string'},
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'isGlobal', type: 'bool'},
                    {name: 'isFavorite', type: 'bool'},
                    {name: 'acl', type: 'json'},
                    {name: 'meta', type: 'json'},
                    {name: 'dateCreated', type: 'date'},
                    {name: 'createdBy', type: 'string'},
                    {name: 'owner', type: 'string'},
                    {name: 'lastUpdatedBy', type: 'string'},
                    {name: 'lastUpdated', type: 'date'}
                ]
            },
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            columns: [
                {field: 'name', flex: true},
                {
                    field: 'isFavorite',
                    omit: !this.enableFavorites,
                    width: 40,
                    align: 'center',
                    headerName: Icon.favorite(),
                    highlightOnChange: true,
                    renderer: v => {
                        return Icon.favorite({
                            prefix: v ? 'fas' : 'fal',
                            className: v ? 'xh-yellow' : 'xh-text-color-muted'
                        });
                    }
                },
                {field: 'group', hidden: true}
            ],
            onCellClicked: ({colDef, data: record}) => {
                if (colDef.colId === 'isFavorite') {
                    this.viewManagerModel.toggleFavorite(record.id);
                }
            }
        });
    }

    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {name: 'name', rules: [required, lengthIs({max: 255})]},
                {name: 'description'},
                {name: 'isGlobal', displayName: 'Global'},
                {name: 'owner', readonly: true},
                {name: 'dateCreated', displayName: 'Created', readonly: true},
                {name: 'lastUpdated', displayName: 'Updated', readonly: true},
                {name: 'lastUpdatedBy', displayName: 'Updated By', readonly: true}
            ]
        });
    }
}
