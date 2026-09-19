/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, computed, bindable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';
import {times} from 'lodash';

/**
 * Configuration for a {@link PinPadModel} - a numeric keypad for collecting a PIN.
 *
 * @see PinPadModel
 */
export interface PinPadConfig {
    /** The length of the PIN to get from the user, default 4. */
    pinLength?: number;
    headerText?: string;
    subHeaderText?: string;
}

/**
 * Model for a PinPad - a numeric keypad prompt for collecting a PIN from the user.
 *
 * Tracks entered digits, validates PIN completion, and provides observable `value` and
 * `isComplete` getters. Supports configurable PIN length and custom header/subheader text.
 *
 * @see PinPad
 */
export class PinPadModel extends HoistModel {
    @bindable accessor disabled: boolean;
    @bindable accessor headerText: string;
    @bindable accessor subHeaderText: string;
    @bindable accessor errorText: string;

    ref = createObservableRef();

    @observable private accessor _enteredDigits: number[];
    private _deleteWasLast = false;
    private _pinLength;

    constructor(config: PinPadConfig = {}) {
        super();
        const {pinLength = 4, headerText = '', subHeaderText = ''} = config;
        this.headerText = headerText;
        this.subHeaderText = subHeaderText;

        this._pinLength = pinLength;
        this._enteredDigits = [];
    }

    //-------------------
    // App Entry points
    //--------------------
    /**
     * The completed PIN entered by the user.  Observe this property to track the state
     * of user progress.
     *
     * @returns null if the user has not finished entering a PIN, otherwise the PIN
     *      the user entered.
     */
    @computed
    get completedPin(): string {
        const {_enteredDigits, _pinLength} = this;
        return _enteredDigits.length === _pinLength ? _enteredDigits.join('') : null;
    }

    /**
     * Clear everything entered by the user, allowing the user to start entering a new PIN.
     */
    @action
    clear() {
        this._enteredDigits = [];
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
        if (this.completedPin) return;
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
        const ret: any[] = times(_pinLength, i => (i < activeIndex ? '•' : ' '));

        // ... and reveal previous, if going forward
        if (activeIndex > 0 && !completedPin && !_deleteWasLast) {
            ret[activeIndex - 1] = _enteredDigits[activeIndex - 1];
        }

        return ret;
    }
}
