import {RoleFormModel} from '@xh/hoist/admin/tabs/roles/editor/form/RoleFormModel';
import {HoistModel, HoistRole, managed, TaskObserver, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {omit} from 'lodash';
import {action, computed, observable} from 'mobx';

export class RoleEditorModel extends HoistModel {
    readonly savingTask = TaskObserver.trackLast({message: 'Saving Role'});
    @managed readonly roleFormModel = new RoleFormModel();

    @observable isOpen = false;
    @observable role?: HoistRole;

    private allRoles: HoistRole[] = [];
    private resolve: (role?: HoistRole) => void;

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

    createAsync(roleSpec?: HoistRole): Promise<HoistRole> {
        return this.openAsync(roleSpec);
    }

    editAsync(role: HoistRole): Promise<HoistRole> {
        return this.openAsync(role, true);
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

    // -------------------------------
    // Implementation
    // -------------------------------

    @action
    openAsync(roleSpec?: HoistRole, editExisting = false): Promise<HoistRole> {
        this.isOpen = true;
        this.role = editExisting ? roleSpec : undefined;
        this.roleFormModel.init(this.allRoles, editExisting ? roleSpec : omit(roleSpec, 'name'));
        return new Promise(resolve => (this.resolve = resolve));
    }

    @action
    private close() {
        this.isOpen = false;
    }
}
