import {RoleFormModel} from '@xh/hoist/admin/tabs/roles/editor/form/RoleFormModel';
import {RoleInspectorModel} from '@xh/hoist/admin/tabs/roles/inspector/RoleInspectorModel';
import {div, fragment, h4, li, ul} from '@xh/hoist/cmp/layout';
import {HoistModel, HoistRole, managed, TaskObserver, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {compact, isEmpty, isEqual, pick} from 'lodash';
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
        'name' | 'users' | 'directoryGroups' | 'inherits'
    >;

    private allRoles: HoistRole[] = [];

    private resolve: (role?: HoistRole) => void;

    @computed
    get isRolePreviewDataStale(): boolean {
        return !isEqual(
            this.rolePreviewData,
            pick(this.roleFormModel.getData(), ['name', 'users', 'directoryGroups', 'inherits'])
        );
    }

    @computed
    get isRolePreviewVisible(): boolean {
        return !this.role || this.roleFormModel.isSubstantiallyDirty;
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
            const roleData = this.roleFormModel.getData(),
                shouldContinue = !this.role || (await this.confirmUpdateImpactAsync(roleData));

            if (!shouldContinue) return;

            const method = this.role ? 'update' : 'create',
                {data} = await XH.fetchService
                    .postJson({
                        body: {data: roleData},
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
        if (!this.isRolePreviewVisible || !this.isRolePreviewDataStale) {
            this.isPreviewDialogOpen = true;
            return;
        }

        const {currentRoleInspectorModel, previewRoleInspectorModel, roleFormModel, role} = this,
            isValid = await roleFormModel.validateAsync();
        if (!isValid) return;

        const rolePreviewData = pick(roleFormModel.getData(), [
            'name',
            'users',
            'directoryGroups',
            'inherits'
        ]);

        return XH.fetchService
            .postJson({
                body: {data: rolePreviewData},
                url: `rolesAdmin/audition${this.role ? 'Update' : 'Create'}`
            })
            .linkTo(this.previewTask)
            .thenAction(({data}) => {
                const showAllTabs = !role || !roleFormModel.isSubstantiallyDirty;
                previewRoleInspectorModel.role = data;
                [currentRoleInspectorModel, previewRoleInspectorModel].forEach(inspector => {
                    inspector.setTabs({
                        inheritanceGraph: showAllTabs || roleFormModel.hasDirtyInherits,
                        members: showAllTabs || roleFormModel.hasDirtyAssignments
                    });
                });

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

    private async confirmUpdateImpactAsync(roleData: HoistRole): Promise<boolean> {
        const {
            addedRoles,
            removedRoles,
            impactedUserCount: userCount,
            impactedDirectoryGroupCount: groupCount
        } = await XH.fetchService
            .postJson({
                body: {data: roleData},
                url: `rolesAdmin/updateImpact`
            })
            .linkTo(this.savingTask);

        if (userCount + groupCount && !isEmpty([...addedRoles, ...removedRoles])) {
            return XH.confirm({
                title: 'Confirm changes?',
                message: div(
                    'The following changes will impact ' +
                        compact([
                            userCount && pluralize('user', userCount, true),
                            groupCount && pluralize('group', groupCount, true)
                        ]).join(' and ') +
                        '. Are you sure you wish to save?',
                    fragment({
                        omit: isEmpty(addedRoles),
                        items: [h4('Added Roles'), ul(addedRoles.map(it => li(it)))]
                    }),
                    fragment({
                        omit: isEmpty(removedRoles),
                        items: [h4('Removed Roles'), ul(removedRoles.map(it => li(it)))]
                    })
                ),
                confirmProps: {text: 'Save'}
            });
        } else {
            return true;
        }
    }

    @action
    private close() {
        this.isOpen = false;
    }
}
