/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isObject, find} from 'lodash';
import {menuItem} from 'hoist/kit/blueprint';

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

    doCommit() {
        if (this.props.requireSelection) {
            this.forceSelectionToOptionOrRevert();
        }
        super.doCommit();
    }

    forceSelectionToOptionOrRevert() {
        const {options, internalValue} = this;

        // 0) We have a match, nothing to be done
        if (find(options, {label: internalValue})) {
            return;
        }

        // 1) Close enough, just adjust casing
        const match = find(options, (it) => it.label.toLowerCase() == internalValue.toLowerCase());
        if (match) {
            this.noteValueChange(match.value);
            return;
        }

        // 2) Otherwise, revert
        this.noteValueChange(this.externalValue);
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

}
