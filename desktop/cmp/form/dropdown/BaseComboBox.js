/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, computed, action, runInAction} from '@xh/hoist/mobx';
import {debounce} from 'lodash';

import {BaseDropdownInput} from './BaseDropdownInput';

/**
 * Abstract superclass supporting ComboBox and QueryComboBox.
 *
 * This includes debouncing commits due to the multiple ways committing
 * can be triggered from these inputs (blur/enter/item select).
 */
export class BaseComboBox extends BaseDropdownInput {

    @observable pendingCommit;

    constructor(props) {
        super(props);
        // The debounce wait has to be quite long to account for the delayed onItemSelect event.
        // This delay is masked to the user by rendering internalValue while pendingCommit.
        this._debouncedCommit = debounce(this.doCommit, !props.requireSelection ? 200 : 0);
    }

    @computed
    get renderValue() {
        return this.hasFocus || this.pendingCommit ?
            this.internalValue :
            this.toInternal(this.externalValue);
    }

    noteBlurred = () => {
        // Combos that allow custom entries (!requireSelection) will commit those on blur.
        // Note this could be confusing in the case where the user has entered enough text to cause
        // the pop-up suggestion list to narrow down to a single item. It would be reasonable to
        // think that tabbing out would select that value, but instead you get a new, custom value.
        // Suggest we revisit this in the context of a more explicit inline "New" button for these
        // combos that allow for on-the-fly entries, so it's more clear all around.
        if (!this.props.requireSelection) {
            this.doDebouncedCommit();
        }
        runInAction(() => this.hasFocus = false);
    }

    onKeyPress = (ev) => {
        // For Combos that requireSelection, <enter> must/will trigger onItemSelect to commit.
        if (ev.key === 'Enter' && !this.props.requireSelection) {
            this.doDebouncedCommit();
        }
    }

    onItemSelect = (val) => {
        this.noteValueChange(val.value);
        this.doDebouncedCommit();
    }

    doDebouncedCommit() {
        this.setPendingCommit(true);
        this._debouncedCommit();
    }

    doCommit() {
        super.doCommit();
        this.setPendingCommit(false);
    }

    @action
    setPendingCommit(val) {
        this.pendingCommit = val;
    }

    onChange = (string) => {
        this.noteValueChange(string);
    }

}
