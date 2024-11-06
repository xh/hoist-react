import {FormModel} from '@xh/hoist/cmp/form';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {HoistModel, lookup, managed, TaskObserver, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {intersperse, pluralize, throwIf} from '@xh/hoist/utils/js';
import {ViewManagerModel} from '../ViewManagerModel';

export class ManageDialogModel extends HoistModel {
    @managed gridModel: GridModel;
    @managed formModel: FormModel;

    readonly saveTask = TaskObserver.trackLast();
    readonly deleteTask = TaskObserver.trackLast();

    @lookup(() => ViewManagerModel)
    private readonly viewManagerModel: ViewManagerModel;

    get selectedId(): string {
        return this.gridModel.selectedId as string;
    }

    get selectedIds(): string[] {
        return this.gridModel.selectedIds as string[];
    }

    get hasMultiSelection(): boolean {
        return this.selectedIds.length > 1;
    }

    get selIsShared(): boolean {
        return this.gridModel.selectedRecords.some(rec => rec.data.isShared);
    }

    get displayName(): string {
        return this.viewManagerModel.entity.displayName.toLowerCase(); // usages here all look better in lowercase
    }

    get canDelete(): boolean {
        const {viewManagerModel, selIsShared, enableSharing, selectedIds} = this,
            {views, enableDefault} = viewManagerModel;

        // Can't delete shared views without manager role.
        if (selIsShared && !enableSharing) return false;

        // Can't delete all the views, unless default mode is enabled.
        return enableDefault || views.length - selectedIds.length > 0;
    }

    get canEdit(): boolean {
        return this.enableSharing || !this.selIsShared;
    }

    get enableSharing(): boolean {
        return this.viewManagerModel.enableSharing;
    }

    get showSaveButton(): boolean {
        const {formModel, viewManagerModel} = this;
        return formModel.isDirty && !formModel.readonly && !viewManagerModel.loadModel.isPending;
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
    private async doSaveAsync() {
        const {formModel, viewManagerModel, enableSharing, selectedId, gridModel, displayName} =
                this,
            {isDirty} = formModel,
            {name, description, isShared} = formModel.getData(),
            isValid = await formModel.validateAsync(),
            {token, owner} = gridModel.selectedRecord.data,
            isOwnView = owner === XH.getUsername();

        if (!isValid || !selectedId || !isDirty) return;

        // Additional sanity-check before POSTing an update - non-admins should never be modifying global views.
        throwIf(
            isShared && !enableSharing,
            `Cannot save changes to shared ${viewManagerModel.entity.displayName} - missing required permission.`
        );

        if (formModel.getField('isShared').isDirty) {
            const confirmMsgs = [];
            if (isShared) {
                confirmMsgs.push(
                    `This ${displayName} will become visible to all other ${XH.appName} users.`
                );
            } else if (isOwnView) {
                confirmMsgs.push(
                    `The selected ${displayName} will revert to being private to you. It will no longer be available to other users.`
                );
            } else {
                confirmMsgs.push(
                    `The selected ${displayName} will revert to being private to its owner (${owner}).`,
                    `Note that you will no longer have access to this view, meaning you will not be able to undo this change.`
                );
            }

            confirmMsgs.push('Are you sure you want to proceed?');

            const confirmed = await XH.confirm({
                message: intersperse(confirmMsgs, fragment(br(), br())),
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
            acl: isShared ? '*' : null
        });

        await this.viewManagerModel.refreshAsync();
    }

    private async doDeleteAsync() {
        const {viewManagerModel, gridModel, displayName, selectedIds, hasMultiSelection} = this,
            count = selectedIds.length;
        if (!count) return;

        const confirmStr = hasMultiSelection
                ? pluralize(displayName, count, true)
                : `"${gridModel.selectedRecord.data.name}"`,
            confirmed = await XH.confirm({
                message: `Are you sure you want to delete ${confirmStr}?`,
                confirmProps: {
                    text: `Yes, delete ${pluralize(displayName, count)}`,
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
        await this.refreshAsync();
    }

    private async ensureGridHasSelection() {
        const {gridModel, viewManagerModel} = this,
            {selectedToken} = viewManagerModel;

        if (!gridModel.hasSelection) {
            selectedToken
                ? await gridModel.selectAsync(selectedToken)
                : await gridModel.preSelectFirstAsync();
        }
    }

    private createGridModel(): GridModel {
        return new GridModel({
            emptyText: `No saved ${pluralize(this.displayName)} found...`,
            sortBy: 'name',
            groupBy: 'group',
            hideHeaders: true,
            showGroupRowCounts: false,
            selModel: 'multiple',
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
                {name: 'isShared', displayName: 'Shared'},
                {name: 'owner', readonly: true},
                {name: 'dateCreated', displayName: 'Created', readonly: true},
                {name: 'lastUpdated', displayName: 'Updated', readonly: true},
                {name: 'lastUpdatedBy', displayName: 'Updated By', readonly: true}
            ]
        });
    }
}
