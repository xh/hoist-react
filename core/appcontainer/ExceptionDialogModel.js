/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action, setter} from '@xh/hoist/mobx';

/**
 * Manages the default display of exceptions.
 *
 * Currently we allow only a single exception (the latest) to be displayed at a time.
 * Consider modifying to allow stacking, as with Message.
 *
 * @private
 */
@HoistModel()
export class ExceptionDialogModel {

    @observable.ref displayData;
    @observable detailsIsOpen = false;

    /** Exception currently being displayed */
    get exception() {
        const d = this.displayData;
        return d ? d.exception : null;
    }

    /** Options for exception currently being displayed */
    get options() {
        const d = this.displayData;
        return d ? d.options : {};
    }

    /** Optional user supplied message */
    @setter @observable userMessage = '';


    @action
    show(exception, options) {
        this.displayData = {exception, options};
    }

    @action
    close() {
        this.displayData = null;
        this.detailsIsOpen = false;
    }

    @action
    openDetails() {
        this.detailsIsOpen = true;
        this.userMessage = '';
    }
    
    async sendReportAsync() {
        const {exception, userMessage, options} = this;

        await XH.exceptionHandler.logOnServerAsync({
            exception,
            userMessage,
            userAlerted: true
        });

        if (!options.requireReload) this.close();
    }
}
