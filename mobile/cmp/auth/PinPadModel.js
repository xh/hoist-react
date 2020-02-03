import {HoistModel} from '@xh/hoist/core';
import {bindable, action} from '@xh/hoist/mobx';

@HoistModel
export class PinPadModel {
    numDigits;

    @bindable
    enteredDigits;

    @bindable
    displayedDigits;

    @bindable
    numEntered;

    @bindable
    disabled;

    @bindable
    errorText;

    onFinished;

    constructor({numDigits, onFinished, errorText}) {
        this.numDigits = numDigits;
        this.displayedDigits = [];
        this.numEntered = 0;
        for (let i = 0; i < numDigits; i++) {
            this.displayedDigits[i] = '';
        }
        this.enteredDigits = [];
        this.onFinished = onFinished;
    }

    @action
    enterDigit(digit) {
        this.blankDigit(this.numEntered - 1);

        this.enteredDigits[this.numEntered] = digit;
        this.displayedDigits[this.numEntered] = digit;

        this.numEntered++;
        if (this.numEntered === this.numDigits) {
            this.displayedDigits[this.numEntered - 1] = '•';
            this.onFinished();
        }
    }

    @action
    blankDigit(index) {
        if (index < 0) return;
        this.displayedDigits[index] = '•';
    }

    @action
    deleteDigit() {
        this.numEntered--;
        this.displayedDigits[this.numEntered] = '';
    }

    @action
    clear() {
        this.numEntered = 0;
        this.displayedDigits = [];
        for (let i = 0; i < this.numDigits; i++) {
            this.displayedDigits[i] = '';
        }
        this.enteredDigits = [];
    }

    @action
    lock(errorText) {
        this.disabled = true;
        this.errorText = errorText;
    }
}