import {HoistModel} from '@xh/hoist/core';
import {observable, action, bindable} from '@xh/hoist/mobx';

@HoistModel
export class PinPadModel {

    @bindable disabled;
    @bindable errorText;
    @bindable headerText;
    @bindable subHeaderText;

    constructor({
        pinLength,
        errorText = ' ',
        headerText = ' ',
        subHeaderText = ' '
    }) {
        this._pinLength = pinLength;
        this.errorText = errorText;
        this.headerText = headerText;
        this.subHeaderText = subHeaderText;

        this._enteredDigits = [];
    }

    get completedPin() {
        return this.pinComplete ?
            this._enteredDigits.toJS().join('') :
            null;
    }

    @action
    enterDigit(digit) {
        if (this.pinComplete) return;
        this._deleteWasLast = false;
        this._enteredDigits.push(digit);
    }

    @action
    deleteDigit() {
        this._deleteWasLast = true;
        this._enteredDigits.pop();
    }

    @action
    clear() {
        this._enteredDigits.clear();
    }

    get displayedDigits() {
        const {numEntered, _pinLength, _enteredDigits} = this;

        let res = Array(_pinLength).fill('•');

        const shouldDisplayDigit = !this.pinComplete && !this._deleteWasLast;
        if (shouldDisplayDigit) {
            res[numEntered - 1] = _enteredDigits[numEntered - 1];
        }

        for (let i = numEntered; i < _pinLength; i++) {
            res[i] = ' ';
        }

        return res;
    }

    //------------------------------------
    // Implementation
    //------------------------------------
    @observable _enteredDigits;
    _deleteWasLast = false;
    _pinLength;

    get activeIndex() {
        return this.numEntered;
    }

    get numEntered() {
        return this._enteredDigits.length;
    }

    get pinComplete() {
        return this._pinLength === this.numEntered;
    }
}