/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, bindable, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {times} from 'lodash';

// We import Onsen's FastClick fork to improve performance on touch devices (i.e. tablet).
// Note that this is *only* FastClick, and does not include Onsen components, and thus is
// safe to use with the desktop kit.
import FastClick from '@onsenui/fastclick';

export class PinPadModel extends HoistModel {

    /** @member {boolean} */
    @bindable disabled;
    /** @member {string} */
    @bindable headerText;
    /** @member {string} */
    @bindable subHeaderText;
    /** @member {string} */
    @bindable errorText;

    ref = createObservableRef();

    @observable _enteredDigits;
    _deleteWasLast = false;
    _pinLength;

    /**
     * @param {Object} [c] - configuration object.
     * @param {number} [c.pinLength] - The length of the PIN to get from the user, default 4.
     * @param {string} [c.headerText] - initial text to show formatted as a header.
     * @param {string} [c.subHeaderText] - initial text to show formatted as a subheader.
     */
    constructor({
        pinLength = 4,
        headerText = '',
        subHeaderText = ''
    } = {}) {
        super();
        makeObservable(this);
        this.headerText = headerText;
        this.subHeaderText = subHeaderText;

        this._pinLength = pinLength;
        this._enteredDigits = [];

        this.addReaction({
            track: () => this.ref.current,
            run: (current) => {
                if (current) FastClick.attach(current);
            }
        });
    }

    //-------------------
    // App Entry points
    //--------------------
    /**
     * The completed PIN entered by the user.  Observe this property to track the state
     * of user progress.
     *
     * @returns {string} - null if the user has not finished entering a PIN, otherwise the PIN
     *      the user entered.
     */
    @computed
    get completedPin() {
        const {_enteredDigits, _pinLength} = this;
        return _enteredDigits.length === _pinLength ?
            _enteredDigits.join('') :
            null;
    }

    /**
     * Clear everything entered by the user, allowing the user to start entering a new PIN.
     */
    @action
    clear() {
        this._enteredDigits.clear();
        this._deleteWasLast = false;
    }

    //------------------------
    // Component Entry points
    //------------------------
    get activeIndex() {
        return this._enteredDigits.length;
    }

    @action
    enterDigit(digit) {
        if (this.completePin) return;
        this._deleteWasLast = false;
        this._enteredDigits.push(digit);
    }

    @action
    deleteDigit() {
        this._deleteWasLast = true;
        this._enteredDigits.pop();
    }

    @computed
    get displayedDigits() {
        const {_pinLength, _enteredDigits, _deleteWasLast, completedPin, activeIndex} = this;

        // Show bullet or empty
        const ret = times(_pinLength, i => i < activeIndex ?  '•' : ' ');

        // ... and reveal previous, if going forward
        if (activeIndex > 0 && !completedPin && !_deleteWasLast) {
            ret[activeIndex - 1] = _enteredDigits[activeIndex - 1];
        }

        return ret;
    }
}
