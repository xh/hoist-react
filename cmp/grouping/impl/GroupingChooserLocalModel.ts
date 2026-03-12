/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel, lookup, SelectOption} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {compact, difference, isEmpty, isEqual, sortBy} from 'lodash';
import {GroupingChooserModel} from '../GroupingChooserModel';

/**
 * Local model for GroupingChooser components. Holds transient UI state that must be
 * per-component-instance, even when multiple GroupingChooser components share the same
 * GroupingChooserModel.
 *
 * @internal
 */
export class GroupingChooserLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(GroupingChooserModel)
    parentModel: GroupingChooserModel;

    @observable.ref pendingValue: string[] = [];
    @observable editorIsOpen: boolean = false;

    /** Used by desktop for DnD transform correction. */
    popoverRef = createObservableRef<HTMLElement>();

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.pendingValue,
            run: () => {
                if (this.parentModel.commitOnChange) {
                    this.parentModel.setValue(this.pendingValue);
                }
            }
        });
    }

    @computed
    get availableDims(): string[] {
        return difference(this.parentModel.dimensionNames, this.pendingValue);
    }

    @computed
    get isValid(): boolean {
        return this.parentModel.validateValue(this.pendingValue);
    }

    @computed
    get isAddEnabled(): boolean {
        const {pendingValue, availableDims} = this,
            {maxDepth, dimensionNames} = this.parentModel,
            limit =
                maxDepth > 0 ? Math.min(maxDepth, dimensionNames.length) : dimensionNames.length,
            atMaxDepth = pendingValue.length === limit;
        return !atMaxDepth && !isEmpty(availableDims);
    }

    @computed
    get isAddFavoriteEnabled(): boolean {
        return (
            this.parentModel.persistFavorites &&
            !isEmpty(this.pendingValue) &&
            !this.parentModel.isFavorite(this.pendingValue)
        );
    }

    /** Transform dimension names into SelectOptions, with displayName and optional sort. */
    getDimSelectOpts(dims: string[] = this.availableDims): SelectOption[] {
        const {parentModel} = this,
            ret = compact(dims).map(dimName => ({
                value: dimName,
                label: parentModel.getDimDisplayName(dimName)
            }));
        return parentModel.sortDimensions ? sortBy(ret, 'label') : ret;
    }

    //-------------------------
    // Editor state
    //-------------------------
    @action
    toggleEditor() {
        this.pendingValue = this.parentModel.value;
        this.editorIsOpen = !this.editorIsOpen;
    }

    @action
    closeEditor() {
        this.editorIsOpen = false;
    }

    //-------------------------
    // Value handling
    //-------------------------

    @action
    setPendingValue(value: string[]) {
        this.pendingValue = value;
    }

    @action
    addPendingDim(dimName: string) {
        if (!dimName) return;
        this.pendingValue = [...this.pendingValue, dimName];
    }

    @action
    replacePendingDimAtIdx(dimName: string, idx: number) {
        if (!dimName) return this.removePendingDimAtIdx(idx);
        const pendingValue = [...this.pendingValue];
        pendingValue[idx] = dimName;
        this.pendingValue = pendingValue;
    }

    @action
    removePendingDimAtIdx(idx: number) {
        const pendingValue = [...this.pendingValue];
        pendingValue.splice(idx, 1);
        this.pendingValue = pendingValue;
    }

    @action
    movePendingDimToIndex(dimName: string, toIdx: number) {
        const pendingValue = [...this.pendingValue],
            dim = pendingValue.find(it => it === dimName),
            fromIdx = pendingValue.indexOf(dim);

        pendingValue.splice(toIdx, 0, pendingValue.splice(fromIdx, 1)[0]);
        this.pendingValue = pendingValue;
    }

    @action
    commitPendingValueAndClose() {
        const {pendingValue} = this,
            {value} = this.parentModel;
        if (!isEqual(value, pendingValue) && this.parentModel.validateValue(pendingValue)) {
            this.parentModel.setValue(pendingValue);
        }
        this.closeEditor();
    }

    @action
    addPendingAsFavorite() {
        this.parentModel.addFavorite(this.pendingValue);
    }

    //--------------------
    // Drag Drop
    //--------------------
    onDragEnd(result) {
        const {draggableId, destination} = result;
        if (!destination) return;
        this.movePendingDimToIndex(draggableId, destination.index);
    }
}
