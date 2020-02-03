import {HoistModel} from '@xh/hoist/core';
import {observable, action, bindable} from '@xh/hoist/mobx';

@HoistModel
export class PinPadModel {
    numDigits;

    @observable
    enteredDigits;

    @observable
    displayedDigits;

    @observable
    numEntered;

    @bindable
    disabled;

    @bindable
    errorText;

    onFinished;

    @bindable
    headerText;
    @bindable
    subHeaderText;

    constructor({numDigits, onFinished, errorText, headerText}) {
        this.numDigits = numDigits;
        this.displayedDigits = [];
        this.numEntered = 0;
        for (let i = 0; i < numDigits; i++) {
            this.displayedDigits[i] = '';
        }
        this.enteredDigits = [];
        this.onFinished = onFinished;
        this.headerText = headerText;
    }

    @action
    enterDigit(digit) {
        if (this.numEntered === this.numDigits) return;

        this.blankDigit(this.numEntered - 1);

        this.enteredDigits[this.numEntered] = digit;
        this.displayedDigits[this.numEntered] = digit;

        this.numEntered++;
        if (this.numEntered === this.numDigits) {
            this.displayedDigits[this.numEntered - 1] = '•';
            this.onFinished(this.enteredDigits.toJS());
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
}