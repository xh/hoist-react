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

    @computed
    get exception() {
        const {displayException} = XH;
        return displayException ? displayException.exception : null;
    }

    @computed
    get options() {
        const {displayException} = XH;
        return displayException ? displayException.options : {};
    }

    @observable detailsIsOpen = false;
    @setter @observable userMessage = '';

    @action
    sendReport() {
        const svc = XH.errorTrackingService,
            {exception, userMessage, options} = this;
        if (svc.isReady) {
            svc.submitAsync({exception, message: userMessage})
                .then(() => {
                    ToastManager.show({message: 'Error Details Submitted'});
                });
        }

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