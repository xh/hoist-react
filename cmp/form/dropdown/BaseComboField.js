/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter, computed} from '@xh/hoist/mobx';
import {debounce} from 'lodash';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * BaseComboField
 *
 * Abstract class supporting ComboField, QueryComboField.
 */
export class BaseComboField extends BaseDropdownField {

    @observable @setter pendingCommit;

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

    onBlur = () => {
        if (!this.props.requireSelection) {
            this.doDebouncedCommit();
        }
        this.setHasFocus(false);
    }

    onKeyPress = (ev) => {
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

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

}
