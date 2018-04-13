/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist/core';
import {observable, setter, computed, action} from 'hoist/mobx';
import {Icon} from 'hoist/icon';
import {ToastManager} from 'hoist/cmp';
import {SECONDS} from 'hoist/utils/DateTimeUtils';

/**
 * Local Model to handle Exception Dialog.
 */
export class ExceptionDialogModel {

    @computed
    get exception() {
        const {displayException} =  XH.hoistModel;
        return displayException ? displayException.exception : null;
    }

    @computed
    get options() {
        const {displayException} =  XH.hoistModel;
        return displayException ? displayException.options : {};
    }

    @observable detailsIsOpen = false;
    @setter @observable userMessage = '';

    @action
    sendReport() {
        const svc = XH.errorTrackingService,
            {exception, userMessage, options} = this;
        if (svc.isReady) {
            svc.submitAsync({exception, msg: userMessage})
                .then(() => {
                    ToastManager.getToaster().show({
                        intent: 'success',
                        message: 'Error Details Submitted',
                        icon: Icon.check({style: {alignSelf: 'center', marginLeft: '5px'}}),
                        timeout: 3 * SECONDS
                    });
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
        XH.hoistModel.hideException();
    }
}