import {FormModel} from '@xh/hoist/cmp/form';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {PersistenceManagerModel} from '../PersistenceManagerModel';

export class ManageDialogModel extends HoistModel {
    parentModel: PersistenceManagerModel;

    @observable isOpen: boolean = false;

    @managed readonly gridModel: GridModel;

    @managed readonly formModel: FormModel;

    get noun(): string {
        return this.parentModel.noun;
    }

    get pluralNoun(): string {
        return this.parentModel.pluralNoun;
    }

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
        return this.parentModel.objects.length > 1 && (this.canManageGlobal || !this.selIsShared);
    }

    get canEdit(): boolean {
        return this.canManageGlobal || !this.selIsShared;
    }

    get showSaveButton(): boolean {
        const {formModel} = this;
        return formModel.isDirty && !formModel.readonly && !this.loadModel.isPending;
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

        const {gridModel, formModel} = this;
        this.addReaction({
            track: () => gridModel.selectedRecord,
            run: record => {
                if (record) {
                    formModel.readonly = !this.canEdit;
                    formModel.init({
                        ...record.data
                    });
                }
            }
        });

        wait()
            .then(() => this.loadAsync())
            .then(() => this.ensureGridHasSelection());
    }

    close() {
        this.parentModel.closeManageDialog();
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

    override async doLoadAsync(loadSpec: LoadSpec) {
        await this.parentModel.loadAsync(loadSpec);
        const {objects, selectedObject, views} = this.parentModel;
        this.gridModel.loadData(views);
        const id = selectedObject?.id ?? objects[0].id;
        await this.gridModel.selectAsync(id);
        this.formModel.init({
            ...this.gridModel.selectedRecord.data
        });
    }

    async doSaveAsync() {
        const {formModel, noun, canManageGlobal, selectedId} = this,
            {fields, isDirty} = formModel,
            {name, description, isShared} = formModel.getData(),
            isValid = await formModel.validateAsync();

        if (!isValid || !selectedId || !isDirty) return;

        // Additional sanity-check before POSTing an update - non-admins should never be modifying global views.
        if (isShared && !canManageGlobal)
            throw XH.exception(
                `Cannot save changes to globally-shared ${noun} - missing required permission.`
            );

        if (fields.isShared.isDirty) {
            const confirmed = await XH.confirm({
                message: isShared
                    ? `This will share the selected ${noun} with ALL other users.`
                    : `The selected ${noun} will no longer be available to all other users.`
            });

            if (!confirmed) return;
        }

        await XH.jsonBlobService.updateAsync(this.gridModel.selectedRecord.data.token, {
            name,
            description,
            acl: isShared ? '*' : null
        });

        await this.refreshAsync();
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
        await this.refreshAsync();
    }

    ensureGridHasSelection() {
        const {gridModel} = this;
        if (gridModel.hasSelection) return;

        const {selectedObject} = this.parentModel;
        if (selectedObject) {
            gridModel.selModel.select(selectedObject.id);
        } else {
            gridModel.preSelectFirstAsync();
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
                {name: 'owner', readonly: true},
                {name: 'dateCreated', displayName: 'Created', readonly: true},
                {name: 'lastUpdated', displayName: 'Updated', readonly: true},
                {name: 'lastUpdatedBy', displayName: 'Updated By', readonly: true}
            ]
        });
    }
}
