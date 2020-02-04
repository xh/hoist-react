import {HoistModel} from '@xh/hoist/core';
import {observable, action, bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

@HoistModel
export class PinPadModel {

    /** @member {boolean} */
    @bindable disabled;
    /** @member {string} */
    @bindable errorText;
    /** @member {string} */
    @bindable headerText;
    /** @member {string} */
    @bindable subHeaderText;

    /**
     * @param pinLength - The length of the PIN to get from the user.
     * @param errorText - Text to show formatted as an error.
     * @param headerText - Text to show formatted as a header.
     * @param subHeaderText - Text to show formatted as a subheader.
     */
    constructor({
        pinLength,
        errorText = ' ',
        headerText = ' ',
        subHeaderText = ' '
    }) {
        throwIf(!pinLength, 'PinPad requires pinLength to be specified.');

        this._pinLength = pinLength;
        this.errorText = errorText;
        this.headerText = headerText;
        this.subHeaderText = subHeaderText;

        this._enteredDigits = [];
    }

    /**
     * The completed PIN entered by the user.
     * @returns {string} - null if the user has not finished entering a PIN, otherwise the PIN
     *      the user entered.
     */
    get completedPin() {
        return this._pinComplete ?
            this._enteredDigits.toJS().join('') :
            null;
    }

    /**
     * Clear everything entered by the user, allowing the user to start entering a new PIN.
     */
    @action
    clear() {
        this._enteredDigits.clear();
    }

    //------------------------------------
    // Implementation
    //------------------------------------
    @observable _enteredDigits;
    _deleteWasLast = false;
    _pinLength;

    get _activeIndex() {
        return this._numEntered;
    }

    get _numEntered() {
        return this._enteredDigits.length;
    }

    get _pinComplete() {
        return this._pinLength === this._numEntered;
    }

    @action
    enterDigit(digit) {
        if (this._pinComplete) return;
        this._deleteWasLast = false;
        this._enteredDigits.push(digit);
    }

    @action
    deleteDigit() {
        this._deleteWasLast = true;
        this._enteredDigits.pop();
    }

    get displayedDigits() {
        const {_numEntered, _pinLength, _enteredDigits} = this;

        let res = Array(_pinLength).fill('•');

        const shouldDisplayDigit = !this._pinComplete && !this._deleteWasLast;
        if (shouldDisplayDigit) {
            res[_numEntered - 1] = _enteredDigits[_numEntered - 1];
        }

        res.fill(' ', _numEntered);

        return res;
    }
}