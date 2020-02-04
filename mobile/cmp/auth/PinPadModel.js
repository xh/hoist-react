import {HoistModel} from '@xh/hoist/core';
import {observable, action, bindable} from '@xh/hoist/mobx';

@HoistModel
export class PinPadModel {

    pinLength;

    @bindable
    disabled;
    @bindable
    errorText;
    @bindable
    headerText;
    @bindable
    subHeaderText;

    @observable
    _enteredDigits;

    constructor({
        pinLength,
        errorText = ' ',
        headerText = ' ',
        subHeaderText = ' '
    }) {
        this.pinLength = pinLength;
        this.errorText = errorText;
        this.headerText = headerText;
        this.subHeaderText = subHeaderText;

        this._enteredDigits = [];
    }

    @action
    enterDigit(digit) {
        if (this.pinComplete) return;

        this.didDelete = false;

        this._enteredDigits.push(digit);
    }

    @action
    deleteDigit() {
        this.didDelete = true;
        this._enteredDigits.pop();
    }

    @action
    clear() {
        this._enteredDigits.clear();
    }

    get displayedDigits() {
        const {numEntered, pinLength, _enteredDigits} = this;

        let res = Array(pinLength).fill('•');

        if (!this.pinComplete && !this.didDelete) {
            res[numEntered - 1] = _enteredDigits[numEntered - 1];
        }

        for (let i = numEntered; i < pinLength; i++) {
            res[i] = ' ';
        }

        return res;
    }

    completedPin() {
        return this.pinComplete ?
            this._enteredDigits.toJS().join('') :
            null;
    }

    //------------------------------------
    // Implementation
    //------------------------------------

    didDelete = false;

    get activeIndex() {
        return this.numEntered;
    }

    get numEntered() {
        return this._enteredDigits.length;
    }

    get pinComplete() {
        return this.pinLength === this.numEntered;
    }
}