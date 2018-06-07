/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {find} from 'lodash';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * BaseComboField
 *
 * Abstract class supporting ComboField, QueryComboField.
 */
export class BaseComboField extends BaseDropdownField {

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
    }

    onItemSelect = (val) => {
        this.noteValueChange(val.value);
        super.doCommit();
    }

    doCommit() {
        if (this.props.requireSelection) {
            this.forceSelectionToOptionOrRevert();
        }
        super.doCommit();
    }

    forceSelectionToOptionOrRevert() {
        const {internalOptions, internalValue} = this;
        if (!internalValue) return;

        const match = find(internalOptions, (it) => {
            return it.label.toLowerCase() == internalValue.toLowerCase();
        });

        if (match) {
            this.noteValueChange(match.value);
            return;
        }

        // Revert if no match
        this.noteValueChange(this.externalValue);
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

}
