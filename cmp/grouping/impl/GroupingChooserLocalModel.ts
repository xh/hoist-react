/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */

import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {HoistModel} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {compact, difference, isEmpty, isEqual, sortBy} from 'lodash';

/**
 * @internal
 */
export class GroupingChooserLocalModel extends HoistModel {
    readonly parentModel: GroupingChooserModel;

    @observable.ref pendingValue: string[] = [];
    @observable editorIsOpen: boolean = false;
    @observable favoritesIsOpen: boolean = false;

    popoverRef = createObservableRef<HTMLElement>();

    constructor(parentModel: GroupingChooserModel) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;

        this.addReaction({
            track: () => this.pendingValue,
            run: () => {
                if (parentModel.commitOnChange) parentModel.setValue(this.pendingValue);
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

    buildDimOptions(dims: string[]) {
        const ret = compact(dims).map(dimName => {
            return {value: dimName, label: this.parentModel.getDimDisplayName(dimName)};
        });
        return sortBy(ret, 'label');
    }

    @action
    toggleEditor() {
        this.pendingValue = this.parentModel.value;
        this.editorIsOpen = !this.editorIsOpen;
        this.favoritesIsOpen = false;
    }

    @action
    toggleFavoritesMenu() {
        this.favoritesIsOpen = !this.favoritesIsOpen;
        this.editorIsOpen = false;
    }

    @action
    closePopover() {
        this.editorIsOpen = false;
        this.favoritesIsOpen = false;
    }

    //-------------------------
    // Value handling
    //-------------------------

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
        const {pendingValue, parentModel} = this,
            {value} = parentModel;

        if (!isEqual(value, pendingValue) && parentModel.validateValue(pendingValue)) {
            parentModel.setValue(pendingValue);
        }

        this.closePopover();
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
