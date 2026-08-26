/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormModel} from '@xh/hoist/cmp/form';
import {
    composeGroupPath,
    getAllGroupPaths,
    normalizeGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {GroupPathOption, normalizeGroupValue, TOP_LEVEL_GROUP_VALUE} from '../Utils';

export interface GroupFieldModelConfig {
    /** Owning form - must contain a `group` field. */
    formModel: FormModel;
    viewManagerModel: ViewManagerModel;
}

/** Delimiters accepted in a typed group name alongside `VIEW_GROUP_DELIMITER`. */
const ALT_DELIMITERS = /[›>]/g;

/** Backing model for the shared {@link groupField}. */
export class GroupFieldModel extends HoistModel {
    readonly formModel: FormModel;
    readonly viewManagerModel: ViewManagerModel;

    @observable isCreateOpen: boolean = false;

    /** Parent for the group being created - frozen when the popover opens. */
    @observable parentPath: string = null;

    /** Name typed into the popover - may itself be a path, creating multiple levels at once. */
    @bindable newGroupName: string = null;

    /** Group created here but not yet saved - offered in the select alongside existing groups. */
    @observable pendingPath: string = null;

    get value(): string {
        return this.formModel.values.group;
    }

    @computed
    get isGlobal(): boolean {
        return this.formModel.values.visibility === 'global';
    }

    /** Groups available to select - namespaced separately for global vs. owned views. */
    @computed
    get existingPaths(): string[] {
        const {viewManagerModel: vmm, isGlobal} = this;
        return getAllGroupPaths(isGlobal ? vmm.globalViews : vmm.ownedViews);
    }

    /** Every selectable group path, `Top Level` pinned first and any pending group merged in. */
    @computed
    get options(): GroupPathOption[] {
        const {existingPaths, pendingPath} = this,
            paths = [...existingPaths];

        if (pendingPath && !paths.includes(pendingPath)) {
            paths.push(pendingPath);
            paths.sort((a, b) => a.localeCompare(b));
        }

        return [
            {value: TOP_LEVEL_GROUP_VALUE, label: 'Top Level'},
            ...paths.map(path => ({value: path, label: path}))
        ];
    }

    /** Path the typed name will create, composed onto the parent. */
    @computed
    get composedPath(): string {
        const typed = normalizeGroupPath(
            (this.newGroupName ?? '').replace(ALT_DELIMITERS, VIEW_GROUP_DELIMITER)
        );
        return typed ? composeGroupPath(this.parentPath, typed) : null;
    }

    constructor({formModel, viewManagerModel}: GroupFieldModelConfig) {
        super();
        makeObservable(this);
        this.formModel = formModel;
        this.viewManagerModel = viewManagerModel;
    }

    /** Init the bound `group` field, discarding any group created but not saved. */
    @action
    init(group: string) {
        this.cancelCreate();
        this.pendingPath = null;
        this.formModel.fields.group.init(normalizeGroupValue(group) ?? TOP_LEVEL_GROUP_VALUE);
    }

    /** Show the new-group popover, naming a group under the currently selected group. */
    @action
    openCreate() {
        this.parentPath = normalizeGroupValue(this.value);
        this.newGroupName = null;
        this.isCreateOpen = true;
    }

    /** Close the popover, selecting any group named within it. */
    @action
    closeCreate() {
        const {composedPath} = this;
        if (composedPath) {
            this.pendingPath = composedPath;
            this.formModel.fields.group.setValue(composedPath);
        }
        this.cancelCreate();
    }

    /** Close the popover, discarding any name typed within it. */
    @action
    cancelCreate() {
        this.isCreateOpen = false;
        this.parentPath = null;
        this.newGroupName = null;
    }

    /** Discard any group created but not saved - paired with a reset of the owning form. */
    @action
    reset() {
        this.cancelCreate();
        this.pendingPath = null;
    }
}
