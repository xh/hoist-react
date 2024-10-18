import {FormModel} from '@xh/hoist/cmp/form';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, lookup, managed, TaskObserver, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {includes} from 'lodash';
import {ViewManagerModel} from '../ViewManagerModel';

export class ManageDialogModel extends HoistModel {
    @managed readonly gridModel: GridModel;
    @managed readonly formModel: FormModel;

    readonly saveTask = TaskObserver.trackLast();
    readonly deleteTask = TaskObserver.trackLast();

    @lookup(() => ViewManagerModel)
    private readonly viewManagerModel: ViewManagerModel;

    get selectedId(): string {
        return this.gridModel.selectedId as string;
    }

    get selIsShared(): boolean {
        return this.gridModel.selectedRecord?.data.isShared ?? false;
    }

    get displayName(): string {
        return this.viewManagerModel.entity.displayName;
    }

    get canDelete(): boolean {
        const {viewManagerModel, selIsShared, canManageGlobal} = this,
            {views, enableDefault} = viewManagerModel;
        return (enableDefault ? true : views.length > 1) && (canManageGlobal || !selIsShared);
    }

    get canEdit(): boolean {
        return this.canManageGlobal || !this.selIsShared;
    }

    get showSaveButton(): boolean {
        const {formModel, viewManagerModel} = this;
        return formModel.isDirty && !formModel.readonly && !viewManagerModel.loadModel.isPending;
    }

    get canManageGlobal(): boolean {
        return this.viewManagerModel.canManageGlobal;
    }

    constructor(parentModel: ViewManagerModel) {
        super();
        makeObservable(this);

        this.viewManagerModel = parentModel;
        this.gridModel = this.createGridModel();
        this.formModel = this.createFormModel();

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: record => {
                if (record) {
                    this.formModel.readonly = !this.canEdit;
                    this.formModel.init({
                        ...record.data,
                        isFavorite: includes(this.viewManagerModel.favorites, record.data.token)
                    });
                }
            }
        });
    }

    override async doLoadAsync() {
        this.gridModel.loadData(this.viewManagerModel.views);
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

    async doSaveAsync() {
        const {formModel, viewManagerModel, canManageGlobal, selectedId, gridModel} = this,
            {fields, isDirty} = formModel,
            {name, description, isShared, isFavorite} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            displayName = viewManagerModel.entity.displayName,
            token = gridModel.selectedRecord.data.token;

        if (!isValid || !selectedId || !isDirty) return;

        // Additional sanity-check before POSTing an update - non-admins should never be modifying global views.
        if (isShared && !canManageGlobal)
            throw XH.exception(
                `Cannot save changes to globally-shared ${viewManagerModel.entity.displayName} - missing required permission.`
            );

        if (fields.isShared.isDirty) {
            const confirmed = await XH.confirm({
                message: isShared
                    ? `This will share the selected ${displayName} with ALL other users.`
                    : `The selected ${displayName} will no longer be available to all other users.`
            });

            if (!confirmed) return;
        }

        if (fields.isFavorite.isDirty) {
            if (isFavorite) {
                viewManagerModel.addFavorite(token);
            } else {
                viewManagerModel.removeFavorite(token);
            }
        }

        await XH.jsonBlobService.updateAsync(token, {
            name,
            description,
            acl: isShared ? '*' : null
        });

        await this.viewManagerModel.refreshAsync();
        await this.refreshAsync();
    }

    async doDeleteAsync() {
        const {viewManagerModel, gridModel} = this,
            {selectedRecord} = gridModel;
        if (!selectedRecord) return;

        const {name, token} = selectedRecord.data,
            confirmed = await XH.confirm({
                title: 'Delete',
                icon: Icon.delete(),
                message: `Are you sure you want to delete "${name}"?`
            });
        if (!confirmed) return;

        viewManagerModel.removeFavorite(token);

        await XH.jsonBlobService.archiveAsync(token);
        await viewManagerModel.refreshAsync();
        await this.refreshAsync();
    }

    //-------------------------
    // Implementation
    //-------------------------

    private async ensureGridHasSelection() {
        const {gridModel, viewManagerModel} = this,
            {selectedToken} = viewManagerModel;
        if (selectedToken) {
            gridModel.selModel.select(selectedToken);
        } else {
            await gridModel.preSelectFirstAsync();
        }
    }

    private createGridModel(): GridModel {
        return new GridModel({
            sortBy: 'name',
            groupBy: 'group',
            stripeRows: false,
            rowBorders: true,
            hideHeaders: true,
            showGroupRowCounts: false,
            store: {
                idSpec: 'token',
                fields: [
                    {name: 'token', type: 'string'},
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'isShared', type: 'bool'},
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
                {
                    field: 'isShared',
                    width: 40,
                    align: 'center',
                    headerName: Icon.globe(),
                    renderer: v => (v ? Icon.globe() : null),
                    tooltip: v => (v ? 'Shared with all users.' : '')
                },
                {field: 'name', flex: true},
                {field: 'group', hidden: true}
            ]
        });
    }

    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {name: 'name', rules: [required, lengthIs({max: 255})]},
                {name: 'description'},
                {name: 'isShared', displayName: 'Shared'},
                {name: 'isFavorite', displayName: 'Favorite'},
                {name: 'owner', readonly: true},
                {name: 'dateCreated', displayName: 'Created', readonly: true},
                {name: 'lastUpdated', displayName: 'Updated', readonly: true},
                {name: 'lastUpdatedBy', displayName: 'Updated By', readonly: true}
            ]
        });
    }
}
