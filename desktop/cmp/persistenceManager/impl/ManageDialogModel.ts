import {FormModel} from '@xh/hoist/cmp/form';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {PersistenceManagerModel} from '../PersistenceManagerModel';

export class ManageDialogModel extends HoistModel {
    parentModel: PersistenceManagerModel;

    @bindable isOpen: boolean = false;

    @managed readonly gridModel: GridModel;

    @managed readonly formModel: FormModel;

    get selectedId(): string {
        return this.gridModel.selectedId as string;
    }

    get selIsShared(): boolean {
        return this.gridModel.selectedRecord?.data.isShared ?? false;
    }

    get userCreated(): boolean {
        return this.gridModel.selectedRecord?.data.createdBy === XH.getUser().username;
    }

    get canDelete(): boolean {
        return this.parentModel.views.length > 1 && (this.canManageGlobal || !this.selIsShared);
    }

    get canEdit(): boolean {
        return this.canManageGlobal || !this.selIsShared;
    }

    get showSaveButton(): boolean {
        const {formModel, parentModel} = this;
        return formModel.isDirty && !formModel.readonly && !parentModel.loadModel.isPending;
    }

    /** True if the selected object would end up shared to all users if saved. */
    get willBeGlobal(): boolean {
        return this.formModel.values.isGlobal;
    }

    get canManageGlobal(): boolean {
        return this.parentModel.canManageGlobal;
    }

    constructor(parentModel: PersistenceManagerModel) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.gridModel = this.createGridModel();
        this.formModel = this.createFormModel();

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: record => {
                if (record) {
                    this.formModel.readonly = !this.canEdit;
                    this.formModel.init({
                        ...record.data
                    });
                }
            }
        });
    }

    async openAsync() {
        this.isOpen = true;
        await this.refreshModelsAsync();
    }

    close() {
        this.isOpen = false;
    }

    async saveAsync() {
        return this.doSaveAsync().linkTo(this.loadModel).catchDefault();
    }

    async deleteAsync() {
        return this.doDeleteAsync().linkTo(this.loadModel).catchDefault();
    }

    //------------------------
    // Implementation
    //------------------------

    async doSaveAsync() {
        const {formModel, parentModel, canManageGlobal, selectedId} = this,
            {fields, isDirty} = formModel,
            {name, description, isShared, isFavorite} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            displayName = parentModel.entity.displayName;

        if (!isValid || !selectedId || !isDirty) return;

        // Additional sanity-check before POSTing an update - non-admins should never be modifying global views.
        if (isShared && !canManageGlobal)
            throw XH.exception(
                `Cannot save changes to globally-shared ${parentModel.entity.displayName} - missing required permission.`
            );

        if (fields.isShared.isDirty) {
            const confirmed = await XH.confirm({
                message: isShared
                    ? `This will share the selected ${displayName} with ALL other users.`
                    : `The selected ${displayName} will no longer be available to all other users.`
            });

            if (!confirmed) return;
        }

        await XH.jsonBlobService.updateAsync(this.gridModel.selectedRecord.data.token, {
            name,
            description,
            acl: isShared ? '*' : null,
            meta: {isFavorite}
        });

        await this.parentModel.refreshAsync();
        await this.refreshModelsAsync();
    }

    async doDeleteAsync() {
        const {selectedRecord} = this.gridModel;
        if (!selectedRecord) return;

        const {name, token} = selectedRecord.data;
        const confirmed = await XH.confirm({
            title: 'Delete',
            icon: Icon.delete(),
            message: `Are you sure you want to delete "${name}"?`
        });
        if (!confirmed) return;

        await XH.jsonBlobService.archiveAsync(token);
        await this.parentModel.refreshAsync();
        await this.refreshModelsAsync();
    }

    async refreshModelsAsync() {
        const {views} = this.parentModel;
        this.gridModel.loadData(views);
        await this.ensureGridHasSelection();
        this.formModel.init({
            ...this.gridModel.selectedRecord.data
        });
    }

    async ensureGridHasSelection() {
        const {gridModel} = this;
        const {selectedView} = this.parentModel;
        if (selectedView) {
            gridModel.selModel.select(selectedView.id);
        } else {
            await gridModel.preSelectFirstAsync();
        }
    }

    createGridModel(): GridModel {
        return new GridModel({
            sortBy: 'name',
            groupBy: 'group',
            stripeRows: false,
            rowBorders: true,
            hideHeaders: true,
            showGroupRowCounts: false,
            store: {
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

    createFormModel(): FormModel {
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
