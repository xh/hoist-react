/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';

/**
 * Manages the default display of exceptions.
 *
 * Currently we allow only a single exception (the latest) to be displayed at a time.
 * Consider modifying to allow stacking, as with Message.
 *
 * @private
 */
export class ExceptionDialogModel extends HoistModel {

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
    @observable userMessage = '';

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    show(exception, options) {
        if (this.displayData?.options.requireReload)  return;
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

    @action
    setUserMessage(userMessage) {
        this.userMessage = userMessage;
    }

    async sendReportAsync() {
        const {exception, userMessage, options} = this;

        const success = await XH.exceptionHandler.logOnServerAsync({
            exception,
            userMessage,
            userAlerted: true
        });

        if (success) {
            await XH.alert({title: 'Message Sent', message: 'Your error has been reported.'});
            this.setUserMessage(null);
            if (!options.requireReload) this.close();
        } else {
            const email = XH.configService.get('xhEmailSupport', 'none'),
                message = email && email != 'none' ?
                    `Failed to send message.  Please seek out additional support by contacting: '${email}'.` :
                    `Failed to send message.  Please contact support directly.`;

            await XH.alert({title: 'Error', message});
        }
    }
}
