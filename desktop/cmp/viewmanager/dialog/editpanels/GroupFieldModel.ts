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
    getGroupLeaf,
    splitGroupPath,
    VIEW_GROUP_DELIMITER,
    ViewManagerModel
} from '@xh/hoist/cmp/viewmanager';
import {HoistModel} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize} from 'lodash';
import {
    GroupPathOption,
    NEW_GROUP_VALUE,
    normalizeGroupValue,
    TOP_LEVEL_GROUP_VALUE
} from '../Utils';

export interface GroupFieldModelConfig {
    /** Owning form - must contain a `group` field and {@link newGroupNameField}. */
    formModel: FormModel;
    viewManagerModel: ViewManagerModel;
}

/**
 * Spec for the transient field holding the name of a group being created within a
 * {@link groupField} - include in the fields of any form hosting one. The name is composed onto
 * its parent path and written to the form's `group` field as the user types, so this field's own
 * value is never saved. Its one rule blocks a save that would silently create nesting.
 */
export function newGroupNameField() {
    return {
        name: 'newGroupName',
        displayName: 'Group',
        rules: [
            ({value}) =>
                value?.includes(VIEW_GROUP_DELIMITER)
                    ? `Group names can't contain "${VIEW_GROUP_DELIMITER}".`
                    : null
        ]
    };
}

/**
 * Backing model for the shared {@link groupField} - a single searchable select over all existing
 * group paths, with a persistent option that swaps the control in place into a name input for
 * creating a new group beneath the selected one.
 */
export class GroupFieldModel extends HoistModel {
    readonly formModel: FormModel;
    readonly viewManagerModel: ViewManagerModel;

    /** Which face of the control is showing. */
    @observable mode: 'select' | 'create' = 'select';

    /** Parent path for a group being created - frozen on entering create mode, null for top level. */
    @observable parentPath: string = null;

    /** Raw `group` value selected when create mode was entered, restored on cancel. */
    private priorValue: string = null;

    /**
     * Latest typeahead query on the select, seeding the name input when a fruitless search is
     * followed into the create option. Captured from the select's filter callback.
     */
    private query: string = null;

    get value(): string {
        return this.formModel.values.group;
    }

    get newName(): string {
        return (this.formModel.values.newGroupName ?? '').trim();
    }

    /** Views whose groups are selectable - namespaced separately for global vs. owned views. */
    @computed
    get isGlobal(): boolean {
        return this.formModel.values.visibility === 'global';
    }

    @computed
    get existingPaths(): string[] {
        const {viewManagerModel: vmm, isGlobal} = this;
        return getAllGroupPaths(isGlobal ? vmm.globalViews : vmm.ownedViews);
    }

    /** Every existing group path, `Top Level` pinned first and the create option pinned last. */
    @computed
    get options(): GroupPathOption[] {
        return [
            {value: TOP_LEVEL_GROUP_VALUE, label: 'Top Level'},
            ...this.existingPaths.map(path => ({value: path, label: path})),
            {value: NEW_GROUP_VALUE, label: this.newGroupOptionLabel}
        ];
    }

    /** Path a group being created will be saved to - live as the user types. */
    @computed
    get composedPath(): string {
        return composeGroupPath(this.parentPath, this.newName);
    }

    /** Non-blocking notice that the composed path is an existing group, which it will merge into. */
    @computed
    get newNameWarning(): string {
        const {newName, composedPath, existingPaths, viewManagerModel} = this;
        // Nothing typed yet composes to the parent path, which exists by definition - wait for a
        // name before claiming a collision.
        if (!newName || !existingPaths.includes(composedPath)) return null;
        return `That group already exists. ${capitalize(pluralize(viewManagerModel.typeDisplayName))} will be added to it.`;
    }

    /** An empty field is the top level - the one unambiguous alternative to a named group. */
    get placeholder(): string {
        return 'Top Level';
    }

    constructor({formModel, viewManagerModel}: GroupFieldModelConfig) {
        super();
        makeObservable(this);
        this.formModel = formModel;
        this.viewManagerModel = viewManagerModel;

        // Compose the typed name onto its parent and write it straight to the bound `group` field,
        // so what the form will save is never a step behind what the control shows. An empty name
        // holds the value selected on entering create mode rather than composing to the bare
        // parent - stepping into create mode is not itself an edit, while a group picked before
        // doing so remains a pending move in its own right.
        this.addReaction({
            track: () => [this.mode, this.newName],
            run: () => {
                if (this.mode !== 'create') return;
                const {newName, composedPath, priorValue} = this;
                this.formModel.fields.group.setValue(newName ? composedPath : priorValue);
            }
        });
    }

    /** Init the bound `group` field, returning the control to its select face. */
    @action
    init(group: string) {
        this.exitCreate();
        this.formModel.fields.group.init(normalizeGroupValue(group) ?? TOP_LEVEL_GROUP_VALUE);
        this.formModel.fields.newGroupName.init(null);
    }

    /** Record the select's live typeahead query - see {@link query}. */
    noteQuery(query: string) {
        this.query = query;
    }

    /**
     * Handle a commit from the select. The create option is a command rather than a value, so it
     * enters create mode and rolls its own selection back, leaving `priorValue` as the parent.
     */
    @action
    onSelectCommit(value: string, priorValue: string) {
        value === NEW_GROUP_VALUE ? this.startCreate(priorValue) : (this.query = null);
    }

    /**
     * Swap to the create face, naming a new group under `parent` - the value selected immediately
     * before the create option was picked. Any query typed in the select carries over as the new
     * group's name, so a search that found nothing does not have to be typed a second time.
     */
    @action
    startCreate(parent: string) {
        this.priorValue = parent;
        this.parentPath = normalizeGroupValue(parent);
        this.formModel.fields.group.setValue(parent);
        this.formModel.fields.newGroupName.setValue(getGroupLeaf(this.query) || null);
        this.query = null;
        this.mode = 'create';
    }

    /** Discard the in-progress name, restoring the value held before create mode was entered. */
    @action
    cancelCreate() {
        this.formModel.fields.group.setValue(this.priorValue);
        this.exitCreate();
    }

    /** Return to the select face - paired with a reset of the owning form. */
    @action
    reset() {
        this.exitCreate();
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    private exitCreate() {
        this.mode = 'select';
        this.parentPath = null;
        this.query = null;
        this.formModel.fields.newGroupName.setValue(null);
    }

    /** Label for the persistent create option, naming the group the new one will nest under. */
    private get newGroupOptionLabel(): string {
        const path = normalizeGroupValue(this.value);
        return path
            ? `New group under ${splitGroupPath(path).join(' › ')}…`
            : 'New top-level group…';
    }
}
