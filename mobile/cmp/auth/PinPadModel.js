import {HoistModel} from '@xh/hoist/core';
import {observable, action, bindable} from '@xh/hoist/mobx';
import {computed} from 'mobx';

@HoistModel
export class PinPadModel {

    pinLength;
    onPinComplete;

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

    @computed
    get displayedDigits() {
        const {numEntered, pinLength, _enteredDigits} = this;

        let res = Array(pinLength).fill('•');
        if (this.pinComplete()) {
            return res;
        }

        res[numEntered - 1] = _enteredDigits[numEntered - 1];
        for (let i = numEntered; i < pinLength; i++) {
            res[i] = ' ';
        }
        return res;
    }

    @computed
    get numEntered() {
        return this._enteredDigits.length;
    }

    constructor({
        pinLength,
        onPinComplete,
        errorText = ' ',
        headerText = ' ',
        subHeaderText = ' '
    }) {
        this.pinLength = pinLength;
        this.onPinComplete = onPinComplete;
        this.errorText = errorText;
        this.headerText = headerText;
        this.subHeaderText = subHeaderText;

        this._enteredDigits = [];

    }

    @action
    enterDigit(digit) {
        if (this.pinComplete()) return;

        this._enteredDigits.push(digit);

        if (this.pinComplete()) {
            this.onPinComplete(this._enteredDigits.toJS());
        }
    }

    pinComplete() {
        return this.pinLength === this.numEntered;
    }

    @action
    deleteDigit() {
        this._enteredDigits.pop();
    }

    @action
    clear() {
        this._enteredDigits = [];
    }
}