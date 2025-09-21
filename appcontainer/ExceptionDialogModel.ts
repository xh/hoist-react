/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import type {HoistException} from '@xh/hoist/exception';
import {ExceptionHandlerOptions, HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable, bindable} from '@xh/hoist/mobx';

/**
 * Manages the default display of exceptions.
 *
 * Currently, we allow only a single exception (the latest) to be displayed at a time.
 * Consider modifying to allow stacking, as with Message.
 *
 * @internal
 */
export class ExceptionDialogModel extends HoistModel {
    override xhImpl = true;

    @observable.ref
    displayData: {exception: HoistException; options: ExceptionHandlerOptions};

    @observable
    detailsIsOpen = false;

    /** Exception currently being displayed */
    get exception(): HoistException {
        return this.displayData?.exception ?? null;
    }

    /** Options for exception currently being displayed */
    get options(): any {
        return this.displayData?.options ?? {};
    }

    /** Optional user supplied message */
    @bindable
    userMessage: string = '';

    constructor() {
        super();
        makeObservable(this);
    }

    @action
    show(exception: HoistException, options: ExceptionHandlerOptions) {
        if (this.displayData?.options.requireReload) return;
        this.displayData = {exception, options};
    }

    @action
    showDetails(exception: HoistException, options: ExceptionHandlerOptions) {
        this.show(exception, options);
        this.openDetails();
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

        const success = await XH.exceptionHandler.logOnServerAsync({
            exception,
            userMessage,
            userAlerted: true
        });

        if (success) {
            await XH.alert({title: 'Message Sent', message: 'Your error has been reported.'});
            this.userMessage = null;
            if (!options.requireReload) this.close();
        } else {
            const email = XH.configService.get('xhEmailSupport', 'none'),
                message =
                    email && email != 'none'
                        ? `Failed to send message.  Please seek out additional support by contacting: '${email}'.`
                        : `Failed to send message.  Please contact support directly.`;

            await XH.alert({title: 'Error', message});
        }
    }
}
