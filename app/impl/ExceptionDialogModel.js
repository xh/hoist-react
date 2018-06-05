/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {observable, setter, computed, action} from '@xh/hoist/mobx';
import {ToastManager} from '@xh/hoist/toast';

/**
 * Local Model to handle Exception Dialog.
 */
@HoistModel()
export class ExceptionDialogModel {

    get exception() {
        const e = XH.displayException;
        return e ? e.exception : null;
    }

    get options() {
        const e = XH.displayException;
        return e ? e.options : {};
    }

    @observable detailsIsOpen = false;
    @setter @observable userMessage = '';

    @action
    sendReport() {
        const svc = XH.errorTrackingService,
            {exception, userMessage, options} = this;

        svc.submitAsync({exception, message: userMessage})
            .then(() => {
                ToastManager.show({message: 'Error Details Submitted'});
            });

        if (!options.requireReload) this.close();
    }

    @action
    openDetails() {
        this.detailsIsOpen = true;
        this.msg = '';
    }

    @action
    close() {
        this.detailsIsOpen = false;
        XH.hideException();
    }
}