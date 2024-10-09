import {FormModel} from '@xh/hoist/cmp/form';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {includes, isEmpty} from 'lodash';
import {ViewManagerModel} from '../ViewManagerModel';

export class ManageDialogModel extends HoistModel {
    parentModel: ViewManagerModel;

    @bindable isOpen: boolean = false;

    @managed readonly gridModel: GridModel;

    @managed readonly formModel: FormModel;

    get selectedId(): string {
        return this.gridModel.selectedId as string;
    }

    get selIsShared(): boolean {
        return this.gridModel.selectedRecord?.data.isShared ?? false;
    }

    get canDelete(): boolean {
        const {parentModel, selIsShared, canManageGlobal} = this,
            {views, enableDefault} = parentModel;
        return (enableDefault ? true : views.length > 1) && (canManageGlobal || !selIsShared);
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

    constructor(parentModel: ViewManagerModel) {
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
                        ...record.data,
                        isFavorite: includes(this.parentModel.favorites, record.data.token)
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
        this.gridModel.clear();
        this.formModel.init();
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
        const {formModel, parentModel, canManageGlobal, selectedId, gridModel} = this,
            {fields, isDirty} = formModel,
            {name, description, isShared, isFavorite} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            displayName = parentModel.entity.displayName,
            token = gridModel.selectedRecord.data.token;

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

        if (fields.isFavorite.isDirty) {
            if (isFavorite) {
                parentModel.addFavorite(token);
            } else {
                parentModel.removeFavorite(token);
            }
        }

        await XH.jsonBlobService.updateAsync(token, {
            name,
            description,
            acl: isShared ? '*' : null
        });

        await this.parentModel.refreshAsync();
        await this.refreshModelsAsync();
    }

    async doDeleteAsync() {
        const {parentModel, gridModel, formModel} = this,
            {selectedRecord} = gridModel,
            {isFavorite} = formModel.getData(),
            {favorites} = parentModel;
        if (!selectedRecord) return;

        const {name, token} = selectedRecord.data;
        const confirmed = await XH.confirm({
            title: 'Delete',
            icon: Icon.delete(),
            message: `Are you sure you want to delete "${name}"?`
        });
        if (!confirmed) return;

        if (formModel.fields.isFavorite.isDirty) {
            if (isFavorite) {
                parentModel.favorites = [...favorites, token];
            } else {
                parentModel.favorites = favorites.filter(it => it !== token);
            }
        }

        await XH.jsonBlobService.archiveAsync(token);
        await parentModel.refreshAsync();
        await this.refreshModelsAsync();
    }

    async refreshModelsAsync() {
        const {views, favorites} = this.parentModel,
            {gridModel, formModel} = this;

        if (isEmpty(views)) {
            this.close();
            return;
        }

        gridModel.loadData(views);
        await this.ensureGridHasSelection();
        formModel.init({
            ...gridModel.selectedRecord.data,
            isFavorite: includes(favorites, gridModel.selectedRecord.data.token)
        });
    }

    async ensureGridHasSelection() {
        const {gridModel} = this;
        const {selectedToken} = this.parentModel;
        if (selectedToken) {
            gridModel.selModel.select(selectedToken);
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
