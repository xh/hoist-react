/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {omit} from 'lodash';
import {RoleModel} from '../RoleModel';
import {HoistRole} from '../Types';
import {RoleFormModel} from './form/RoleFormModel';

export class RoleEditorModel extends HoistModel {
    readonly roleModel: RoleModel;
    readonly savingTask = TaskObserver.trackLast({message: 'Saving Role'});
    readonly deletingTask = TaskObserver.trackLast({message: 'Deleting Role'});

    @managed roleFormModel: RoleFormModel;

    @observable isOpen = false;
    @observable role?: HoistRole;

    private resolve: (role?: HoistRole) => void;

    @computed
    get saveDisabled(): boolean {
        return !this.roleFormModel.isDirty || !this.roleFormModel.isValid;
    }

    constructor(roleModel: RoleModel) {
        super();
        makeObservable(this);
        this.roleModel = roleModel;
        this.roleFormModel = new RoleFormModel(roleModel);
    }

    async createAsync(roleSpec?: HoistRole): Promise<HoistRole> {
        return this.openAsync(roleSpec);
    }

    async editAsync(role: HoistRole): Promise<HoistRole> {
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
                        body: this.roleFormModel.getData(),
                        url: `roleAdmin/${method}`
                    })
                    .linkTo(this.savingTask);

            this.resolve(data);
            this.close();
        } catch (e) {
            XH.handleException(e);
        }
    }

    async deleteAsync(): Promise<void> {
        return this.roleModel
            .deleteAsync(this.role)
            .linkTo(this.deletingTask)
            .thenAction(successful => successful && this.close())
            .catchDefault();
    }

    cancel() {
        if (!this.roleFormModel.isDirty) {
            this.doCancel();
        } else {
            XH.confirm({
                message: 'You have unsaved changes. Are you sure you wish to proceed?',
                cancelProps: {
                    text: 'Keep editing'
                },
                confirmProps: {
                    text: 'Discard Changes',
                    intent: 'danger'
                },
                onConfirm: () => this.doCancel()
            });
        }
    }

    // -------------------------------
    // Implementation
    // -------------------------------
    @action
    private openAsync(roleSpec?: HoistRole, editExisting = false): Promise<HoistRole> {
        this.isOpen = true;
        this.role = editExisting ? roleSpec : undefined;
        this.roleFormModel.init(
            this.roleModel.allRoles,
            editExisting ? roleSpec : omit(roleSpec, 'name')
        );
        return new Promise(resolve => (this.resolve = resolve));
    }

    private doCancel() {
        this.resolve();
        this.close();
    }

    @action
    private close() {
        this.isOpen = false;
    }
}
