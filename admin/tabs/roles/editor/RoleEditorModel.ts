import {RoleFormModel} from '@xh/hoist/admin/tabs/roles/editor/form/RoleFormModel';
import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {HoistModel, HoistRole, managed, TaskObserver, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {isEqual, pick} from 'lodash';
import {action, computed, observable} from 'mobx';

export class RoleEditorModel extends HoistModel {
    readonly previewTask = TaskObserver.trackLast({message: 'Loading Preview'});
    readonly savingTask = TaskObserver.trackLast({message: 'Saving Role'});
    @managed readonly roleFormModel = new RoleFormModel();
    @managed readonly currentRoleInspectorModel = new RoleInspectorModel();
    @managed readonly previewRoleInspectorModel = new RoleInspectorModel();

    @observable isOpen = false;
    @observable isPreviewDialogOpen = false;
    @observable role?: HoistRole;
    @observable.ref rolePreviewData: Pick<
        HoistRole,
        'name' | 'users' | 'directoryGroups' | 'roles'
    >;

    private allRoles: HoistRole[] = [];

    private resolve: (role?: HoistRole) => void;

    @computed
    get isRolePreviewDataStale(): boolean {
        return !isEqual(
            this.rolePreviewData,
            pick(this.roleFormModel.getData(), ['name', 'users', 'directoryGroups', 'roles'])
        );
    }

    @computed
    get saveDisabled(): boolean {
        return !this.roleFormModel.isDirty || !this.roleFormModel.isValid;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    loadRoles(roles: HoistRole[]) {
        this.allRoles = roles;
    }

    createAsync(): Promise<HoistRole> {
        return this.editAsync();
    }

    @action
    editAsync(role?: HoistRole): Promise<HoistRole> {
        this.isOpen = true;
        this.role = role;
        this.roleFormModel.init(this.allRoles, role);
        this.currentRoleInspectorModel.role = role;
        return new Promise(resolve => (this.resolve = resolve));
    }

    @action
    async saveAsync(): Promise<void> {
        const isValid = this.roleFormModel.validateAsync();
        if (!isValid) return;

        try {
            const method = this.role ? 'update' : 'create',
                {data} = await XH.fetchService
                    .postJson({
                        body: {data: this.roleFormModel.getData()},
                        url: `rolesAdmin/${method}`
                    })
                    .linkTo(this.savingTask);

            this.resolve(data);
            this.close();
        } catch (e) {
            XH.handleException(e);
        }
    }

    cancel() {
        if (!this.roleFormModel.isDirty) {
            this.close();
        } else {
            XH.confirm({
                icon: Icon.warning(),
                title: 'Discard unsaved changes?',
                message: 'You have unsaved changes. Are you sure you wish to proceed?',
                cancelProps: {
                    text: 'Keep editing'
                },
                confirmProps: {
                    intent: 'danger',
                    text: 'Discard changes'
                },
                onConfirm: () => this.close()
            });
        }
    }

    @action
    async showPreviewAsync() {
        if (!this.isRolePreviewDataStale) {
            this.isPreviewDialogOpen = true;
            return;
        }

        const {previewRoleInspectorModel, roleFormModel} = this,
            isValid = await roleFormModel.validateAsync();
        if (!isValid) return;

        const rolePreviewData = pick(roleFormModel.getData(), [
            'name',
            'users',
            'directoryGroups',
            'roles'
        ]);

        return XH.fetchService
            .postJson({
                body: {data: rolePreviewData},
                url: `rolesAdmin/audition${this.role ? 'Update' : 'Create'}`
            })
            .linkTo(this.previewTask)
            .thenAction(({data}) => {
                previewRoleInspectorModel.role = data;
                this.rolePreviewData = rolePreviewData;
                this.isPreviewDialogOpen = true;
            })
            .catchDefault();
    }

    @action
    hidePreview() {
        this.isPreviewDialogOpen = false;
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    @action
    private close() {
        this.isOpen = false;
    }
}
